export const MAX_CATEGORY_IMAGE_SIZE = 5 * 1024 * 1024;
export const CATEGORY_IMAGE_ACCEPT = "image/jpeg,image/png,image/webp";
export const CATEGORY_IMAGE_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
] as const;

export function isAllowedCategoryImage(file: File) {
  return CATEGORY_IMAGE_TYPES.some((type) => type === file.type);
}
