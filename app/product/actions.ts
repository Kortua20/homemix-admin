"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { createClient } from "@/lib/server";
import { createSlug, isValidSlug } from "@/lib/slug";

export type ProductActionState = {
  status: "idle" | "error" | "success";
  message: string;
  fieldErrors?: {
    name?: string;
    slug?: string;
    description?: string;
    price?: string;
    categoryId?: string;
  };
};

const uuidPattern =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function readProductFields(formData: FormData) {
  const name = String(formData.get("name") ?? "")
    .trim()
    .replace(/\s+/g, " ");
  const description = String(formData.get("description") ?? "").trim();
  const slug = createSlug(String(formData.get("slug") ?? ""));
  const priceValue = String(formData.get("price") ?? "").trim();
  const price = Number(priceValue);
  const categoryId = String(formData.get("categoryId") ?? "");
  const fieldErrors: NonNullable<ProductActionState["fieldErrors"]> = {};

  if (name.length < 2 || name.length > 160) {
    fieldErrors.name = "დასახელება უნდა შეიცავდეს 2-დან 160 სიმბოლომდე.";
  }

  if (slug.length < 2 || slug.length > 160) {
    fieldErrors.slug = "სლაგი უნდა შეიცავდეს 2-დან 160 სიმბოლომდე.";
  } else if (!isValidSlug(slug)) {
    fieldErrors.slug = "გამოიყენეთ ქართული ასოები, ციფრები და დეფისი.";
  }

  if (description.length > 5000) {
    fieldErrors.description = "აღწერა არ უნდა აღემატებოდეს 5000 სიმბოლოს.";
  }

  if (
    priceValue === "" ||
    !Number.isFinite(price) ||
    price < 0 ||
    price > 9_999_999_999.99
  ) {
    fieldErrors.price = "შეიყვანეთ სწორი, არაუარყოფითი ფასი.";
  }

  if (!uuidPattern.test(categoryId)) {
    fieldErrors.categoryId = "აირჩიეთ კატეგორია.";
  }

  return {
    values: { name, slug, description, price, category_id: categoryId },
    fieldErrors,
  };
}

async function getAuthorizedClient() {
  const supabase = await createClient();
  const { data, error } = await supabase.auth.getClaims();
  const isAnonymous = data?.claims?.is_anonymous === true;

  if (error || !data?.claims?.sub || isAnonymous) {
    return {
      supabase: null,
      error: "სესია დასრულებულია. გთხოვთ, თავიდან შეხვიდეთ სისტემაში.",
    };
  }

  return { supabase, error: null };
}

function getDatabaseErrorMessage(code?: string) {
  if (code === "23505") {
    return "ამ სლაგით პროდუქტი უკვე არსებობს. გთხოვთ, სლაგი შეცვალოთ.";
  }

  if (code === "23503") {
    return "არჩეული კატეგორია აღარ არსებობს.";
  }

  if (code === "23514" || code === "22003") {
    return "პროდუქტის მონაცემები დასაშვებ საზღვრებს არ შეესაბამება.";
  }

  return "ოპერაცია ვერ შესრულდა. გთხოვთ, კიდევ სცადოთ.";
}

export async function createProduct(
  _previousState: ProductActionState,
  formData: FormData,
): Promise<ProductActionState> {
  const { values, fieldErrors } = readProductFields(formData);

  if (Object.keys(fieldErrors).length > 0) {
    return {
      status: "error",
      message: "შეამოწმეთ შევსებული ველები.",
      fieldErrors,
    };
  }

  const authorization = await getAuthorizedClient();

  if (!authorization.supabase) {
    return { status: "error", message: authorization.error };
  }

  const { data, error } = await authorization.supabase
    .from("products")
    .insert(values)
    .select("slug")
    .single();

  if (error) {
    return {
      status: "error",
      message: getDatabaseErrorMessage(error.code),
    };
  }

  revalidatePath("/dashboard");
  redirect(`/product/${encodeURIComponent(data.slug)}`);
}

export async function updateProduct(
  _previousState: ProductActionState,
  formData: FormData,
): Promise<ProductActionState> {
  const id = String(formData.get("id") ?? "");
  const previousSlug = String(formData.get("previousSlug") ?? "");
  const { values, fieldErrors } = readProductFields(formData);

  if (!uuidPattern.test(id)) {
    return { status: "error", message: "პროდუქტის ID არასწორია." };
  }

  if (Object.keys(fieldErrors).length > 0) {
    return {
      status: "error",
      message: "შეამოწმეთ შევსებული ველები.",
      fieldErrors,
    };
  }

  const authorization = await getAuthorizedClient();

  if (!authorization.supabase) {
    return { status: "error", message: authorization.error };
  }

  const { data, error } = await authorization.supabase
    .from("products")
    .update({ ...values, updated_at: new Date().toISOString() })
    .eq("id", id)
    .select("id, slug")
    .maybeSingle();

  if (error) {
    return {
      status: "error",
      message: getDatabaseErrorMessage(error.code),
    };
  }

  if (!data) {
    return {
      status: "error",
      message: "პროდუქტი ვერ მოიძებნა ან მისი შეცვლის უფლება არ გაქვთ.",
    };
  }

  revalidatePath("/dashboard");
  revalidatePath(`/product/${previousSlug}`);
  revalidatePath(`/product/${data.slug}`);
  redirect(`/product/${encodeURIComponent(data.slug)}`);
}

export async function deleteProduct(
  _previousState: ProductActionState,
  formData: FormData,
): Promise<ProductActionState> {
  const id = String(formData.get("id") ?? "");
  const redirectAfterDelete =
    String(formData.get("redirectAfterDelete") ?? "") === "true";

  if (!uuidPattern.test(id)) {
    return { status: "error", message: "პროდუქტის ID არასწორია." };
  }

  const authorization = await getAuthorizedClient();

  if (!authorization.supabase) {
    return { status: "error", message: authorization.error };
  }

  const { data, error } = await authorization.supabase
    .from("products")
    .delete()
    .eq("id", id)
    .select("id")
    .maybeSingle();

  if (error) {
    return {
      status: "error",
      message: getDatabaseErrorMessage(error.code),
    };
  }

  if (!data) {
    return {
      status: "error",
      message: "პროდუქტი ვერ მოიძებნა ან მისი წაშლის უფლება არ გაქვთ.",
    };
  }

  revalidatePath("/dashboard");

  if (redirectAfterDelete) {
    redirect("/dashboard");
  }

  return {
    status: "success",
    message: "პროდუქტი წარმატებით წაიშალა.",
  };
}
