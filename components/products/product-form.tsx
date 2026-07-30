"use client";

import { useActionState, useState } from "react";
import { LoaderCircle } from "lucide-react";
import Link from "next/link";

import {
  createProduct,
  updateProduct,
  type ProductActionState,
} from "@/app/product/actions";
import { ProductImagesField } from "@/components/products/product-images-field";
import type { Product, ProductCategory } from "@/components/products/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createSlug } from "@/lib/slug";

const initialProductActionState: ProductActionState = {
  status: "idle",
  message: "",
};

type ProductFormProps = {
  mode: "create" | "edit";
  categories: ProductCategory[];
  product?: Product;
};

export function ProductForm({ mode, categories, product }: ProductFormProps) {
  const action = mode === "create" ? createProduct : updateProduct;
  const [state, formAction, pending] = useActionState(
    action,
    initialProductActionState,
  );
  const [name, setName] = useState(product?.name ?? "");
  const [slug, setSlug] = useState(product?.slug ?? "");
  const [slugEdited, setSlugEdited] = useState(false);
  const cancelHref =
    mode === "edit" && product ? `/product/${product.slug}` : "/dashboard";

  function handleNameChange(event: React.ChangeEvent<HTMLInputElement>) {
    const nextName = event.target.value;
    setName(nextName);

    if (!slugEdited) {
      setSlug(createSlug(nextName));
    }
  }

  function handleSlugChange(event: React.ChangeEvent<HTMLInputElement>) {
    setSlugEdited(true);
    setSlug(createSlug(event.target.value));
  }

  return (
    <form
      action={formAction}
      className="mt-7 rounded-3xl bg-white p-5 shadow-[0_16px_30px_rgba(0,0,0,0.04)] lg:p-8"
    >
      {product && (
        <>
          <input type="hidden" name="id" value={product.id} />
          <input type="hidden" name="previousSlug" value={product.slug} />
        </>
      )}

      <div className="grid gap-5 lg:grid-cols-2">
        <div className="grid gap-2 lg:col-span-2">
          <Label htmlFor="product-name">პროდუქტის დასახელება</Label>
          <Input
            id="product-name"
            name="name"
            value={name}
            onChange={handleNameChange}
            placeholder="მაგალითად: მუხის სასადილო მაგიდა"
            required
            minLength={2}
            maxLength={160}
            autoFocus
            aria-invalid={Boolean(state.fieldErrors?.name)}
            aria-describedby={
              state.fieldErrors?.name ? "product-name-error" : undefined
            }
            className="h-12 border-[#d6c3b8] bg-white"
          />
          {state.fieldErrors?.name && (
            <p
              id="product-name-error"
              className="text-xs font-medium text-[#c62828]"
            >
              {state.fieldErrors.name}
            </p>
          )}
        </div>

        <div className="grid gap-2 lg:col-span-2">
          <Label htmlFor="product-slug">სლაგი</Label>
          <Input
            id="product-slug"
            name="slug"
            value={slug}
            onChange={handleSlugChange}
            placeholder="მუხის-სასადილო-მაგიდა"
            required
            minLength={2}
            maxLength={160}
            pattern="[ა-ჰa-z0-9]+(?:-[ა-ჰa-z0-9]+)*"
            aria-invalid={Boolean(state.fieldErrors?.slug)}
            aria-describedby={
              state.fieldErrors?.slug
                ? "product-slug-error"
                : "product-slug-help"
            }
            className="h-12 border-[#d6c3b8] bg-white"
          />
          {state.fieldErrors?.slug ? (
            <p
              id="product-slug-error"
              className="text-xs font-medium text-[#c62828]"
            >
              {state.fieldErrors.slug}
            </p>
          ) : (
            <p
              id="product-slug-help"
              className="text-xs leading-5 text-[#605e5b]"
            >
              დასახელებიდან ავტომატურად შეიქმნება და შეგიძლიათ შეცვალოთ.
            </p>
          )}
        </div>

        <div className="grid gap-2">
          <Label htmlFor="product-category">კატეგორია</Label>
          <select
            id="product-category"
            name="categoryId"
            defaultValue={product?.categoryId ?? ""}
            required
            aria-invalid={Boolean(state.fieldErrors?.categoryId)}
            aria-describedby={
              state.fieldErrors?.categoryId
                ? "product-category-error"
                : undefined
            }
            className="h-12 w-full rounded-lg border border-[#d6c3b8] bg-white px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-[#7f512f]/30"
          >
            <option value="" disabled>
              აირჩიეთ კატეგორია
            </option>
            {categories.map((category) => (
              <option key={category.id} value={category.id}>
                {category.name}
              </option>
            ))}
          </select>
          {state.fieldErrors?.categoryId && (
            <p
              id="product-category-error"
              className="text-xs font-medium text-[#c62828]"
            >
              {state.fieldErrors.categoryId}
            </p>
          )}
        </div>

        <div className="grid gap-2">
          <Label htmlFor="product-price">ფასი</Label>
          <div className="relative">
            <Input
              id="product-price"
              name="price"
              type="number"
              min="0"
              max="9999999999.99"
              step="0.01"
              defaultValue={product?.price}
              placeholder="0.00"
              required
              aria-invalid={Boolean(state.fieldErrors?.price)}
              aria-describedby={
                state.fieldErrors?.price ? "product-price-error" : undefined
              }
              className="h-12 border-[#d6c3b8] bg-white pr-10"
            />
            <span className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 font-semibold text-[#605e5b]">
              ₾
            </span>
          </div>
          {state.fieldErrors?.price && (
            <p
              id="product-price-error"
              className="text-xs font-medium text-[#c62828]"
            >
              {state.fieldErrors.price}
            </p>
          )}
        </div>

        <div className="grid gap-2 lg:col-span-2">
          <Label htmlFor="product-description">აღწერა</Label>
          <textarea
            id="product-description"
            name="description"
            defaultValue={product?.description}
            placeholder="მოკლედ აღწერეთ პროდუქტი..."
            rows={8}
            maxLength={5000}
            aria-invalid={Boolean(state.fieldErrors?.description)}
            aria-describedby={
              state.fieldErrors?.description
                ? "product-description-error"
                : "product-description-help"
            }
            className="w-full resize-y rounded-lg border border-[#d6c3b8] bg-white px-3 py-3 text-sm leading-6 outline-none placeholder:text-[#83746b] focus-visible:ring-2 focus-visible:ring-[#7f512f]/30"
          />
          {state.fieldErrors?.description ? (
            <p
              id="product-description-error"
              className="text-xs font-medium text-[#c62828]"
            >
              {state.fieldErrors.description}
            </p>
          ) : (
            <p
              id="product-description-help"
              className="text-xs leading-5 text-[#605e5b]"
            >
              აღწერა სურვილისამებრ შეგიძლიათ დატოვოთ ცარიელი.
            </p>
          )}
        </div>

        <ProductImagesField
          existingImages={product?.images}
          serverError={state.fieldErrors?.images}
        />
      </div>

      {categories.length === 0 && (
        <p className="mt-5 rounded-xl bg-[#fff3cd] px-4 py-3 text-sm font-medium text-[#705500]">
          პროდუქტის შესაქმნელად ჯერ დაამატეთ მინიმუმ ერთი კატეგორია.
        </p>
      )}

      {state.status === "error" && state.message && (
        <p
          role="alert"
          className="mt-5 rounded-xl bg-[#ffdad6] px-4 py-3 text-sm font-medium text-[#93000a]"
        >
          {state.message}
        </p>
      )}

      <div className="mt-8 flex flex-col-reverse gap-3 border-t border-[#e4e2e1] pt-5 sm:flex-row sm:justify-end">
        <Link
          href={cancelHref}
          className="inline-flex h-11.5 items-center justify-center rounded-lg border border-[#d6c3b8] px-5 text-sm font-semibold text-[#605e5b]"
        >
          გაუქმება
        </Link>
        <Button
          type="submit"
          disabled={pending || categories.length === 0}
          className="min-w-40"
        >
          {pending && (
            <LoaderCircle
              aria-hidden="true"
              className="mr-2 size-4 animate-spin"
            />
          )}
          {mode === "create" ? "პროდუქტის შექმნა" : "ცვლილებების შენახვა"}
        </Button>
      </div>
    </form>
  );
}
