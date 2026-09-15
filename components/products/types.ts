export type ProductCategory = {
  id: string;
  name: string;
  slug: string;
};

// Mirrors the CHECK constraints in supabase/schemas/03_products.sql. Keep in sync: the
// database is the authority, these types only describe it.
export type ProductStatus =
  | "draft"
  | "available"
  | "reserved"
  | "sold"
  | "archived";

export type ListingKind = "used_unique" | "new_stocked";

export type ConditionGrade = {
  code: string;
  sortOrder: number;
  labelKa: string;
  labelEn: string;
  descriptionKa: string;
};

// The fixed aspect vocabulary (structure, surface, upholstery, hardware, odour).
export type ConditionAspect = {
  code: string;
  sortOrder: number;
  labelKa: string;
  labelEn: string;
  descriptionKa: string;
};

// One product's rating for one aspect. Absent entirely when the aspect does not apply —
// a table has no upholstery — which is why this is a row per aspect rather than a column.
export type ProductConditionAspect = {
  aspectCode: string;
  gradeCode: string;
  note: string | null;
};

// `imageId` is nullable by design: an odour or a slight wobble has no meaningful photo.
export type ProductFlaw = {
  id: string;
  imageId: string | null;
  flawType: string;
  severity: string;
  locationKa: string | null;
  noteKa: string;
  sortOrder: number;
};

export type ProductImage = {
  id: string;
  originalName: string;
  contentType: string;
  sizeBytes: number;
  sortOrder: number;
  createdAt: string;
};

export type Product = {
  id: string;
  slug: string;
  name: string;
  description: string;
  price: number;
  categoryId: string;
  category: ProductCategory;
  images: ProductImage[];
  status: ProductStatus;
  listingKind: ListingKind;
  // Non-null exactly when listingKind is "used_unique"; the database enforces this.
  conditionGrade: ConditionGrade | null;
  conditionSummary: string;
  // Non-null exactly when listingKind is "new_stocked".
  stockQuantity: number | null;
  conditionAspects: ProductConditionAspect[];
  flaws: ProductFlaw[];
  // Dimensions apply to both listing kinds — a new chair has a seat height too. Null means
  // "not measured", which is distinct from zero.
  dimensions: ProductDimensions;
  createdAt: string;
  updatedAt: string;
};

export type ProductDimensions = {
  widthCm: number | null;
  depthCm: number | null;
  heightCm: number | null;
  seatHeightCm: number | null;
  weightKg: number | null;
  note: string | null;
};
