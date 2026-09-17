"use client";

import type { ProductAttribute } from "@/components/products/types";

// Checkbox groups rather than a multi-select listbox: the vocabularies are small (17/13/7),
// every option fits on screen, and a native multi-select requires ctrl-clicking to add a
// second value — which is the single most commonly misunderstood control on the web.
//
// Uncontrolled: each checkbox carries its own `defaultChecked` and the form reads the
// values on submit. There is no cross-field behaviour here that would justify holding this
// in React state.

function AttributeGroup({
  legend,
  name,
  options,
  selected,
  withSwatch = false,
}: {
  legend: string;
  name: string;
  options: ProductAttribute[];
  selected: string[];
  withSwatch?: boolean;
}) {
  if (options.length === 0) return null;

  const selectedSet = new Set(selected);

  return (
    <fieldset className="grid gap-2">
      <legend className="text-sm font-semibold text-ink">{legend}</legend>
      <div className="flex flex-wrap gap-2">
        {options.map((option) => (
          <label
            key={option.code}
            className="inline-flex cursor-pointer items-center gap-2 rounded-full border border-clay-border bg-white px-3 py-1.5 text-sm text-ink transition-colors hover:border-walnut has-[:checked]:border-walnut has-[:checked]:bg-[#f9f3ef] has-[:checked]:font-semibold"
          >
            <input
              type="checkbox"
              name={name}
              value={option.code}
              defaultChecked={selectedSet.has(option.code)}
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
          </label>
        ))}
      </div>
    </fieldset>
  );
}

export function ProductAttributeFields({
  materials,
  colours,
  styles,
  selectedMaterials = [],
  selectedColours = [],
  selectedStyles = [],
  serverError,
}: {
  materials: ProductAttribute[];
  colours: ProductAttribute[];
  styles: ProductAttribute[];
  selectedMaterials?: string[];
  selectedColours?: string[];
  selectedStyles?: string[];
  serverError?: string;
}) {
  return (
    <section
      aria-labelledby="product-attributes-heading"
      className="grid gap-5 rounded-2xl border border-hairline p-4 lg:col-span-2 lg:p-5"
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
        selected={selectedMaterials}
      />
      <AttributeGroup
        legend="ფერი"
        name="colourCodes"
        options={colours}
        selected={selectedColours}
        withSwatch
      />
      <AttributeGroup
        legend="სტილი"
        name="styleCodes"
        options={styles}
        selected={selectedStyles}
      />

      {serverError ? (
        <p className="text-xs font-medium text-destructive">{serverError}</p>
      ) : null}
    </section>
  );
}
