"use client";

import { Sparkles } from "lucide-react";

import type {
  AttributeKind,
  AttributeSelection,
  ProductAttribute,
} from "@/components/products/types";
import { cn } from "@/lib/utils";

// Checkbox groups rather than a multi-select listbox: the vocabularies are small (17/13/7),
// every option fits on screen, and a native multi-select requires ctrl-clicking to add a
// second value — which is the single most commonly misunderstood control on the web.
//
// Controlled: the selection lives in ProductForm because AI suggestions (see
// product-ai-assist.tsx) add to it from outside this component. Each checkbox still submits
// under its own name, so the server action reads exactly what it always has.
//
// A suggested option carries a sparkle. Ticked, it means "the AI agrees"; unticked (dashed
// border), it means "possible, but not confident enough to tick for you" — one click accepts
// it. Suggestions never untick anything.

function AttributeGroup({
  legend,
  name,
  options,
  selected,
  suggested,
  onToggle,
  withSwatch = false,
}: {
  legend: string;
  name: string;
  options: ProductAttribute[];
  selected: string[];
  suggested: string[];
  onToggle: (code: string) => void;
  withSwatch?: boolean;
}) {
  if (options.length === 0) return null;

  const selectedSet = new Set(selected);
  const suggestedSet = new Set(suggested);

  return (
    <fieldset className="grid gap-2">
      <legend className="text-sm font-semibold text-ink">{legend}</legend>
      <div className="flex flex-wrap gap-2">
        {options.map((option) => {
          const isChecked = selectedSet.has(option.code);
          const isSuggested = suggestedSet.has(option.code);

          return (
            <label
              key={option.code}
              title={isSuggested ? "AI-ს შემოთავაზება" : undefined}
              className={cn(
                "inline-flex cursor-pointer items-center gap-2 rounded-full border border-clay-border bg-white px-3 py-1.5 text-sm text-ink transition-colors hover:border-walnut has-[:checked]:border-walnut has-[:checked]:bg-[#f9f3ef] has-[:checked]:font-semibold",
                isSuggested && !isChecked && "border-dashed border-walnut",
              )}
            >
              <input
                type="checkbox"
                name={name}
                value={option.code}
                checked={isChecked}
                onChange={() => onToggle(option.code)}
                className="size-4 accent-walnut"
              />
              {withSwatch && option.hex ? (
                <span
                  aria-hidden="true"
                  className="size-3 shrink-0 rounded-full border border-[#00000022]"
                  style={{ backgroundColor: option.hex }}
                />
              ) : null}
              {option.labelKa}
              {isSuggested ? (
                <>
                  <Sparkles aria-hidden="true" className="size-3 text-walnut" />
                  <span className="sr-only"> — AI-ს შემოთავაზება</span>
                </>
              ) : null}
            </label>
          );
        })}
      </div>
    </fieldset>
  );
}

const NO_SUGGESTIONS: AttributeSelection = {
  materials: [],
  colours: [],
  styles: [],
};

export function ProductAttributeFields({
  materials,
  colours,
  styles,
  selection,
  suggested = NO_SUGGESTIONS,
  onToggle,
  serverError,
}: {
  materials: ProductAttribute[];
  colours: ProductAttribute[];
  styles: ProductAttribute[];
  selection: AttributeSelection;
  suggested?: AttributeSelection;
  onToggle: (kind: AttributeKind, code: string) => void;
  serverError?: string;
}) {
  return (
    <section
      id="product-attributes"
      // Focusable as a jump target for the AI result links in product-ai-assist.tsx.
      tabIndex={-1}
      aria-labelledby="product-attributes-heading"
      className="grid gap-5 rounded-2xl border border-hairline p-4 outline-none lg:col-span-2 lg:p-5"
    >
      <div>
        <h3
          id="product-attributes-heading"
          className="text-base font-semibold text-ink"
        >
          მასალა, ფერი და სტილი
        </h3>
        <p className="mt-1 text-xs leading-5 text-quiet-ink">
          სურვილისამებრ. ეს ველები მყიდველს ეხმარება მოძებნოს ზუსტად ის, რაც
          სჭირდება.
        </p>
      </div>

      <AttributeGroup
        legend="მასალა"
        name="materialCodes"
        options={materials}
        selected={selection.materials}
        suggested={suggested.materials}
        onToggle={(code) => onToggle("materials", code)}
      />
      <AttributeGroup
        legend="ფერი"
        name="colourCodes"
        options={colours}
        selected={selection.colours}
        suggested={suggested.colours}
        onToggle={(code) => onToggle("colours", code)}
        withSwatch
      />
      <AttributeGroup
        legend="სტილი"
        name="styleCodes"
        options={styles}
        selected={selection.styles}
        suggested={suggested.styles}
        onToggle={(code) => onToggle("styles", code)}
      />

      {serverError ? (
        <p className="text-xs font-medium text-destructive">{serverError}</p>
      ) : null}
    </section>
  );
}
