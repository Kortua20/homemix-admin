"use server";

import { revalidatePath } from "next/cache";

import { readOptionalMoney, validateSaleDate } from "@/lib/accounting/sale-input";
import { createClient } from "@/lib/server";
import { isValidSlug } from "@/lib/slug";

// Recording and undoing the sale of a NEW (stocked) item. Both go through a database
// function (record_product_sale / delete_product_sale in the storefront's
// schemas/10_product_finances.sql) so the sale row and the stock change happen together or
// not at all.
//
// Used items are not sold here: a used item's single sale is entered in the product form by
// setting its status to `sold` (syncUsedSale in ./actions.ts).

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
  if (message?.includes("not_stocked_product")) {
    return "მეორადი ნივთის გაყიდვა ფორმიდან, სტატუსით „გაყიდული“ ფიქსირდება.";
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

export async function recordProductSale(
  _previousState: SaleActionState,
  formData: FormData,
): Promise<SaleActionState> {
  const productId = String(formData.get("productId") ?? "");
  const slug = String(formData.get("slug") ?? "");
  const quantityValue = String(formData.get("quantity") ?? "").trim();
  const quantity = Number(quantityValue);
  const totalPrice = readOptionalMoney(formData.get("totalPrice"));
  const soldOn = String(formData.get("soldOn") ?? "").trim();
  const note = String(formData.get("note") ?? "").trim();
  const fieldErrors: NonNullable<SaleActionState["fieldErrors"]> = {};

  if (!uuidPattern.test(productId)) {
    return { status: "error", message: "პროდუქტის ID არასწორია." };
  }

  if (!Number.isInteger(quantity) || quantity < 1 || quantity > 1_000_000) {
    fieldErrors.quantity = "შეიყვანეთ რაოდენობა (1 ან მეტი).";
  }

  // Required here, unlike the purchase price: a sale with no amount is not a sale the books
  // can use. A free give-away is recorded as 0.
  if (totalPrice === null || totalPrice === undefined) {
    fieldErrors.totalPrice = "შეიყვანეთ გადახდილი თანხა (0 ან მეტი).";
  }

  const dateError = soldOn ? validateSaleDate(soldOn) : "მიუთითეთ გაყიდვის თარიღი.";
  if (dateError) fieldErrors.soldOn = dateError;

  if (note.length > 500) {
    fieldErrors.note = "შენიშვნა არ უნდა აღემატებოდეს 500 სიმბოლოს.";
  }

  if (Object.keys(fieldErrors).length > 0) {
    return { status: "error", message: "შეამოწმეთ შევსებული ველები.", fieldErrors };
  }

  const supabase = await getStaffClient();
  if (!supabase) return { status: "error", message: SESSION_EXPIRED };

  const { error } = await supabase.rpc("record_product_sale", {
    p_product_id: productId,
    p_quantity: quantity,
    p_total_price: totalPrice as number,
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
    message: `გაყიდვა დაფიქსირდა: ${quantity} ცალი, ${(totalPrice as number).toFixed(2)} ₾. მარაგი შემცირდა.`,
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
    message: "გაყიდვა გაუქმდა — ნივთები მარაგში დაბრუნდა.",
  };
}
