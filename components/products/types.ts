export type ProductCategory = {
  id: string;
  name: string;
  slug: string;
};

export type Product = {
  id: string;
  slug: string;
  name: string;
  description: string;
  price: number;
  categoryId: string;
  category: ProductCategory;
  createdAt: string;
  updatedAt: string;
};
