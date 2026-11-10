"use client";

import { useState } from "react";

import { FieldError } from "@/components/products/field-error";
import type {
  FoldingMechanism,
  FoldingMechanismGroup,
  ProductFolding,
} from "@/components/products/types";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { FOLDING_MECHANISM_GROUP_LABELS } from "@/lib/folding-mechanism-data";

// Folding/transforming and built-in storage. Both listing kinds: a new sofa-bed folds too.
//
// Only `isFoldable` is held in state — it decides whether the mechanism and unfolded size
// render at all. Everything else is uncontrolled and read on submit, like the dimensions.
// Unticking "foldable" unmounts those inputs, and the server nulls them from the same flag
// (products_folding_matches_foldable_check), so a stale mechanism can never be saved.

const SELECT_CLASS =
  "h-12 w-full rounded-lg border border-clay-border bg-white px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-walnut/30";

const CHOICE_CLASS =
  "inline-flex cursor-pointer items-center gap-2 rounded-full border border-clay-border bg-white px-3 py-1.5 text-sm text-ink transition-colors hover:border-walnut has-[:checked]:border-walnut has-[:checked]:bg-[#f9f3ef] has-[:checked]:font-semibold";

const GROUP_ORDER: FoldingMechanismGroup[] = ["seating", "table"];

// "" is a real choice here, not a missing answer: it submits as NULL, which the storefront
// reads as "not specified" and never shows. That is every product saved before this field
// existed, so it is also the default for them.
const STORAGE_OPTIONS = [
  { value: "yes", label: "აქვს" },
  { value: "no", label: "არ აქვს" },
  { value: "", label: "არ არის მითითებული" },
] as const;

function storageValue(hasStorage: boolean | null | undefined) {
  if (hasStorage === true) return "yes";
  if (hasStorage === false) return "no";
  return "";
}

export function ProductFeatureFields({
  mechanisms,
  folding,
  hasStorage,
  serverError,
}: {
  mechanisms: FoldingMechanism[];
  folding?: ProductFolding;
  hasStorage?: boolean | null;
  serverError?: string;
}) {
  const [isFoldable, setIsFoldable] = useState(folding?.isFoldable ?? false);
  const currentMechanism = folding?.mechanismCode ?? "";
  // If the vocabulary failed to load, or the saved code was since removed from it, keep the
  // saved value as an option. Otherwise the select would silently submit "" and an
  // unrelated edit (a price change) would wipe the mechanism.
  const currentIsListed =
    currentMechanism === "" ||
    mechanisms.some((mechanism) => mechanism.code === currentMechanism);

  return (
    <fieldset className="grid gap-4 rounded-2xl border border-hairline p-4 lg:col-span-2 lg:p-5">
      <legend className="sr-only">გაშლა და სათავსო</legend>
      <div>
        <h3 className="text-base font-semibold text-ink">გაშლა და სათავსო</h3>
        <p className="mt-1 text-xs leading-5 text-quiet-ink">
          ეს ველები ჩანს პროდუქტის გვერდზე და კატალოგის ფილტრებში.
        </p>
      </div>

      <label className={`${CHOICE_CLASS} w-fit`}>
        <input
          id="product-is-foldable"
          type="checkbox"
          name="isFoldable"
          value="true"
          checked={isFoldable}
          onChange={(event) => setIsFoldable(event.target.checked)}
          className="size-4 accent-walnut"
        />
        გასაშლელი / ტრანსფორმერი
      </label>

      {isFoldable ? (
        <div className="grid gap-4 border-l-2 border-hairline pl-4">
          <div className="grid gap-2">
            <Label htmlFor="product-folding-mechanism">გაშლის მექანიზმი</Label>
            <select
              id="product-folding-mechanism"
              name="foldingMechanism"
              defaultValue={currentMechanism}
              className={SELECT_CLASS}
            >
              <option value="">არ არის მითითებული</option>
              {!currentIsListed ? (
                <option value={currentMechanism}>{currentMechanism}</option>
              ) : null}
              {GROUP_ORDER.map((group) => {
                const options = mechanisms.filter(
                  (mechanism) => mechanism.groupCode === group,
                );
                if (options.length === 0) return null;

                return (
                  <optgroup key={group} label={FOLDING_MECHANISM_GROUP_LABELS[group]}>
                    {options.map((mechanism) => (
                      <option key={mechanism.code} value={mechanism.code}>
                        {mechanism.labelKa}
                      </option>
                    ))}
                  </optgroup>
                );
              })}
            </select>
            <p className="text-xs leading-5 text-quiet-ink">
              თუ ზუსტად არ იცით, დატოვეთ „არ არის მითითებული“ — არასწორ სახელს ჯობია.
            </p>
          </div>

          <div className="grid gap-2">
            <span className="text-sm font-semibold text-ink">
              ზომა გაშლილ მდგომარეობაში
            </span>
            <div className="grid gap-3 sm:grid-cols-3">
              <div className="grid gap-1.5">
                <Label htmlFor="product-unfolded-width">სიგანე (სმ)</Label>
                <Input
                  id="product-unfolded-width"
                  name="unfoldedWidthCm"
                  type="number"
                  min="0.1"
                  max="2000"
                  step="0.1"
                  defaultValue={folding?.unfoldedWidthCm ?? ""}
                  className="h-12 border-clay-border bg-white"
                />
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor="product-unfolded-length">სიგრძე (სმ)</Label>
                <Input
                  id="product-unfolded-length"
                  name="unfoldedLengthCm"
                  type="number"
                  min="0.1"
                  max="2000"
                  step="0.1"
                  defaultValue={folding?.unfoldedLengthCm ?? ""}
                  className="h-12 border-clay-border bg-white"
                />
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor="product-unfolded-height">სიმაღლე (სმ)</Label>
                <Input
                  id="product-unfolded-height"
                  name="unfoldedHeightCm"
                  type="number"
                  min="0.1"
                  max="2000"
                  step="0.1"
                  defaultValue={folding?.unfoldedHeightCm ?? ""}
                  className="h-12 border-clay-border bg-white"
                />
              </div>
            </div>
          </div>
        </div>
      ) : null}

      <div className="grid gap-2">
        <span id="product-has-storage-label" className="text-sm font-semibold text-ink">
          სათავსო
        </span>
        <div
          role="radiogroup"
          aria-labelledby="product-has-storage-label"
          className="flex flex-wrap gap-2"
        >
          {STORAGE_OPTIONS.map((option, index) => (
            <label key={option.label} className={CHOICE_CLASS}>
              <input
                // The first radio carries the id the error summary links to.
                id={index === 0 ? "product-has-storage" : undefined}
                type="radio"
                name="hasStorage"
                value={option.value}
                defaultChecked={storageValue(hasStorage) === option.value}
                className="size-4 accent-walnut"
              />
              {option.label}
            </label>
          ))}
        </div>
      </div>

      {serverError ? (
        <FieldError id="product-features-error">{serverError}</FieldError>
      ) : null}
    </fieldset>
  );
}
