import type { SupabaseClient } from "@supabase/supabase-js";

import type { FinanceInput } from "@/lib/accounting/sale-input";
import type { Database } from "@/lib/database.types";

// The product form's finance writes, used by createProduct and updateProduct in
// app/product/actions.ts. Plain functions over a Supabase client rather than part of that
// "use server" file, so they cannot be called from the browser and can be tested with a fake
// client. Both return the error rather than throwing: create and update recover from a
// failure here differently.

type Client = SupabaseClient<Database>;

// One row per product, so an upsert covers both the first save after the table existed and
// every later one.
export async function writePurchasePrice(
  supabase: Client,
  productId: string,
  purchasePrice: number | null,
) {
  const { error } = await supabase.from("product_finances").upsert(
    {
      product_id: productId,
      purchase_price: purchasePrice,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "product_id" },
  );

  return error;
}

// Keeps a used item's single sale row in step with the form: present exactly while the item
// is `sold` with a sale price entered, removed otherwise. Its unit_cost follows the current
// purchase price, because for a one-off object a corrected cost is a correction, not a new
// batch bought at a different price.
//
// Only for items that were already used before this save (`previousKind`): a product
// switched from new to used carries a history of stocked sales, which this must not touch.
export async function syncUsedSale(
  supabase: Client,
  {
    productId,
    listingKind,
    previousKind,
    listPrice,
    input,
    soldOn,
  }: {
    productId: string;
    listingKind: string;
    previousKind: string | null;
    listPrice: number;
    input: FinanceInput;
    soldOn: string | null;
  },
) {
  if (listingKind !== "used_unique") return null;
  if (previousKind !== null && previousKind !== "used_unique") return null;

  const { data: existing, error: readError } = await supabase
    .from("product_sales")
    .select("id")
    .eq("product_id", productId)
    .order("created_at", { ascending: true });

  if (readError) return readError;

  const totalPrice = input.usedSale?.totalPrice ?? null;

  if (totalPrice === null || soldOn === null) {
    if (!existing || existing.length === 0) return null;
    const { error } = await supabase
      .from("product_sales")
      .delete()
      .eq("product_id", productId);
    return error;
  }

  const row = {
    product_id: productId,
    quantity: 1,
    total_price: totalPrice,
    unit_cost: input.purchasePrice,
    list_unit_price: listPrice,
    sold_on: soldOn,
  };

  if (existing && existing.length > 0) {
    const { error } = await supabase
      .from("product_sales")
      .update(row)
      .eq("id", existing[0].id);
    return error;
  }

  const { error } = await supabase.from("product_sales").insert(row);
  return error;
}
