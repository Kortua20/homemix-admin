// The product list's filter schema and its database bindings.
//
// This is the only product-specific file in the filter system. <FilterBar>, the URL parser
// and applyFilterBindings are all driven by what is declared here — adding an orders list
// later means writing a sibling of this file, not touching any of them.

import type { ProductAttribute, ProductCategory } from "@/components/products/types";
import type { FilterOption, FilterSchema } from "@/lib/filters/types";
import {
  LISTING_KIND_LABELS,
  PRODUCT_STATUS_LABELS,
} from "@/lib/product-data";

function attributeOptions(rows: ProductAttribute[]): FilterOption[] {
  return rows.map((row) => ({
    value: row.code,
    label: row.labelKa,
    hex: row.hex,
  }));
}

// Built per request because three of the vocabularies come from the database. The static
// parts (status, listing kind) are inlined from the label maps so they cannot drift from
// what the badges show.
export function buildProductFilterSchema({
  categories,
  materials,
  colours,
  styles,
}: {
  categories: ProductCategory[];
  materials: ProductAttribute[];
  colours: ProductAttribute[];
  styles: ProductAttribute[];
}): FilterSchema {
  return [
    {
      kind: "text",
      param: "q",
      label: "პროდუქტის სახელით ძიება",
      placeholder: "პროდუქტის სახელით ძიება...",
      // The one field that stays in the always-visible bar.
      primary: true,
    },
    {
      kind: "multi",
      param: "status",
      label: "სტატუსი",
      options: (
        Object.keys(PRODUCT_STATUS_LABELS) as (keyof typeof PRODUCT_STATUS_LABELS)[]
      ).map((value) => ({ value, label: PRODUCT_STATUS_LABELS[value] })),
    },
    {
      kind: "select",
      param: "category",
      label: "კატეგორია",
      placeholder: "ყველა კატეგორია",
      options: categories.map((category) => ({
        value: category.id,
        label: category.name,
      })),
    },
    {
      kind: "select",
      param: "kind",
      label: "ტიპი",
      placeholder: "ყველა ტიპი",
      options: (
        Object.keys(LISTING_KIND_LABELS) as (keyof typeof LISTING_KIND_LABELS)[]
      ).map((value) => ({ value, label: LISTING_KIND_LABELS[value] })),
    },
    { kind: "range", param: "price", label: "ფასი", unit: "₾" },
    { kind: "range", param: "width", label: "სიგანე", unit: "სმ", max: 2000 },
    { kind: "range", param: "height", label: "სიმაღლე", unit: "სმ", max: 2000 },
    {
      kind: "multi",
      param: "materials",
      label: "მასალა",
      options: attributeOptions(materials),
    },
    {
      kind: "multi",
      param: "colours",
      label: "ფერი",
      options: attributeOptions(colours),
    },
    {
      kind: "multi",
      param: "styles",
      label: "სტილი",
      options: attributeOptions(styles),
    },
  ];
}

// The bindings (how each param reaches the database) live in lib/product-data.ts beside the
// query that uses them. Keeping them here would make this file and product-data.ts import
// each other, since the schema above needs that file's label maps.
