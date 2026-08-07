export type Category = {
  id: string;
  name: string;
  slug: string;
  description: string;
  images: CategoryImage[];
};

export type CategoryImage = {
  id: string;
  originalName: string;
  contentType: string;
  sizeBytes: number;
  sortOrder: number;
  createdAt: string;
};
