export const MAX_PRODUCT_IMAGES = 8;
export const MAX_PRODUCT_IMAGE_SIZE = 5 * 1024 * 1024;
export const MAX_PRODUCT_IMAGE_SOURCE_SIZE = 20 * 1024 * 1024;
export const MAX_PRODUCT_IMAGE_UPLOAD_TOTAL = Math.floor(3.5 * 1024 * 1024);
export const PRODUCT_IMAGE_ACCEPT =
  "image/jpeg,image/png,image/webp,image/heic,image/heif";
export const PRODUCT_IMAGE_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
] as const;
export const PRODUCT_IMAGE_SOURCE_TYPES = [
  ...PRODUCT_IMAGE_TYPES,
  "image/heic",
  "image/heif",
] as const;

export function isAllowedProductImage(file: File) {
  return PRODUCT_IMAGE_TYPES.some((type) => type === file.type);
}
