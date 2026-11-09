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

// AI analysis (app/product/ai-actions.ts) gets its own, smaller copies of the photos. Six
// angles is enough to judge colour and material, and 1024px keeps each image around
// 1,000–1,250 input tokens and ~150KB on the wire. The browser downscales to these; the
// server re-checks them, since the action is reachable without going through the UI.
export const MAX_AI_ANALYSIS_IMAGES = 6;
export const AI_ANALYSIS_IMAGE_DIMENSION = 1024;
export const MAX_AI_ANALYSIS_IMAGE_SIZE = 1024 * 1024;

export function isAllowedProductImage(file: File) {
  return PRODUCT_IMAGE_TYPES.some((type) => type === file.type);
}
