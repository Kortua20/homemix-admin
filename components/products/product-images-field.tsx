"use client";

import { useEffect, useRef, useState } from "react";
import { ImagePlus, Star, Trash2 } from "lucide-react";

import type { AnchorablePhoto } from "@/components/products/product-condition-fields";
import type { ProductImage } from "@/components/products/types";
import { Label } from "@/components/ui/label";
import {
  MAX_PRODUCT_IMAGES,
  MAX_PRODUCT_IMAGE_SIZE,
  MAX_PRODUCT_IMAGE_SOURCE_SIZE,
  MAX_PRODUCT_IMAGE_UPLOAD_TOTAL,
  PRODUCT_IMAGE_ACCEPT,
  PRODUCT_IMAGE_SOURCE_TYPES,
} from "@/lib/product-image-constraints";
import { getProductImageUrl } from "@/lib/product-data";
import { optimizeProductImage } from "@/lib/product-image-optimization";
import { cn } from "@/lib/utils";

type ProductImagesFieldProps = {
  existingImages?: ProductImage[];
  onProcessingChange?: (processing: boolean) => void;
  // Reports the photos a flaw can currently be anchored to: existing photos still visible
  // plus newly selected ones, which already carry the id minted for them here. Follows the
  // same shape as onProcessingChange rather than lifting this field's state into the form,
  // which would mean making the upload/optimisation path controlled.
  onPhotosChange?: (photos: AnchorablePhoto[]) => void;
  serverError?: string;
};

type SelectedImage = {
  file: File;
  previewUrl: string;
  sourceKey: string;
  // Minted here, not by the database, so a flaw captured in the same submit can reference
  // this photo before it exists server-side. See SCHEMA_ROADMAP.md step 2.
  id: string;
};

function getFileKey(file: File) {
  return `${file.name}-${file.size}-${file.lastModified}`;
}

// One thumbnail, used for both saved and newly-selected photos. They differ only by the
// "ახალი" marker, and keeping two near-identical components was how the lead control would
// have ended up on one of them and not the other.
function ImageThumb({
  previewUrl,
  alt,
  label,
  isNew = false,
  isLead,
  onMakeLead,
  onRemove,
}: {
  previewUrl: string;
  alt: string;
  label: string;
  isNew?: boolean;
  isLead: boolean;
  onMakeLead: () => void;
  onRemove: () => void;
}) {
  return (
    <div
      className={cn(
        "group relative aspect-square overflow-hidden rounded-2xl bg-image-placeholder",
        // A ring rather than a border: a border would resize the thumbnail and make the
        // grid shift every time the lead changes.
        isLead && "ring-2 ring-walnut ring-offset-2",
      )}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={previewUrl}
        alt={alt}
        loading="lazy"
        decoding="async"
        className="size-full object-cover"
      />

      {isNew ? (
        <span className="absolute left-2 top-2 rounded-full bg-ink/75 px-2 py-1 text-[10px] font-semibold text-white">
          ახალი
        </span>
      ) : null}

      {isLead ? (
        <span className="absolute bottom-2 left-2 inline-flex items-center gap-1 rounded-full bg-walnut px-2 py-1 text-[10px] font-semibold text-white">
          <Star aria-hidden="true" className="size-3 fill-current" />
          მთავარი
        </span>
      ) : (
        // Only offered on photos that are not already leading, so the control always does
        // something when it is visible.
        <button
          type="button"
          onClick={onMakeLead}
          className="absolute bottom-2 left-2 inline-flex items-center gap-1 rounded-full bg-white/95 px-2 py-1 text-[10px] font-semibold text-quiet-ink shadow-md transition-colors hover:bg-white hover:text-walnut focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-walnut"
        >
          <Star aria-hidden="true" className="size-3" />
          მთავარად
          <span className="sr-only"> — {label}</span>
        </button>
      )}

      <button
        type="button"
        onClick={onRemove}
        aria-label={`${label} — ${isNew ? "ამოღება" : "წაშლა"}`}
        className="absolute right-2 top-2 flex size-9 items-center justify-center rounded-full bg-white/95 text-destructive shadow-md transition-colors hover:bg-destructive-surface focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-destructive"
      >
        <Trash2 aria-hidden="true" className="size-4" />
      </button>
    </div>
  );
}

function formatFileSize(size: number) {
  return new Intl.NumberFormat("ka-GE", {
    maximumFractionDigits: 1,
  }).format(size / 1024 / 1024);
}

export function ProductImagesField({
  existingImages = [],
  onProcessingChange,
  onPhotosChange,
  serverError,
}: ProductImagesFieldProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const previewUrlsRef = useRef(new Set<string>());
  const [newImages, setNewImages] = useState<SelectedImage[]>([]);
  const [deletedImageIds, setDeletedImageIds] = useState<string[]>([]);
  const [localError, setLocalError] = useState("");
  const [processing, setProcessing] = useState(false);
  // Which photo leads. Empty means "whatever is already first", so an untouched form submits
  // no leadImageId and the server leaves the existing order alone.
  const [leadImageId, setLeadImageId] = useState("");

  useEffect(() => {
    const previewUrls = previewUrlsRef.current;

    return () => {
      previewUrls.forEach(URL.revokeObjectURL);
      previewUrls.clear();
    };
  }, []);

  function syncInputFiles(files: File[]) {
    if (!inputRef.current) {
      return;
    }

    const transfer = new DataTransfer();
    files.forEach((file) => transfer.items.add(file));
    inputRef.current.files = transfer.files;
  }

  async function handleFilesSelected(
    event: React.ChangeEvent<HTMLInputElement>,
  ) {
    const selectedFiles = Array.from(event.target.files ?? []);
    const existingSourceKeys = new Set(
      newImages.map((image) => image.sourceKey),
    );
    const filesToAdd = selectedFiles.filter((file) => {
      const sourceKey = getFileKey(file);

      if (existingSourceKeys.has(sourceKey)) {
        return false;
      }

      existingSourceKeys.add(sourceKey);
      return true;
    });

    const visibleExistingCount =
      existingImages.length - deletedImageIds.length;

    if (
      visibleExistingCount + newImages.length + filesToAdd.length >
      MAX_PRODUCT_IMAGES
    ) {
      setLocalError(
        `პროდუქტს შეიძლება ჰქონდეს მაქსიმუმ ${MAX_PRODUCT_IMAGES} ფოტო.`,
      );
      syncInputFiles(newImages.map((image) => image.file));
      return;
    }

    if (
      filesToAdd.some(
        (file) =>
          !PRODUCT_IMAGE_SOURCE_TYPES.some((type) => type === file.type),
      )
    ) {
      setLocalError("დაშვებულია მხოლოდ JPG, PNG, WebP, HEIC და HEIF ფორმატები.");
      syncInputFiles(newImages.map((image) => image.file));
      return;
    }

    if (
      filesToAdd.some((file) => file.size > MAX_PRODUCT_IMAGE_SOURCE_SIZE)
    ) {
      setLocalError("თითოეული საწყისი ფოტო არ უნდა აღემატებოდეს 20 მბ-ს.");
      syncInputFiles(newImages.map((image) => image.file));
      return;
    }

    setProcessing(true);
    onProcessingChange?.(true);
    setLocalError("");

    try {
      const optimizedFiles: Array<{ file: File; sourceKey: string }> = [];

      for (const file of filesToAdd) {
        const optimizedFile = await optimizeProductImage(file);

        if (optimizedFile.size > MAX_PRODUCT_IMAGE_SIZE) {
          throw new Error("IMAGE_TOO_LARGE_AFTER_OPTIMIZATION");
        }

        optimizedFiles.push({
          file: optimizedFile,
          sourceKey: getFileKey(file),
        });
      }

      const mergedFiles = [
        ...newImages.map((image) => image.file),
        ...optimizedFiles.map((image) => image.file),
      ];
      const totalUploadSize = mergedFiles.reduce(
        (total, file) => total + file.size,
        0,
      );

      if (totalUploadSize > MAX_PRODUCT_IMAGE_UPLOAD_TOTAL) {
        setLocalError(
          "ფოტოების საერთო ზომა ჯერ კიდევ ძალიან დიდია. გთხოვთ, ამოიღოთ ერთი ან რამდენიმე ფოტო.",
        );
        syncInputFiles(newImages.map((image) => image.file));
        return;
      }

      const addedImages = optimizedFiles.map(({ file, sourceKey }) => {
        const previewUrl = URL.createObjectURL(file);
        previewUrlsRef.current.add(previewUrl);
        return { file, previewUrl, sourceKey, id: crypto.randomUUID() };
      });
      const mergedImages = [...newImages, ...addedImages];

      setNewImages(mergedImages);
      syncInputFiles(mergedFiles);
    } catch {
      setLocalError(
        "ფოტოების დამუშავება ვერ მოხერხდა. სცადეთ სხვა ფოტო ან ფორმატი.",
      );
      syncInputFiles(newImages.map((image) => image.file));
    } finally {
      setProcessing(false);
      onProcessingChange?.(false);
    }
  }

  function removeNewFile(index: number) {
    const imageToRemove = newImages[index];

    if (imageToRemove) {
      URL.revokeObjectURL(imageToRemove.previewUrl);
      previewUrlsRef.current.delete(imageToRemove.previewUrl);
    }

    const nextImages = newImages.filter(
      (_image, imageIndex) => imageIndex !== index,
    );
    setNewImages(nextImages);
    syncInputFiles(nextImages.map((image) => image.file));
    setLocalError("");
  }

  function removeExistingImage(imageId: string) {
    setDeletedImageIds((currentIds) => [...currentIds, imageId]);
    setLocalError("");
  }

  const visibleExistingImages = existingImages.filter(
    (image) => !deletedImageIds.includes(image.id),
  );
  const totalVisibleImages =
    visibleExistingImages.length + newImages.length;
  const error = localError || serverError;

  // What the badge marks. Falls back to the first surviving photo, because that is what the
  // storefront actually shows when no explicit choice has been made — leaving the badge off
  // until someone clicks would hide which photo is currently the shop window.
  //
  // Also recovers when the chosen photo is removed in the same session: the id no longer
  // matches anything, so the marker returns to whatever is now first.
  const orderedIds = [
    ...visibleExistingImages.map((image) => image.id),
    ...newImages.map((image) => image.id),
  ];
  const effectiveLeadId = orderedIds.includes(leadImageId)
    ? leadImageId
    : (orderedIds[0] ?? "");

  // Derived, not stored: the anchorable list is a pure function of the two pieces of state
  // above, so recomputing it avoids a second source of truth that could drift.
  const anchorablePhotos: AnchorablePhoto[] = [
    ...visibleExistingImages.map((image, index) => ({
      id: image.id,
      label: `ფოტო ${index + 1} — ${image.originalName}`,
      // Saved photos stream from the API route; new ones below use their object URL. Both
      // carry a previewUrl so the flaw picker shows a thumbnail either way — on an edit the
      // existing photos are usually the ones a flaw needs to point at.
      previewUrl: getProductImageUrl(image.id),
    })),
    ...newImages.map((image, index) => ({
      id: image.id,
      label: `ახალი ფოტო ${index + 1} — ${image.file.name}`,
      previewUrl: image.previewUrl,
    })),
  ];
  // Serialised so the effect compares by value; the array identity changes every render.
  const anchorableKey = anchorablePhotos
    .map((photo) => `${photo.id}:${photo.label}`)
    .join("|");

  useEffect(() => {
    onPhotosChange?.(anchorablePhotos);
    // anchorableKey stands in for anchorablePhotos by value. Including the array itself
    // would re-fire on every render; including onPhotosChange would require every caller
    // to memoise it.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [anchorableKey]);

  return (
    <div className="grid gap-3 lg:col-span-2">
      <div className="flex items-center justify-between gap-4">
        <Label htmlFor="product-images">ფოტოები</Label>
        <span className="text-xs font-medium text-soft-brown">
          {totalVisibleImages}/{MAX_PRODUCT_IMAGES}
        </span>
      </div>

      {deletedImageIds.map((imageId) => (
        <input
          key={imageId}
          type="hidden"
          name="deleteImageIds"
          value={imageId}
        />
      ))}

      {/* One id per selected file, in the same order. The server pairs them by index
          before filtering empties, so this order is load-bearing: it is what makes a
          flaw point at the right photo. */}
      {newImages.map((image) => (
        <input
          key={image.id}
          type="hidden"
          name="imageIds"
          value={image.id}
        />
      ))}

      {/* The lead choice reaches the server as one field. Absent when untouched, so an edit
          that does not change the lead leaves the stored order alone. */}
      {leadImageId ? (
        <input type="hidden" name="leadImageId" value={leadImageId} />
      ) : null}

      {(visibleExistingImages.length > 0 || newImages.length > 0) && (
        <>
          <p className="text-xs text-soft-brown">
            პირველი ფოტო ჩანს კატალოგში. აირჩიეთ სხვა „მთავარად“ ღილაკით.
          </p>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            {visibleExistingImages.map((image) => (
              <ImageThumb
                key={image.id}
                previewUrl={getProductImageUrl(image.id)}
                alt={image.originalName}
                label={image.originalName}
                isLead={effectiveLeadId === image.id}
                onMakeLead={() => setLeadImageId(image.id)}
                onRemove={() => removeExistingImage(image.id)}
              />
            ))}

            {newImages.map((image, index) => (
              <ImageThumb
                key={`${image.file.name}-${image.file.size}-${image.file.lastModified}`}
                previewUrl={image.previewUrl}
                alt={image.file.name}
                label={image.file.name}
                isNew
                isLead={effectiveLeadId === image.id}
                onMakeLead={() => setLeadImageId(image.id)}
                onRemove={() => removeNewFile(index)}
              />
            ))}
          </div>
        </>
      )}

      <label
        htmlFor="product-images"
        aria-disabled={processing}
        className="flex min-h-32 cursor-pointer flex-col items-center justify-center rounded-2xl border border-dashed border-[#c9b2a4] bg-warm-canvas px-5 py-6 text-center transition-colors hover:border-walnut hover:bg-[#f9f3ef] aria-disabled:cursor-wait aria-disabled:opacity-60"
      >
        <ImagePlus aria-hidden="true" className="size-7 text-walnut" />
        <span className="mt-2 text-sm font-semibold text-ink">
          ფოტოების არჩევა
        </span>
        <span className="mt-1 text-xs leading-5 text-quiet-ink">
          JPG, PNG, WebP ან iPhone ფოტო · დიდი ფოტოები ავტომატურად შემცირდება
        </span>
      </label>
      <input
        ref={inputRef}
        id="product-images"
        name="images"
        type="file"
        accept={PRODUCT_IMAGE_ACCEPT}
        multiple
        onChange={handleFilesSelected}
        disabled={processing}
        className="sr-only"
        aria-invalid={Boolean(error)}
        aria-describedby={error ? "product-images-error" : undefined}
      />

      {newImages.length > 0 && (
        <p className="text-xs leading-5 text-quiet-ink">
          არჩეულია {newImages.length} ახალი ფოტო (
          {formatFileSize(
            newImages.reduce(
              (total, image) => total + image.file.size,
              0,
            ),
          )}{" "}
          მბ).
        </p>
      )}

      {processing && (
        <p className="text-xs font-medium text-walnut" aria-live="polite">
          ფოტოების ოპტიმიზაცია მიმდინარეობს...
        </p>
      )}

      {error && (
        <p
          id="product-images-error"
          className="text-xs font-medium text-destructive"
        >
          {error}
        </p>
      )}
    </div>
  );
}
