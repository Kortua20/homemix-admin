"use client";

import { useActionState, useState } from "react";
import { LoaderCircle } from "lucide-react";
import Link from "next/link";

import {
  createProduct,
  updateProduct,
  type ProductActionState,
} from "@/app/product/actions";
import { ProductAttributeFields } from "@/components/products/product-attribute-fields";
import {
  ProductConditionFields,
  type AnchorablePhoto,
} from "@/components/products/product-condition-fields";
import {
  FieldError,
  RequiredMark,
} from "@/components/products/field-error";
import {
  FormErrorSummary,
  type FieldDescriptor,
} from "@/components/products/form-error-summary";
import { ProductImagesField } from "@/components/products/product-images-field";
import type {
  ConditionAspect,
  ConditionGrade,
  ListingKind,
  Product,
  ProductAttribute,
  ProductCategory,
  ProductStatus,
} from "@/components/products/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  getProductImageUrl,
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
  materials: ProductAttribute[];
  colours: ProductAttribute[];
  styles: ProductAttribute[];
  product?: Product;
};

export function ProductForm({
  mode,
  categories,
  conditionGrades,
  conditionAspects,
  materials,
  colours,
  styles,
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
      // Already-saved photos stream through the same route the images field uses to render
      // them, so the flaw picker shows thumbnails on an edit, not just on a fresh create.
      previewUrl: getProductImageUrl(image.id),
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

  // Increments on every submit so the summary re-announces and re-scrolls even when the
  // second attempt fails on the same fields. Without it, fixing one of three errors and
  // resubmitting would leave the summary silently unchanged.
  const [submitToken, setSubmitToken] = useState(0);

  // Visual order, which is not the order the server validates in. The summary walks this
  // list so its links read top-to-bottom the way the form does, and each `id` is the real
  // input id so the anchor can focus it.
  const errorFields: FieldDescriptor[] = [
    { key: "name", id: "product-name", label: "პროდუქტის დასახელება" },
    { key: "slug", id: "product-slug", label: "სლაგი" },
    { key: "categoryId", id: "product-category", label: "კატალოგი" },
    { key: "price", id: "product-price", label: "ფასი" },
    {
      key: "compareAtPrice",
      id: "product-compare-at-price",
      label: "ძველი ფასი",
    },
    { key: "listingKind", id: "product-listing-kind", label: "პროდუქტის ტიპი" },
    { key: "productStatus", id: "product-status", label: "სტატუსი" },
    { key: "conditionGrade", id: "product-condition-grade", label: "მდგომარეობა" },
    {
      key: "conditionSummary",
      id: "product-condition-summary",
      label: "მდგომარეობის აღწერა",
    },
    { key: "stockQuantity", id: "product-stock", label: "მარაგი" },
    { key: "description", id: "product-description", label: "აღწერა" },
    { key: "dimensions", id: "product-width", label: "ზომები" },
    { key: "images", id: "product-images", label: "ფოტოები" },
  ];

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
      onSubmit={() => setSubmitToken((token) => token + 1)}
      className="mt-7 rounded-3xl bg-white p-5 shadow-[0_16px_30px_rgba(0,0,0,0.04)] lg:p-8"
    >
      <FormErrorSummary
        fieldErrors={state.fieldErrors}
        fields={errorFields}
        submitToken={submitToken}
      />
      {product && (
        <>
          <input type="hidden" name="id" value={product.id} />
          <input type="hidden" name="previousSlug" value={product.slug} />
        </>
      )}

      <div className="grid gap-5 lg:grid-cols-2">
        <div className="grid gap-2 lg:col-span-2">
          <Label htmlFor="product-name">
            პროდუქტის დასახელება
            <RequiredMark />
          </Label>
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
            <FieldError id="product-name-error">{state.fieldErrors.name}</FieldError>
          )}
        </div>

        <div className="grid gap-2 lg:col-span-2">
          <Label htmlFor="product-slug">
            სლაგი
            <RequiredMark />
          </Label>
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
            <FieldError id="product-slug-error">{state.fieldErrors.slug}</FieldError>
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
          <Label htmlFor="product-category">
            კატალოგი
            <RequiredMark />
          </Label>
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
            className="h-12 w-full rounded-lg border border-[#d6c3b8] bg-white px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-[#7f512f]/30 aria-invalid:border-[#c62828] aria-invalid:bg-[#fffafa] aria-invalid:focus-visible:ring-[#c62828]/20"
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
            <FieldError id="product-category-error">{state.fieldErrors.categoryId}</FieldError>
          )}
        </div>

        <div className="grid gap-2">
          <Label htmlFor="product-price">
            ფასი
            <RequiredMark />
          </Label>
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
            <FieldError id="product-price-error">{state.fieldErrors.price}</FieldError>
          )}
        </div>

        {/* The "was" price. Optional: blank means the item is not on sale and writes NULL.
            `ფასი` above always stays what the customer pays, so a discount never overwrites
            the real selling price — and the percentage shown on the storefront is derived
            from these two rather than stored, so it cannot drift out of agreement. */}
        <div className="grid gap-2">
          <Label htmlFor="product-compare-at-price">ძველი ფასი</Label>
          <div className="relative">
            <Input
              id="product-compare-at-price"
              name="compareAtPrice"
              type="number"
              min="0"
              max="9999999999.99"
              step="0.01"
              defaultValue={product?.compareAtPrice ?? ""}
              placeholder="ფასდაკლების გარეშე — ცარიელი"
              aria-invalid={Boolean(state.fieldErrors?.compareAtPrice)}
              aria-describedby={
                state.fieldErrors?.compareAtPrice
                  ? "product-compare-at-price-error"
                  : "product-compare-at-price-help"
              }
              className="h-12 border-[#d6c3b8] bg-white pr-10"
            />
            <span className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 font-semibold text-[#605e5b]">
              ₾
            </span>
          </div>
          {state.fieldErrors?.compareAtPrice ? (
            <FieldError id="product-compare-at-price-error">
              {state.fieldErrors.compareAtPrice}
            </FieldError>
          ) : (
            <p
              id="product-compare-at-price-help"
              className="text-xs leading-5 text-[#605e5b]"
            >
              შეავსეთ მხოლოდ ფასდაკლების დროს. უნდა იყოს მიმდინარე ფასზე მეტი —
              ფასდაკლების პროცენტი ავტომატურად გამოითვლება.
            </p>
          )}
        </div>

        <div className="grid gap-2">
          <Label htmlFor="product-listing-kind">
            პროდუქტის ტიპი
            <RequiredMark />
          </Label>
          <select
            id="product-listing-kind"
            name="listingKind"
            value={listingKind}
            onChange={(event) =>
              setListingKind(event.target.value as ListingKind)
            }
            required
            aria-invalid={Boolean(state.fieldErrors?.listingKind)}
            aria-describedby={
              state.fieldErrors?.listingKind
                ? "product-listing-kind-error"
                : "product-listing-kind-help"
            }
            className="h-12 w-full rounded-lg border border-[#d6c3b8] bg-white px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-[#7f512f]/30 aria-invalid:border-[#c62828] aria-invalid:bg-[#fffafa] aria-invalid:focus-visible:ring-[#c62828]/20"
          >
            {LISTING_KIND_OPTIONS.map((kind) => (
              <option key={kind} value={kind}>
                {LISTING_KIND_LABELS[kind]}
              </option>
            ))}
          </select>
          {state.fieldErrors?.listingKind ? (
            <FieldError id="product-listing-kind-error">{state.fieldErrors.listingKind}</FieldError>
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
          <Label htmlFor="product-status">
            სტატუსი
            <RequiredMark />
          </Label>
          <select
            id="product-status"
            name="productStatus"
            defaultValue={product?.status ?? "draft"}
            required
            aria-invalid={Boolean(state.fieldErrors?.productStatus)}
            aria-describedby={
              state.fieldErrors?.productStatus
                ? "product-status-error"
                : "product-status-help"
            }
            className="h-12 w-full rounded-lg border border-[#d6c3b8] bg-white px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-[#7f512f]/30 aria-invalid:border-[#c62828] aria-invalid:bg-[#fffafa] aria-invalid:focus-visible:ring-[#c62828]/20"
          >
            {STATUS_OPTIONS.map((value) => (
              <option key={value} value={value}>
                {PRODUCT_STATUS_LABELS[value]}
              </option>
            ))}
          </select>
          {state.fieldErrors?.productStatus ? (
            <FieldError id="product-status-error">{state.fieldErrors.productStatus}</FieldError>
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
                aria-describedby={
                  state.fieldErrors?.conditionGrade
                    ? "product-condition-grade-error"
                    : "product-condition-grade-help"
                }
                className="h-12 w-full rounded-lg border border-[#d6c3b8] bg-white px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-[#7f512f]/30 aria-invalid:border-[#c62828] aria-invalid:bg-[#fffafa] aria-invalid:focus-visible:ring-[#c62828]/20"
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
                <FieldError id="product-condition-grade-error">{state.fieldErrors.conditionGrade}</FieldError>
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
                aria-describedby={
                  state.fieldErrors?.conditionSummary
                    ? "product-condition-summary-error"
                    : "product-condition-summary-help"
                }
                className="w-full resize-y rounded-lg border border-[#d6c3b8] bg-white px-3 py-3 text-sm leading-6 outline-none placeholder:text-[#83746b] focus-visible:ring-2 focus-visible:ring-[#7f512f]/30 aria-invalid:border-[#c62828] aria-invalid:bg-[#fffafa] aria-invalid:focus-visible:ring-[#c62828]/20"
              />
              {state.fieldErrors?.conditionSummary ? (
                <FieldError id="product-condition-summary-error">{state.fieldErrors.conditionSummary}</FieldError>
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
              aria-describedby={
                state.fieldErrors?.stockQuantity
                  ? "product-stock-quantity-error"
                  : "product-stock-quantity-help"
              }
              className="h-12 border-[#d6c3b8] bg-white"
            />
            {state.fieldErrors?.stockQuantity ? (
              <FieldError id="product-stock-quantity-error">{state.fieldErrors.stockQuantity}</FieldError>
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
                // `dimensions` is one error covering five inputs, and the server does not
                // say which one is bad. Marking the first is what the summary links to, so
                // the person lands inside the group rather than nowhere.
                aria-invalid={Boolean(state.fieldErrors?.dimensions)}
                aria-describedby={
                  state.fieldErrors?.dimensions
                    ? "product-dimensions-error"
                    : undefined
                }
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
            <FieldError id="product-dimensions-error">{state.fieldErrors.dimensions}</FieldError>
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
            className="w-full resize-y rounded-lg border border-[#d6c3b8] bg-white px-3 py-3 text-sm leading-6 outline-none placeholder:text-[#83746b] focus-visible:ring-2 focus-visible:ring-[#7f512f]/30 aria-invalid:border-[#c62828] aria-invalid:bg-[#fffafa] aria-invalid:focus-visible:ring-[#c62828]/20"
          />
          {state.fieldErrors?.description ? (
            <FieldError id="product-description-error">{state.fieldErrors.description}</FieldError>
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

        {/* Applies to both listing kinds — a new sofa has a material and a colour too. */}
        <ProductAttributeFields
          materials={materials}
          colours={colours}
          styles={styles}
          selectedMaterials={product?.materialCodes}
          selectedColours={product?.colourCodes}
          selectedStyles={product?.styleCodes}
          serverError={state.fieldErrors?.attributes}
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
