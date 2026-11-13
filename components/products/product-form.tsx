"use client";

import { startTransition, useActionState, useState } from "react";
import { LoaderCircle } from "lucide-react";
import Link from "next/link";

import {
  createProduct,
  updateProduct,
  type ProductActionState,
} from "@/app/product/actions";
import { JumpLink, useFocusHashTarget } from "@/components/products/jump-link";
import { ProductAiAssist } from "@/components/products/product-ai-assist";
import { ProductAttributeFields } from "@/components/products/product-attribute-fields";
import { ProductFeatureFields } from "@/components/products/product-feature-fields";
import { ProductFinanceFields } from "@/components/products/product-finance-fields";
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
  AttributeKind,
  AttributeSelection,
  ConditionAspect,
  ConditionGrade,
  FoldingMechanism,
  ListingKind,
  Product,
  ProductAiSuggestion,
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
import { createSlug, createSlugWhileTyping } from "@/lib/slug";
import { useUnsavedChangesWarning } from "@/lib/use-unsaved-changes-warning";

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

// What an AI suggestion ticks without asking. Only what photos make near-certain: colours
// unless the model itself was unsure, materials only when visibly unambiguous, styles only
// when clear. Everything else stays marked-but-unticked on its chip for the admin to accept.
function getAutoApplyCodes(suggestion: ProductAiSuggestion): AttributeSelection {
  return {
    colours: suggestion.colours
      .filter((colour) => colour.confidence !== "low")
      .map((colour) => colour.code),
    materials: suggestion.materials
      .filter((material) => material.basis === "visible" && material.confidence === "high")
      .map((material) => material.code),
    styles: suggestion.styles
      .filter((style) => style.confidence === "high")
      .map((style) => style.code),
  };
}

function mergeCodes(current: string[], additions: string[]) {
  return [...new Set([...current, ...additions])];
}

const NUDGE_LINK_CLASS =
  "font-semibold text-walnut underline underline-offset-2 hover:no-underline";

type ProductFormProps = {
  mode: "create" | "edit";
  categories: ProductCategory[];
  conditionGrades: ConditionGrade[];
  conditionAspects: ConditionAspect[];
  materials: ProductAttribute[];
  colours: ProductAttribute[];
  styles: ProductAttribute[];
  foldingMechanisms: FoldingMechanism[];
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
  foldingMechanisms,
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
  // Controlled, unlike most of this form, because an AI suggestion writes into them from
  // outside the field. See handleAiSuggestion for the rules on when it may.
  const [description, setDescription] = useState(product?.description ?? "");
  const [categoryId, setCategoryId] = useState(product?.categoryId ?? "");
  const [attributeSelection, setAttributeSelection] = useState<AttributeSelection>(
    () => ({
      materials: product?.materialCodes ?? [],
      colours: product?.colourCodes ?? [],
      styles: product?.styleCodes ?? [],
    }),
  );
  const [aiSuggestion, setAiSuggestion] = useState<ProductAiSuggestion | null>(null);
  const [aiAnalysing, setAiAnalysing] = useState(false);
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
  // Controlled for the same reason as listingKind: it decides whether the sale fields
  // render, and the server builds the sale payload from this same value.
  const [status, setStatus] = useState<ProductStatus>(
    product?.status ?? "draft",
  );
  const cancelHref =
    mode === "edit" && product ? `/product/${product.slug}` : "/dashboard";

  // Increments on every submit so the summary re-announces and re-scrolls even when the
  // second attempt fails on the same fields. Without it, fixing one of three errors and
  // resubmitting would leave the summary silently unchanged.
  const [submitToken, setSubmitToken] = useState(0);

  // Dirtiness is tracked from the form's own input/change events rather than by comparing
  // each field to its initial value: this form mixes controlled state (name, slug, listing
  // kind) with uncontrolled inputs and two child components that own their own fields, so a
  // per-field comparison would need every one of them to report upward and would silently
  // miss whichever was added last. One listener on the form element catches all of them.
  //
  // The tradeoff is that typing a character and deleting it still counts as dirty. That
  // errs toward one unnecessary prompt rather than toward silent data loss, which is the
  // right direction for a form this expensive to refill.
  const [dirty, setDirty] = useState(false);

  // Derived, not tracked separately: the guard is off while a save is in flight, because the
  // redirect that follows a successful one is not an escape attempt. It comes back on if the
  // server returns errors, since the edits are then still on screen and still unsaved —
  // which is exactly when someone is most likely to give up and navigate away.
  //
  // `pending` already describes the in-flight window, so there is no second flag to keep in
  // step with it and no effect needed to clear one.
  // Links from the product page ("დამატება" next to a missing purchase price) arrive with the
  // field's id in the hash; land on it ready to type into.
  useFocusHashTarget();

  useUnsavedChangesWarning(
    dirty && !pending,
    "შენახვის გარეშე გასვლა? შეტანილი ცვლილებები დაიკარგება.",
  );

  // Visual order, which is not the order the server validates in. The summary walks this
  // list so its links read top-to-bottom the way the form does, and each `id` is the real
  // input id so the anchor can focus it.
  const errorFields: FieldDescriptor[] = [
    { key: "images", id: "product-images", label: "ფოტოები" },
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
    { key: "stockQuantity", id: "product-stock-quantity", label: "მარაგი" },
    { key: "finances", id: "product-purchase-price", label: "შიდა ფინანსები" },
    { key: "dimensions", id: "product-width", label: "ზომები" },
    { key: "features", id: "product-is-foldable", label: "გაშლა და სათავსო" },
    { key: "description", id: "product-description", label: "აღწერა" },
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
    setSlug(createSlugWhileTyping(event.target.value));
  }

  function toggleAttribute(kind: AttributeKind, code: string) {
    setAttributeSelection((current) => ({
      ...current,
      [kind]: current[kind].includes(code)
        ? current[kind].filter((selectedCode) => selectedCode !== code)
        : [...current[kind], code],
    }));
  }

  // Merge rules, so a suggestion never fights what the admin has already done:
  //   - It only adds. Nothing the admin ticked is ever unticked.
  //   - The description and category are filled only if empty WHEN THE ANSWER ARRIVES —
  //     read through the updater, not from this closure, which was captured when the button
  //     was clicked and would miss anything chosen or typed during the request.
  //   - A low-confidence category is offered under the select, never chosen for the admin.
  //   - Price, name, status and everything else the AI cannot see are never touched.
  //   - Photos that look like different items, or like no furniture at all, fill nothing;
  //     the suggestions are still shown and can be accepted by hand.
  function handleAiSuggestion(suggestion: ProductAiSuggestion) {
    setAiSuggestion(suggestion);

    if (!suggestion.isFurniture || !suggestion.sameItem) {
      return;
    }

    // Read directly rather than through an updater: the slug has to follow in the same
    // step, which an updater cannot do. Safe because ProductAiAssist always calls the
    // handler from the latest render, so `name` and `slugEdited` are current.
    if (suggestion.nameKa && name.trim() === "") {
      applyName(suggestion.nameKa);
    }

    const suggestedCategory = suggestion.category;
    if (suggestedCategory && suggestedCategory.confidence !== "low") {
      setCategoryId((current) => (current === "" ? suggestedCategory.id : current));
    }

    if (suggestion.descriptionKa) {
      setDescription((current) =>
        current.trim() === "" ? suggestion.descriptionKa : current,
      );
    }

    const additions = getAutoApplyCodes(suggestion);
    setAttributeSelection((current) => ({
      materials: mergeCodes(current.materials, additions.materials),
      colours: mergeCodes(current.colours, additions.colours),
      styles: mergeCodes(current.styles, additions.styles),
    }));

    // State updates do not fire the form's input events, and AI-filled values are unsaved
    // work like any other.
    setDirty(true);
  }

  function handleAiDescriptionChange(nextDescription: string) {
    setDescription(nextDescription);
    setDirty(true);
  }

  // The same thing typing a name does: the slug follows until the admin edits it by hand.
  function applyName(nextName: string) {
    setName(nextName);
    if (!slugEdited) {
      setSlug(createSlug(nextName));
    }
  }

  function handleUseSuggestedName() {
    if (!aiSuggestion?.nameKa) return;
    applyName(aiSuggestion.nameKa);
    setDirty(true);
  }

  const suggestedName = aiSuggestion?.nameKa ?? "";
  const nameFromAi = suggestedName !== "" && name === suggestedName;

  function handleChooseSuggestedCategory() {
    if (!aiSuggestion?.category) return;
    setCategoryId(aiSuggestion.category.id);
    setDirty(true);
  }

  // Same derivation as the description marker below: "from AI" while the select still holds
  // the suggested category, an offer while it holds something else.
  const suggestedCategory = aiSuggestion?.category
    ? categories.find((category) => category.id === aiSuggestion.category?.id)
    : undefined;
  const categoryFromAi = suggestedCategory !== undefined && categoryId === suggestedCategory.id;

  // Derived: the marker shows while the field still holds exactly the AI's text, and
  // disappears on the first edit without anything having to clear it.
  const descriptionFromAi =
    aiSuggestion !== null &&
    description !== "" &&
    description === aiSuggestion.descriptionKa;
  // Catches the admin who skipped past the photos and is about to write the description by
  // hand — the one case where the AI could have saved real effort. Only while the field is
  // empty and nothing has been analysed yet, so it never talks over work already done.
  const descriptionNudge =
    mode === "create" && description.trim() === "" && aiSuggestion === null
      ? photos.length === 0
        ? "add-photos"
        : "analyse"
      : null;
  const aiSuggestedCodes: AttributeSelection | undefined = aiSuggestion
    ? {
        materials: aiSuggestion.materials.map((material) => material.code),
        colours: aiSuggestion.colours.map((colour) => colour.code),
        styles: aiSuggestion.styles.map((style) => style.code),
      }
    : undefined;

  // Dispatched by hand rather than through <form action={formAction}>. React resets every
  // uncontrolled field before running a form action, and it does so even when the server
  // comes back with validation errors — so a rejected save used to blank the price,
  // category, status, condition and dimensions while the fields held in state survived,
  // which looked like the AI had changed them. Calling the action ourselves skips that
  // reset; the edits stay on screen next to the errors, as the dirty-state comment above
  // always assumed. Native `required`/pattern validation still runs first, because the
  // submit event only fires once the browser's own checks pass.
  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitToken((token) => token + 1);
    const formData = new FormData(event.currentTarget);
    startTransition(() => formAction(formData));
  }

  return (
    <form
      onSubmit={handleSubmit}
      // Capture any edit anywhere in the form, including the image and flaw fields that own
      // their own inputs. `onInput` bubbles from every native control, which `onChange`
      // alone would not give us for the uncontrolled ones.
      onInput={() => setDirty(true)}
      onChange={() => setDirty(true)}
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
          {/* The stock as loaded, so updateProduct can refuse to overwrite a sale recorded
              while this form was open. */}
          <input
            type="hidden"
            name="loadedStockQuantity"
            value={product.stockQuantity ?? ""}
          />
        </>
      )}

      <div className="grid gap-5 lg:grid-cols-2">
        {/* Photos lead, on both pages. Listings are photographed before they are written up,
            and on a create the AI panel below turns those photos into the description and
            attributes — so starting here is the path that saves the most typing. The edit
            page keeps the same order so the form never rearranges itself between the two. */}
        <ProductImagesField
          existingImages={product?.images}
          onProcessingChange={setImagesProcessing}
          onPhotosChange={setPhotos}
          serverError={state.fieldErrors?.images}
        />

        {/* Create only for now: on an edit the fields are already filled, so the merge rules
            would leave almost everything untouched. The component itself handles saved
            photos, so enabling it there is a one-line change once that is wanted. */}
        {mode === "create" ? (
          <ProductAiAssist
            photos={photos}
            disabled={pending || imagesProcessing}
            suggestion={aiSuggestion}
            onSuggestion={handleAiSuggestion}
            onAnalysingChange={setAiAnalysing}
            description={description}
            onDescriptionChange={handleAiDescriptionChange}
            selection={attributeSelection}
            categoryId={categoryId}
            name={name}
          />
        ) : null}

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
            // No autoFocus: photos now come first, and jumping focus past them to the name
            // would contradict the order the form is laid out in.
            aria-invalid={Boolean(state.fieldErrors?.name)}
            aria-describedby={
              state.fieldErrors?.name
                ? "product-name-error"
                : suggestedName
                  ? "product-name-help"
                  : undefined
            }
            className="h-12 border-clay-border bg-white"
          />
          {state.fieldErrors?.name ? (
            <FieldError id="product-name-error">{state.fieldErrors.name}</FieldError>
          ) : nameFromAi ? (
            <p id="product-name-help" className="text-xs leading-5 text-quiet-ink">
              AI-ს შემოთავაზება — სხვა პროდუქტს ასეთი სახელი არ აქვს. შენახვამდე
              გადაამოწმეთ.
            </p>
          ) : suggestedName ? (
            <p id="product-name-help" className="text-xs leading-5 text-quiet-ink">
              AI გვთავაზობს: {suggestedName}.{" "}
              <button
                type="button"
                onClick={handleUseSuggestedName}
                className={NUDGE_LINK_CLASS}
              >
                გამოყენება
              </button>
            </p>
          ) : null}
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
            onBlur={() => setSlug(createSlug)}
            placeholder="mukhis-sasadilo-magida"
            required
            minLength={2}
            maxLength={160}
            pattern="[a-z0-9]+(?:-[a-z0-9]+)*"
            aria-invalid={Boolean(state.fieldErrors?.slug)}
            aria-describedby={
              state.fieldErrors?.slug
                ? "product-slug-error"
                : "product-slug-help"
            }
            className="h-12 border-clay-border bg-white"
          />
          {state.fieldErrors?.slug ? (
            <FieldError id="product-slug-error">{state.fieldErrors.slug}</FieldError>
          ) : (
            <p
              id="product-slug-help"
              className="text-xs leading-5 text-quiet-ink"
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
            value={categoryId}
            onChange={(event) => setCategoryId(event.target.value)}
            required
            aria-invalid={Boolean(state.fieldErrors?.categoryId)}
            aria-describedby={
              state.fieldErrors?.categoryId
                ? "product-category-error"
                : suggestedCategory
                  ? "product-category-help"
                  : undefined
            }
            className="h-12 w-full rounded-lg border border-clay-border bg-white px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-walnut/30 aria-invalid:border-destructive aria-invalid:bg-[#fffafa] aria-invalid:focus-visible:ring-destructive/20"
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
          {state.fieldErrors?.categoryId ? (
            <FieldError id="product-category-error">{state.fieldErrors.categoryId}</FieldError>
          ) : categoryFromAi ? (
            <p id="product-category-help" className="text-xs leading-5 text-quiet-ink">
              AI-ს შემოთავაზება — შენახვამდე გადაამოწმეთ.
            </p>
          ) : suggestedCategory ? (
            <p id="product-category-help" className="text-xs leading-5 text-quiet-ink">
              AI გვთავაზობს: {suggestedCategory.name}.{" "}
              <button
                type="button"
                onClick={handleChooseSuggestedCategory}
                className={NUDGE_LINK_CLASS}
              >
                არჩევა
              </button>
            </p>
          ) : null}
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
              className="h-12 border-clay-border bg-white pr-10"
            />
            <span className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 font-semibold text-quiet-ink">
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
              className="h-12 border-clay-border bg-white pr-10"
            />
            <span className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 font-semibold text-quiet-ink">
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
              className="text-xs leading-5 text-quiet-ink"
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
            className="h-12 w-full rounded-lg border border-clay-border bg-white px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-walnut/30 aria-invalid:border-destructive aria-invalid:bg-[#fffafa] aria-invalid:focus-visible:ring-destructive/20"
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
              className="text-xs leading-5 text-quiet-ink"
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
            value={status}
            onChange={(event) => setStatus(event.target.value as ProductStatus)}
            required
            aria-invalid={Boolean(state.fieldErrors?.productStatus)}
            aria-describedby={
              state.fieldErrors?.productStatus
                ? "product-status-error"
                : "product-status-help"
            }
            className="h-12 w-full rounded-lg border border-clay-border bg-white px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-walnut/30 aria-invalid:border-destructive aria-invalid:bg-[#fffafa] aria-invalid:focus-visible:ring-destructive/20"
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
              className="text-xs leading-5 text-quiet-ink"
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
                className="h-12 w-full rounded-lg border border-clay-border bg-white px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-walnut/30 aria-invalid:border-destructive aria-invalid:bg-[#fffafa] aria-invalid:focus-visible:ring-destructive/20"
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
                  className="text-xs leading-5 text-quiet-ink"
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
                className="w-full resize-y rounded-lg border border-clay-border bg-white px-3 py-3 text-sm leading-6 outline-none placeholder:text-soft-brown focus-visible:ring-2 focus-visible:ring-walnut/30 aria-invalid:border-destructive aria-invalid:bg-[#fffafa] aria-invalid:focus-visible:ring-destructive/20"
              />
              {state.fieldErrors?.conditionSummary ? (
                <FieldError id="product-condition-summary-error">{state.fieldErrors.conditionSummary}</FieldError>
              ) : (
                <p
                  id="product-condition-summary-help"
                  className="text-xs leading-5 text-quiet-ink"
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
              className="h-12 border-clay-border bg-white"
            />
            {state.fieldErrors?.stockQuantity ? (
              <FieldError id="product-stock-quantity-error">{state.fieldErrors.stockQuantity}</FieldError>
            ) : (
              <p
                id="product-stock-quantity-help"
                className="text-xs leading-5 text-quiet-ink"
              >
                ხელმისაწვდომი რაოდენობა — ჩანს საიტზე. გაყიდვის დაფიქსირებისას
                ავტომატურად მცირდება. ამოწურული მარაგის შევსებისას სტატუსიც
                „ხელმისაწვდომი“ გახადეთ.
              </p>
            )}
          </div>
        )}

        {/* Right after the status/condition block rather than further down: choosing
            „გაყიდული“ is what reveals the sale fields, so they appear close to where that
            choice was made. Not wedged between status and grade, which share a grid row. */}
        <ProductFinanceFields
          finances={product?.finances}
          sale={product?.sales[0]}
          listingKind={listingKind}
          status={status}
          savedStatus={product?.status}
          serverError={state.fieldErrors?.finances}
        />

        {/* Dimensions sit outside the isUsed branch: a new chair has a seat height too.
            Every field is optional — blank writes NULL, which the CHECK constraints treat
            as "not measured" rather than zero. */}
        <fieldset className="grid gap-3 lg:col-span-2">
          <legend className="text-sm font-semibold text-ink">
            ზომები
          </legend>
          <p className="text-xs leading-5 text-quiet-ink">
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
                // `dimensions` is one error covering six inputs, and the server does not
                // say which one is bad. Marking the first is what the summary links to, so
                // the person lands inside the group rather than nowhere.
                aria-invalid={Boolean(state.fieldErrors?.dimensions)}
                aria-describedby={
                  state.fieldErrors?.dimensions
                    ? "product-dimensions-error"
                    : undefined
                }
                className="h-12 border-clay-border bg-white"
              />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="product-length">სიგრძე (სმ)</Label>
              <Input
                id="product-length"
                name="lengthCm"
                type="number"
                min="0.1"
                max="2000"
                step="0.1"
                defaultValue={product?.dimensions.lengthCm ?? ""}
                className="h-12 border-clay-border bg-white"
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
                className="h-12 border-clay-border bg-white"
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
                className="h-12 border-clay-border bg-white"
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
                className="h-12 border-clay-border bg-white"
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
                className="h-12 border-clay-border bg-white"
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
              className="h-12 border-clay-border bg-white"
            />
          </div>

          {state.fieldErrors?.dimensions ? (
            <FieldError id="product-dimensions-error">{state.fieldErrors.dimensions}</FieldError>
          ) : null}
        </fieldset>

        {/* Next to the dimensions because the unfolded size is a second set of them. */}
        <ProductFeatureFields
          mechanisms={foldingMechanisms}
          folding={product?.folding}
          hasStorage={product?.hasStorage}
          serverError={state.fieldErrors?.features}
        />

        <div className="grid gap-2 lg:col-span-2">
          <Label htmlFor="product-description">აღწერა</Label>
          <textarea
            id="product-description"
            name="description"
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            placeholder="მოკლედ აღწერეთ პროდუქტი..."
            rows={8}
            maxLength={5000}
            aria-invalid={Boolean(state.fieldErrors?.description)}
            aria-describedby={
              state.fieldErrors?.description
                ? "product-description-error"
                : "product-description-help"
            }
            className="w-full resize-y rounded-lg border border-clay-border bg-white px-3 py-3 text-sm leading-6 outline-none placeholder:text-soft-brown focus-visible:ring-2 focus-visible:ring-walnut/30 aria-invalid:border-destructive aria-invalid:bg-[#fffafa] aria-invalid:focus-visible:ring-destructive/20"
          />
          {state.fieldErrors?.description ? (
            <FieldError id="product-description-error">{state.fieldErrors.description}</FieldError>
          ) : (
            <p
              id="product-description-help"
              className="text-xs leading-5 text-quiet-ink"
            >
              {descriptionFromAi ? (
                "AI-ს მიერ შევსებული — შენახვამდე გადაამოწმეთ და შეასწორეთ."
              ) : descriptionNudge === "add-photos" ? (
                <>
                  დაამატეთ ფოტოები და AI შეადგენს აღწერის პროექტს.{" "}
                  <JumpLink targetId="product-photos" className={NUDGE_LINK_CLASS}>
                    ფოტოებზე გადასვლა
                  </JumpLink>
                </>
              ) : descriptionNudge === "analyse" ? (
                <>
                  ფოტოები დამატებულია — AI-ს შეუძლია აღწერის შედგენა.{" "}
                  <JumpLink targetId="product-ai" className={NUDGE_LINK_CLASS}>
                    ანალიზზე გადასვლა
                  </JumpLink>
                </>
              ) : (
                "აღწერა სურვილისამებრ შეგიძლიათ დატოვოთ ცარიელი."
              )}
            </p>
          )}
        </div>

        {/* Applies to both listing kinds — a new sofa has a material and a colour too. */}
        <ProductAttributeFields
          materials={materials}
          colours={colours}
          styles={styles}
          selection={attributeSelection}
          suggested={aiSuggestedCodes}
          onToggle={toggleAttribute}
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
          className="mt-5 rounded-xl bg-destructive-tint px-4 py-3 text-sm font-medium text-destructive-ink"
        >
          {state.message}
        </p>
      )}

      <div className="mt-8 flex flex-col-reverse gap-3 border-t border-hairline pt-5 sm:flex-row sm:justify-end">
        <Link
          href={cancelHref}
          className="inline-flex h-11.5 items-center justify-center rounded-lg border border-clay-border px-5 text-sm font-semibold text-quiet-ink"
        >
          გაუქმება
        </Link>
        <Button
          type="submit"
          // Disabled during AI analysis too: Server Actions run one at a time per client, so
          // a Save pressed now would sit behind the analysis request rather than run.
          disabled={
            pending || imagesProcessing || aiAnalysing || categories.length === 0
          }
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
