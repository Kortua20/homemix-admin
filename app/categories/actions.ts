"use server";

import { revalidatePath } from "next/cache";

import { createClient } from "@/lib/server";
import { createSlug, isValidSlug } from "@/lib/slug";

export type CategoryActionState = {
  status: "idle" | "error" | "success";
  message: string;
  fieldErrors?: {
    name?: string;
    slug?: string;
  };
};

const uuidPattern =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const georgianPattern = /[\u10a0-\u10ff]/;

function readCategoryFields(formData: FormData) {
  const name = String(formData.get("name") ?? "")
    .trim()
    .replace(/\s+/g, " ");
  const slug = createSlug(String(formData.get("slug") ?? ""));
  const fieldErrors: NonNullable<CategoryActionState["fieldErrors"]> = {};

  if (name.length < 2 || name.length > 80) {
    fieldErrors.name = "დასახელება უნდა შეიცავდეს 2-დან 80 სიმბოლომდე.";
  } else if (!georgianPattern.test(name)) {
    fieldErrors.name = "დასახელება შეიყვანეთ ქართულად.";
  }

  if (slug.length < 2 || slug.length > 80) {
    fieldErrors.slug = "სლაგი უნდა შეიცავდეს 2-დან 80 სიმბოლომდე.";
  } else if (!isValidSlug(slug)) {
    fieldErrors.slug =
      "გამოიყენეთ ქართული ასოები, ციფრები და დეფისი.";
  }

  return { name, slug, fieldErrors };
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
    return "ამ სახელით ან სლაგით კატეგორია უკვე არსებობს.";
  }

  if (code === "23514") {
    return "სლაგის ფორმატი არასწორია.";
  }

  if (code === "23503") {
    return "კატეგორია პროდუქტებში გამოიყენება და ჯერ ვერ წაიშლება.";
  }

  return "ოპერაცია ვერ შესრულდა. გთხოვთ, კიდევ სცადოთ.";
}

export async function createCategory(
  _previousState: CategoryActionState,
  formData: FormData,
): Promise<CategoryActionState> {
  const { name, slug, fieldErrors } = readCategoryFields(formData);

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

  const { error } = await authorization.supabase
    .from("categories")
    .insert({ name, slug });

  if (error) {
    return {
      status: "error",
      message: getDatabaseErrorMessage(error.code),
    };
  }

  revalidatePath("/categories");

  return {
    status: "success",
    message: "კატეგორია წარმატებით დაემატა.",
  };
}

export async function updateCategory(
  _previousState: CategoryActionState,
  formData: FormData,
): Promise<CategoryActionState> {
  const id = String(formData.get("id") ?? "");
  const { name, slug, fieldErrors } = readCategoryFields(formData);

  if (!uuidPattern.test(id)) {
    return { status: "error", message: "კატეგორიის ID არასწორია." };
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
    .from("categories")
    .update({ name, slug })
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
      message: "კატეგორია ვერ მოიძებნა ან მისი შეცვლის უფლება არ გაქვთ.",
    };
  }

  revalidatePath("/categories");

  return {
    status: "success",
    message: "კატეგორია წარმატებით განახლდა.",
  };
}

export async function deleteCategory(
  _previousState: CategoryActionState,
  formData: FormData,
): Promise<CategoryActionState> {
  const id = String(formData.get("id") ?? "");

  if (!uuidPattern.test(id)) {
    return { status: "error", message: "კატეგორიის ID არასწორია." };
  }

  const authorization = await getAuthorizedClient();

  if (!authorization.supabase) {
    return { status: "error", message: authorization.error };
  }

  const { data, error } = await authorization.supabase
    .from("categories")
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
      message: "კატეგორია ვერ მოიძებნა ან მისი წაშლის უფლება არ გაქვთ.",
    };
  }

  revalidatePath("/categories");

  return {
    status: "success",
    message: "კატეგორია წარმატებით წაიშალა.",
  };
}
