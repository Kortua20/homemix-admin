export const MAX_PRODUCT_IMAGES = 8;
export const MAX_PRODUCT_IMAGE_SIZE = 5 * 1024 * 1024;
export const PRODUCT_IMAGE_ACCEPT =
  "image/jpeg,image/png,image/webp";
export const PRODUCT_IMAGE_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
] as const;

export function isAllowedProductImage(file: File) {
  return PRODUCT_IMAGE_TYPES.some((type) => type === file.type);
}
