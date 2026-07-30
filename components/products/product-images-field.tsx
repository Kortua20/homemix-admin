"use client";

import { useEffect, useRef, useState } from "react";
import { ImagePlus, Trash2 } from "lucide-react";

import type { ProductImage } from "@/components/products/types";
import { Label } from "@/components/ui/label";
import {
  MAX_PRODUCT_IMAGES,
  MAX_PRODUCT_IMAGE_SIZE,
  PRODUCT_IMAGE_ACCEPT,
  PRODUCT_IMAGE_TYPES,
} from "@/lib/product-image-constraints";
import { getProductImageUrl } from "@/lib/product-data";

type ProductImagesFieldProps = {
  existingImages?: ProductImage[];
  serverError?: string;
};

type SelectedImage = {
  file: File;
  previewUrl: string;
};

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
  serverError,
}: ProductImagesFieldProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const previewUrlsRef = useRef(new Set<string>());
  const [newImages, setNewImages] = useState<SelectedImage[]>([]);
  const [deletedImageIds, setDeletedImageIds] = useState<string[]>([]);
  const [localError, setLocalError] = useState("");

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

  function handleFilesSelected(
    event: React.ChangeEvent<HTMLInputElement>,
  ) {
    const selectedFiles = Array.from(event.target.files ?? []);
    const filesToAdd = selectedFiles.filter(
      (file) =>
        !newImages.some(
          (existingImage) =>
            existingImage.file.name === file.name &&
            existingImage.file.size === file.size &&
            existingImage.file.lastModified === file.lastModified,
        ),
    );
    const mergedFiles = [
      ...newImages.map((image) => image.file),
      ...filesToAdd,
    ];

    const visibleExistingCount =
      existingImages.length - deletedImageIds.length;

    if (visibleExistingCount + mergedFiles.length > MAX_PRODUCT_IMAGES) {
      setLocalError(
        `პროდუქტს შეიძლება ჰქონდეს მაქსიმუმ ${MAX_PRODUCT_IMAGES} ფოტო.`,
      );
      syncInputFiles(newImages.map((image) => image.file));
      return;
    }

    if (
      mergedFiles.some(
        (file) =>
          !PRODUCT_IMAGE_TYPES.some((type) => type === file.type),
      )
    ) {
      setLocalError("დაშვებულია მხოლოდ JPG, PNG და WebP ფორმატები.");
      syncInputFiles(newImages.map((image) => image.file));
      return;
    }

    if (
      mergedFiles.some((file) => file.size > MAX_PRODUCT_IMAGE_SIZE)
    ) {
      setLocalError("თითოეული ფოტო არ უნდა აღემატებოდეს 5 მბ-ს.");
      syncInputFiles(newImages.map((image) => image.file));
      return;
    }

    const addedImages = filesToAdd.map((file) => {
      const previewUrl = URL.createObjectURL(file);
      previewUrlsRef.current.add(previewUrl);
      return { file, previewUrl };
    });
    const mergedImages = [...newImages, ...addedImages];

    setLocalError("");
    setNewImages(mergedImages);
    syncInputFiles(mergedFiles);
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
        className="flex min-h-32 cursor-pointer flex-col items-center justify-center rounded-2xl border border-dashed border-[#c9b2a4] bg-[#fcf9f8] px-5 py-6 text-center transition-colors hover:border-[#7f512f] hover:bg-[#f9f3ef]"
      >
        <ImagePlus aria-hidden="true" className="size-7 text-[#7f512f]" />
        <span className="mt-2 text-sm font-semibold text-[#1b1c1c]">
          ფოტოების არჩევა
        </span>
        <span className="mt-1 text-xs leading-5 text-[#605e5b]">
          JPG, PNG ან WebP · მაქსიმუმ 5 მბ თითოეულზე
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
