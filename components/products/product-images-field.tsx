"use client";

import { useEffect, useRef, useState } from "react";
import { ImagePlus, Trash2 } from "lucide-react";

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

type ProductImagesFieldProps = {
  existingImages?: ProductImage[];
  onProcessingChange?: (processing: boolean) => void;
  serverError?: string;
};

type SelectedImage = {
  file: File;
  previewUrl: string;
  sourceKey: string;
};

function getFileKey(file: File) {
  return `${file.name}-${file.size}-${file.lastModified}`;
}

function NewImagePreview({
  image,
  onRemove,
}: {
  image: SelectedImage;
  onRemove: () => void;
}) {
  return (
    <div className="group relative aspect-square overflow-hidden rounded-2xl bg-[#f0eded]">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={image.previewUrl}
        alt={image.file.name}
        className="size-full object-cover"
      />
      <span className="absolute bottom-2 left-2 rounded-full bg-[#1b1c1c]/75 px-2 py-1 text-[10px] font-semibold text-white">
        ახალი
      </span>
      <button
        type="button"
        onClick={onRemove}
        aria-label={`${image.file.name} — ამოღება`}
        className="absolute right-2 top-2 flex size-9 items-center justify-center rounded-full bg-white/95 text-[#c62828] shadow-md"
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
  serverError,
}: ProductImagesFieldProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const previewUrlsRef = useRef(new Set<string>());
  const [newImages, setNewImages] = useState<SelectedImage[]>([]);
  const [deletedImageIds, setDeletedImageIds] = useState<string[]>([]);
  const [localError, setLocalError] = useState("");
  const [processing, setProcessing] = useState(false);

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
        return { file, previewUrl, sourceKey };
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

  return (
    <div className="grid gap-3 lg:col-span-2">
      <div className="flex items-center justify-between gap-4">
        <Label htmlFor="product-images">ფოტოები</Label>
        <span className="text-xs font-medium text-[#83746b]">
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

      {(visibleExistingImages.length > 0 || newImages.length > 0) && (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {visibleExistingImages.map((image) => (
            <div
              key={image.id}
              className="group relative aspect-square overflow-hidden rounded-2xl bg-[#f0eded]"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={getProductImageUrl(image.id)}
                alt={image.originalName}
                className="size-full object-cover"
              />
              <button
                type="button"
                onClick={() => removeExistingImage(image.id)}
                aria-label={`${image.originalName} — წაშლა`}
                className="absolute right-2 top-2 flex size-9 items-center justify-center rounded-full bg-white/95 text-[#c62828] shadow-md"
              >
                <Trash2 aria-hidden="true" className="size-4" />
              </button>
            </div>
          ))}

          {newImages.map((image, index) => (
            <NewImagePreview
              key={`${image.file.name}-${image.file.size}-${image.file.lastModified}`}
              image={image}
              onRemove={() => removeNewFile(index)}
            />
          ))}
        </div>
      )}

      <label
        htmlFor="product-images"
        aria-disabled={processing}
        className="flex min-h-32 cursor-pointer flex-col items-center justify-center rounded-2xl border border-dashed border-[#c9b2a4] bg-[#fcf9f8] px-5 py-6 text-center transition-colors hover:border-[#7f512f] hover:bg-[#f9f3ef] aria-disabled:cursor-wait aria-disabled:opacity-60"
      >
        <ImagePlus aria-hidden="true" className="size-7 text-[#7f512f]" />
        <span className="mt-2 text-sm font-semibold text-[#1b1c1c]">
          ფოტოების არჩევა
        </span>
        <span className="mt-1 text-xs leading-5 text-[#605e5b]">
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
        <p className="text-xs leading-5 text-[#605e5b]">
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
        <p className="text-xs font-medium text-[#7f512f]" aria-live="polite">
          ფოტოების ოპტიმიზაცია მიმდინარეობს...
        </p>
      )}

      {error && (
        <p
          id="product-images-error"
          className="text-xs font-medium text-[#c62828]"
        >
          {error}
        </p>
      )}
    </div>
  );
}
