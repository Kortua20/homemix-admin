"use client";

import { useActionState, useState } from "react";
import { LoaderCircle } from "lucide-react";
import Link from "next/link";

import {
  createProduct,
  updateProduct,
  type ProductActionState,
} from "@/app/product/actions";
import {
  ProductConditionFields,
  type AnchorablePhoto,
} from "@/components/products/product-condition-fields";
import { ProductImagesField } from "@/components/products/product-images-field";
import type {
  ConditionAspect,
  ConditionGrade,
  ListingKind,
  Product,
  ProductCategory,
  ProductStatus,
} from "@/components/products/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  LISTING_KIND_LABELS,
  PRODUCT_STATUS_LABELS,
} from "@/lib/product-data";
import { createSlug } from "@/lib/slug";

const initialProductActionState: ProductActionState = {
  status: "idle",
  message: "",
};

const LISTING_KIND_OPTIONS: ListingKind[] = ["used_unique", "new_stocked"];
const STATUS_OPTIONS: ProductStatus[] = [
  "draft",
  "available",
  "reserved",
  "sold",
  "archived",
];

type ProductFormProps = {
  mode: "create" | "edit";
  categories: ProductCategory[];
  conditionGrades: ConditionGrade[];
  conditionAspects: ConditionAspect[];
  product?: Product;
};

export function ProductForm({
  mode,
  categories,
  conditionGrades,
  conditionAspects,
  product,
}: ProductFormProps) {
  const action = mode === "create" ? createProduct : updateProduct;
  const [state, formAction, pending] = useActionState(
    action,
    initialProductActionState,
  );
  const [name, setName] = useState(product?.name ?? "");
  const [slug, setSlug] = useState(product?.slug ?? "");
  const [slugEdited, setSlugEdited] = useState(false);
  const [imagesProcessing, setImagesProcessing] = useState(false);
  // Reported upward by ProductImagesField so a flaw can be anchored to a photo that has
  // not been uploaded yet — the id was minted client-side.
  const [photos, setPhotos] = useState<AnchorablePhoto[]>(() =>
    (product?.images ?? []).map((image, index) => ({
      id: image.id,
      label: `ფოტო ${index + 1} — ${image.originalName}`,
    })),
  );
  // Drives which half of the condition/stock pair is shown. The server rebuilds the
  // payload from this same discriminator, so the hidden half can never reach the database.
  const [listingKind, setListingKind] = useState<ListingKind>(
    product?.listingKind ?? "used_unique",
  );
  const isUsed = listingKind === "used_unique";
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
          <Label htmlFor="product-category">კატალოგი</Label>
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
              აირჩიეთ კატალოგი
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

        <div className="grid gap-2">
          <Label htmlFor="product-listing-kind">პროდუქტის ტიპი</Label>
          <select
            id="product-listing-kind"
            name="listingKind"
            value={listingKind}
            onChange={(event) =>
              setListingKind(event.target.value as ListingKind)
            }
            required
            aria-invalid={Boolean(state.fieldErrors?.listingKind)}
            aria-describedby="product-listing-kind-help"
            className="h-12 w-full rounded-lg border border-[#d6c3b8] bg-white px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-[#7f512f]/30"
          >
            {LISTING_KIND_OPTIONS.map((kind) => (
              <option key={kind} value={kind}>
                {LISTING_KIND_LABELS[kind]}
              </option>
            ))}
          </select>
          {state.fieldErrors?.listingKind ? (
            <p className="text-xs font-medium text-[#c62828]">
              {state.fieldErrors.listingKind}
            </p>
          ) : (
            <p
              id="product-listing-kind-help"
              className="text-xs leading-5 text-[#605e5b]"
            >
              მეორადი ნივთი ერთეულია და მდგომარეობა სავალდებულოა; ახალ ნივთს
              მარაგი აქვს.
            </p>
          )}
        </div>

        <div className="grid gap-2">
          <Label htmlFor="product-status">სტატუსი</Label>
          <select
            id="product-status"
            name="productStatus"
            defaultValue={product?.status ?? "draft"}
            required
            aria-invalid={Boolean(state.fieldErrors?.productStatus)}
            aria-describedby="product-status-help"
            className="h-12 w-full rounded-lg border border-[#d6c3b8] bg-white px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-[#7f512f]/30"
          >
            {STATUS_OPTIONS.map((value) => (
              <option key={value} value={value}>
                {PRODUCT_STATUS_LABELS[value]}
              </option>
            ))}
          </select>
          {state.fieldErrors?.productStatus ? (
            <p className="text-xs font-medium text-[#c62828]">
              {state.fieldErrors.productStatus}
            </p>
          ) : (
            <p
              id="product-status-help"
              className="text-xs leading-5 text-[#605e5b]"
            >
              მხოლოდ „ხელმისაწვდომი“ ჩანს საიტის კატალოგში. „მონახაზი“ საიტზე არ
              გამოჩნდება.
            </p>
          )}
        </div>

        {isUsed ? (
          <>
            <div className="grid gap-2">
              <Label htmlFor="product-condition-grade">მდგომარეობა</Label>
              <select
                id="product-condition-grade"
                name="conditionGrade"
                defaultValue={product?.conditionGrade?.code ?? ""}
                required
                aria-invalid={Boolean(state.fieldErrors?.conditionGrade)}
                aria-describedby="product-condition-grade-help"
                className="h-12 w-full rounded-lg border border-[#d6c3b8] bg-white px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-[#7f512f]/30"
              >
                <option value="" disabled>
                  აირჩიეთ მდგომარეობა
                </option>
                {conditionGrades.map((grade) => (
                  <option key={grade.code} value={grade.code}>
                    {grade.labelKa}
                  </option>
                ))}
              </select>
              {state.fieldErrors?.conditionGrade ? (
                <p className="text-xs font-medium text-[#c62828]">
                  {state.fieldErrors.conditionGrade}
                </p>
              ) : (
                <p
                  id="product-condition-grade-help"
                  className="text-xs leading-5 text-[#605e5b]"
                >
                  მეორადი ნივთისთვის სავალდებულოა — ეს ჩანს მყიდველისთვის.
                </p>
              )}
            </div>

            <div className="grid gap-2 lg:col-span-2">
              <Label htmlFor="product-condition-summary">
                მდგომარეობის აღწერა
              </Label>
              <textarea
                id="product-condition-summary"
                name="conditionSummary"
                defaultValue={product?.conditionSummary ?? ""}
                placeholder="მაგალითად: ზედაპირზე ნაკაწრები მარცხენა კიდესთან; კარკასი მდგრადია."
                rows={4}
                maxLength={2000}
                aria-invalid={Boolean(state.fieldErrors?.conditionSummary)}
                aria-describedby="product-condition-summary-help"
                className="w-full resize-y rounded-lg border border-[#d6c3b8] bg-white px-3 py-3 text-sm leading-6 outline-none placeholder:text-[#83746b] focus-visible:ring-2 focus-visible:ring-[#7f512f]/30"
              />
              {state.fieldErrors?.conditionSummary ? (
                <p className="text-xs font-medium text-[#c62828]">
                  {state.fieldErrors.conditionSummary}
                </p>
              ) : (
                <p
                  id="product-condition-summary-help"
                  className="text-xs leading-5 text-[#605e5b]"
                >
                  აღწერეთ ნაკლოვანებები გულწრფელად — ეს ქმნის მყიდველის ნდობას.
                </p>
              )}
            </div>
          </>
        ) : (
          <div className="grid gap-2">
            <Label htmlFor="product-stock-quantity">მარაგი</Label>
            <Input
              id="product-stock-quantity"
              name="stockQuantity"
              type="number"
              min="0"
              max="1000000"
              step="1"
              defaultValue={product?.stockQuantity ?? 1}
              required
              aria-invalid={Boolean(state.fieldErrors?.stockQuantity)}
              aria-describedby="product-stock-quantity-help"
              className="h-12 border-[#d6c3b8] bg-white"
            />
            {state.fieldErrors?.stockQuantity ? (
              <p className="text-xs font-medium text-[#c62828]">
                {state.fieldErrors.stockQuantity}
              </p>
            ) : (
              <p
                id="product-stock-quantity-help"
                className="text-xs leading-5 text-[#605e5b]"
              >
                ახალი პროდუქტის ხელმისაწვდომი რაოდენობა.
              </p>
            )}
          </div>
        )}

        {/* Dimensions sit outside the isUsed branch: a new chair has a seat height too.
            Every field is optional — blank writes NULL, which the CHECK constraints treat
            as "not measured" rather than zero. */}
        <fieldset className="grid gap-3 lg:col-span-2">
          <legend className="text-sm font-semibold text-[#1b1c1c]">
            ზომები
          </legend>
          <p className="text-xs leading-5 text-[#605e5b]">
            შეავსეთ რაც იცით. ცარიელი ველი ნიშნავს „არ არის გაზომილი“ — ეს
            მყიდველს ეხმარება გაიგოს, ეტევა თუ არა ნივთი მის სივრცეში.
          </p>

          <div className="grid gap-3 sm:grid-cols-3">
            <div className="grid gap-1.5">
              <Label htmlFor="product-width">სიგანე (სმ)</Label>
              <Input
                id="product-width"
                name="widthCm"
                type="number"
                min="0.1"
                max="2000"
                step="0.1"
                defaultValue={product?.dimensions.widthCm ?? ""}
                className="h-12 border-[#d6c3b8] bg-white"
              />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="product-depth">სიღრმე (სმ)</Label>
              <Input
                id="product-depth"
                name="depthCm"
                type="number"
                min="0.1"
                max="2000"
                step="0.1"
                defaultValue={product?.dimensions.depthCm ?? ""}
                className="h-12 border-[#d6c3b8] bg-white"
              />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="product-height">სიმაღლე (სმ)</Label>
              <Input
                id="product-height"
                name="heightCm"
                type="number"
                min="0.1"
                max="2000"
                step="0.1"
                defaultValue={product?.dimensions.heightCm ?? ""}
                className="h-12 border-[#d6c3b8] bg-white"
              />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="product-seat-height">ჯდომის სიმაღლე (სმ)</Label>
              <Input
                id="product-seat-height"
                name="seatHeightCm"
                type="number"
                min="0.1"
                max="300"
                step="0.1"
                defaultValue={product?.dimensions.seatHeightCm ?? ""}
                placeholder="სკამებისთვის"
                className="h-12 border-[#d6c3b8] bg-white"
              />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="product-weight">წონა (კგ)</Label>
              <Input
                id="product-weight"
                name="weightKg"
                type="number"
                min="0.01"
                max="1000"
                step="0.01"
                defaultValue={product?.dimensions.weightKg ?? ""}
                className="h-12 border-[#d6c3b8] bg-white"
              />
            </div>
          </div>

          <div className="grid gap-1.5">
            <Label htmlFor="product-dimension-note">ზომების შენიშვნა</Label>
            <Input
              id="product-dimension-note"
              name="dimensionNote"
              defaultValue={product?.dimensions.note ?? ""}
              placeholder="მაგ.: მრგვალი — დიამეტრი 90 სმ; ან რეგულირებადი სიმაღლე."
              maxLength={500}
              className="h-12 border-[#d6c3b8] bg-white"
            />
          </div>

          {state.fieldErrors?.dimensions ? (
            <p className="text-xs font-medium text-[#c62828]">
              {state.fieldErrors.dimensions}
            </p>
          ) : null}
        </fieldset>

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
          onProcessingChange={setImagesProcessing}
          onPhotosChange={setPhotos}
          serverError={state.fieldErrors?.images}
        />

        {/* Condition detail applies only to second-hand items; a new stocked product has
            no condition data by the CHECK constraint in 03_products.sql. */}
        {isUsed ? (
          <ProductConditionFields
            aspects={conditionAspects}
            grades={conditionGrades}
            photos={photos}
            existingAspects={product?.conditionAspects}
            existingFlaws={product?.flaws}
            serverError={state.fieldErrors?.flaws}
          />
        ) : null}
      </div>

      {categories.length === 0 && (
        <p className="mt-5 rounded-xl bg-[#fff3cd] px-4 py-3 text-sm font-medium text-[#705500]">
          პროდუქტის შესაქმნელად ჯერ დაამატეთ მინიმუმ ერთი კატალოგი.
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
          disabled={pending || imagesProcessing || categories.length === 0}
          className="min-w-40"
        >
          {(pending || imagesProcessing) && (
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
