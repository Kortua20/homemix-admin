"use server";

import { revalidatePath } from "next/cache";

import { readOptionalMoney, validateSaleDate } from "@/lib/accounting/sale-input";
import { createClient } from "@/lib/server";
import { isValidSlug } from "@/lib/slug";

// Recording and undoing sales from the product page ("გაყიდვის დაფიქსირება"). Each goes
// through a database function in the storefront's schemas/10_product_finances.sql, so the
// sale row and what it changes on the product happen together or not at all:
//
//   * recordProductSale — a NEW item: units off the stock (record_product_sale);
//   * recordUsedSale    — a USED item: marked sold (record_used_sale);
//   * deleteProductSale — undoes either (delete_product_sale).
//
// A used item can also be marked sold in the product form (syncUsedSale in ./actions.ts),
// which is where an item sold before sales were recorded gets its price.

export type SaleActionState = {
  status: "idle" | "error" | "success";
  message: string;
  fieldErrors?: {
    quantity?: string;
    totalPrice?: string;
    soldOn?: string;
    note?: string;
  };
};

const uuidPattern =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

// Same check as getAuthorizedClient in ./actions.ts, repeated rather than imported: every
// export of a "use server" file is callable from the browser, so that helper stays private.
async function getStaffClient() {
  const supabase = await createClient();
  const { data, error } = await supabase.auth.getClaims();

  if (error || !data?.claims?.sub || data.claims.is_anonymous === true) {
    return null;
  }

  return supabase;
}

const SESSION_EXPIRED = "სესია დასრულებულია. გთხოვთ, თავიდან შეხვიდეთ სისტემაში.";

// The database function raises these by name. Anything else is unexpected and gets the
// generic message — its detail goes to the server log, not to the screen.
function getSaleErrorMessage(message: string | undefined) {
  if (message?.includes("insufficient_stock")) {
    return "მარაგში ამდენი ცალი არ არის. განაახლეთ გვერდი — შესაძლოა მარაგი შეიცვალა.";
  }
  if (message?.includes("not_stocked_product") || message?.includes("not_used_product")) {
    return "პროდუქტის ტიპი შეიცვალა. განაახლეთ გვერდი და თავიდან სცადეთ.";
  }
  if (message?.includes("already_sold")) {
    return "ეს ნივთი უკვე გაყიდულია. განაახლეთ გვერდი.";
  }
  if (message?.includes("not_sellable")) {
    return "დაარქივებული პროდუქტის გაყიდვა შეუძლებელია.";
  }
  if (message?.includes("product_not_found") || message?.includes("sale_not_found")) {
    return "ჩანაწერი ვერ მოიძებნა ან მისი შეცვლის უფლება არ გაქვთ.";
  }
  return "ოპერაცია ვერ შესრულდა. გთხოვთ, კიდევ სცადოთ.";
}

function revalidateSalePaths(slug: string) {
  revalidatePath("/dashboard");
  revalidatePath("/accounting");
  if (isValidSlug(slug)) revalidatePath(`/product/${slug}`);
}

// The fields every sale has: what was paid in total, when, and an optional note. Required
// here, unlike the purchase price: a sale with no amount is not a sale the books can use. A
// free give-away is recorded as 0.
function readSaleFields(formData: FormData) {
  const totalPrice = readOptionalMoney(formData.get("totalPrice"));
  const soldOn = String(formData.get("soldOn") ?? "").trim();
  const note = String(formData.get("note") ?? "").trim();
  const fieldErrors: NonNullable<SaleActionState["fieldErrors"]> = {};

  if (totalPrice === null || totalPrice === undefined) {
    fieldErrors.totalPrice = "შეიყვანეთ გადახდილი თანხა (0 ან მეტი).";
  }

  const dateError = soldOn ? validateSaleDate(soldOn) : "მიუთითეთ გაყიდვის თარიღი.";
  if (dateError) fieldErrors.soldOn = dateError;

  if (note.length > 500) {
    fieldErrors.note = "შენიშვნა არ უნდა აღემატებოდეს 500 სიმბოლოს.";
  }

  return { totalPrice: totalPrice ?? 0, soldOn, note, fieldErrors };
}

const CHECK_FIELDS = "შეამოწმეთ შევსებული ველები.";

export async function recordProductSale(
  _previousState: SaleActionState,
  formData: FormData,
): Promise<SaleActionState> {
  const productId = String(formData.get("productId") ?? "");
  const slug = String(formData.get("slug") ?? "");
  const quantity = Number(String(formData.get("quantity") ?? "").trim());
  const { totalPrice, soldOn, note, fieldErrors } = readSaleFields(formData);

  if (!uuidPattern.test(productId)) {
    return { status: "error", message: "პროდუქტის ID არასწორია." };
  }

  if (!Number.isInteger(quantity) || quantity < 1 || quantity > 1_000_000) {
    fieldErrors.quantity = "შეიყვანეთ რაოდენობა (1 ან მეტი).";
  }

  if (Object.keys(fieldErrors).length > 0) {
    return { status: "error", message: CHECK_FIELDS, fieldErrors };
  }

  const supabase = await getStaffClient();
  if (!supabase) return { status: "error", message: SESSION_EXPIRED };

  const { error } = await supabase.rpc("record_product_sale", {
    p_product_id: productId,
    p_quantity: quantity,
    p_total_price: totalPrice,
    p_sold_on: soldOn,
    p_note: note || undefined,
  });

  if (error) {
    console.error("record_product_sale failed", error);
    return { status: "error", message: getSaleErrorMessage(error.message) };
  }

  revalidateSalePaths(slug);

  return {
    status: "success",
    message: `გაყიდვა დაფიქსირდა: ${quantity} ცალი, ${totalPrice.toFixed(2)} ₾. მარაგი შემცირდა.`,
  };
}

export async function recordUsedSale(
  _previousState: SaleActionState,
  formData: FormData,
): Promise<SaleActionState> {
  const productId = String(formData.get("productId") ?? "");
  const slug = String(formData.get("slug") ?? "");
  const { totalPrice, soldOn, note, fieldErrors } = readSaleFields(formData);

  if (!uuidPattern.test(productId)) {
    return { status: "error", message: "პროდუქტის ID არასწორია." };
  }

  if (Object.keys(fieldErrors).length > 0) {
    return { status: "error", message: CHECK_FIELDS, fieldErrors };
  }

  const supabase = await getStaffClient();
  if (!supabase) return { status: "error", message: SESSION_EXPIRED };

  const { error } = await supabase.rpc("record_used_sale", {
    p_product_id: productId,
    p_total_price: totalPrice,
    p_sold_on: soldOn,
    p_note: note || undefined,
  });

  if (error) {
    console.error("record_used_sale failed", error);
    return { status: "error", message: getSaleErrorMessage(error.message) };
  }

  revalidateSalePaths(slug);

  return {
    status: "success",
    message: `გაყიდვა დაფიქსირდა: ${totalPrice.toFixed(2)} ₾. ნივთი მონიშნულია გაყიდულად.`,
  };
}

export async function deleteProductSale(
  _previousState: SaleActionState,
  formData: FormData,
): Promise<SaleActionState> {
  const saleId = String(formData.get("saleId") ?? "");
  const slug = String(formData.get("slug") ?? "");

  if (!uuidPattern.test(saleId)) {
    return { status: "error", message: "გაყიდვის ID არასწორია." };
  }

  const supabase = await getStaffClient();
  if (!supabase) return { status: "error", message: SESSION_EXPIRED };

  const { error } = await supabase.rpc("delete_product_sale", { p_sale_id: saleId });

  if (error) {
    console.error("delete_product_sale failed", error);
    return { status: "error", message: getSaleErrorMessage(error.message) };
  }

  revalidateSalePaths(slug);

  return {
    status: "success",
    message: "გაყიდვა გაუქმდა.",
  };
}
