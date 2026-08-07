"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import {
  MAX_CATEGORY_IMAGE_SIZE,
  isAllowedCategoryImage,
} from "@/lib/category-image-constraints";
import { deleteR2Objects, uploadCategoryImage } from "@/lib/r2";
import { createClient } from "@/lib/server";
import { createSlug, isValidSlug } from "@/lib/slug";

export type CategoryActionState = {
  status: "idle" | "error" | "success";
  message: string;
  fieldErrors?: {
    name?: string;
    slug?: string;
    description?: string;
    images?: string;
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
  const description = String(formData.get("description") ?? "").trim();
  const fieldErrors: NonNullable<CategoryActionState["fieldErrors"]> = {};

  if (name.length < 2 || name.length > 80) {
    fieldErrors.name = "დასახელება უნდა შეიცავდეს 2-დან 80 სიმბოლომდე.";
  } else if (!georgianPattern.test(name)) {
    fieldErrors.name = "დასახელება შეიყვანეთ ქართულად.";
  }

  if (slug.length < 2 || slug.length > 80) {
    fieldErrors.slug = "სლაგი უნდა შეიცავდეს 2-დან 80 სიმბოლომდე.";
  } else if (!isValidSlug(slug)) {
    fieldErrors.slug = "გამოიყენეთ ქართული ასოები, ციფრები და დეფისი.";
  }

  if (description.length > 5000) {
    fieldErrors.description =
      "აღწერა არ უნდა აღემატებოდეს 5000 სიმბოლოს.";
  }

  return { values: { name, slug, description }, fieldErrors };
}

function readCategoryImageFiles(formData: FormData) {
  const files = formData
    .getAll("images")
    .filter((entry): entry is File => entry instanceof File && entry.size > 0);
  let error: string | undefined;

  if (files.some((file) => !isAllowedCategoryImage(file))) {
    error = "დაშვებულია მხოლოდ JPG, PNG და WebP ფორმატის ფოტოები.";
  } else if (files.some((file) => file.size > MAX_CATEGORY_IMAGE_SIZE)) {
    error = "თითოეული ფოტო არ უნდა აღემატებოდეს 5 მბ-ს.";
  }

  return { files, error };
}

function readDeletedImageIds(formData: FormData) {
  const ids = formData.getAll("deleteImageIds").map(String).filter(Boolean);
  const hasInvalidId = ids.some((id) => !uuidPattern.test(id));

  return {
    ids: [...new Set(ids)],
    error: hasInvalidId
      ? "წასაშლელი ფოტოს მონაცემები არასწორია."
      : undefined,
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

type UploadedImage = Awaited<ReturnType<typeof uploadCategoryImage>>;

async function uploadImages(
  categoryId: string,
  files: File[],
  startSortOrder: number,
) {
  const uploaded: UploadedImage[] = [];

  try {
    for (const file of files) {
      uploaded.push(await uploadCategoryImage(categoryId, file));
    }
  } catch (error) {
    await deleteR2Objects(uploaded.map((image) => image.objectKey)).catch(
      () => undefined,
    );
    throw error;
  }

  return uploaded.map((image, index) => ({
    category_id: categoryId,
    object_key: image.objectKey,
    original_name: image.originalName,
    content_type: image.contentType,
    size_bytes: image.sizeBytes,
    sort_order: startSortOrder + index,
  }));
}

function getDatabaseErrorMessage(code?: string) {
  if (code === "23505") {
    return "ამ სახელით ან სლაგით კატალოგი უკვე არსებობს.";
  }

  if (code === "23514" || code === "22003") {
    return "კატალოგის მონაცემები დასაშვებ საზღვრებს არ შეესაბამება.";
  }

  if (code === "23503") {
    return "კატალოგი პროდუქტებში გამოიყენება და ჯერ ვერ წაიშლება.";
  }

  return "ოპერაცია ვერ შესრულდა. გთხოვთ, კიდევ სცადოთ.";
}

export async function createCategory(
  _previousState: CategoryActionState,
  formData: FormData,
): Promise<CategoryActionState> {
  const { values, fieldErrors } = readCategoryFields(formData);
  const imageFiles = readCategoryImageFiles(formData);

  if (imageFiles.error) {
    fieldErrors.images = imageFiles.error;
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
    .insert(values)
    .select("id, slug")
    .single();

  if (error) {
    return {
      status: "error",
      message: getDatabaseErrorMessage(error.code),
    };
  }

  let imageRows: Awaited<ReturnType<typeof uploadImages>> = [];

  try {
    imageRows = await uploadImages(data.id, imageFiles.files, 0);

    if (imageRows.length > 0) {
      const { error: imageError } = await authorization.supabase
        .from("category_images")
        .insert(imageRows);

      if (imageError) {
        throw imageError;
      }
    }
  } catch {
    await deleteR2Objects(imageRows.map((image) => image.object_key)).catch(
      () => undefined,
    );
    await authorization.supabase.from("categories").delete().eq("id", data.id);

    return {
      status: "error",
      message: "კატალოგის ფოტოები ვერ აიტვირთა. გთხოვთ, კიდევ სცადოთ.",
      fieldErrors: {
        images: "ფოტოების ატვირთვა ვერ დასრულდა.",
      },
    };
  }

  revalidatePath("/categories");
  redirect(`/category/${encodeURIComponent(data.slug)}`);
}

export async function updateCategory(
  _previousState: CategoryActionState,
  formData: FormData,
): Promise<CategoryActionState> {
  const id = String(formData.get("id") ?? "");
  const previousSlug = String(formData.get("previousSlug") ?? "");
  const { values, fieldErrors } = readCategoryFields(formData);
  const imageFiles = readCategoryImageFiles(formData);
  const deletedImages = readDeletedImageIds(formData);

  if (imageFiles.error || deletedImages.error) {
    fieldErrors.images = imageFiles.error || deletedImages.error;
  }

  if (!uuidPattern.test(id)) {
    return { status: "error", message: "კატალოგის ID არასწორია." };
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

  const { data: currentImages, error: currentImagesError } =
    await authorization.supabase
      .from("category_images")
      .select("id, object_key, sort_order")
      .eq("category_id", id)
      .order("sort_order");

  if (currentImagesError) {
    return {
      status: "error",
      message: "არსებული ფოტოები ვერ შემოწმდა. გთხოვთ, კიდევ სცადოთ.",
    };
  }

  const deletedImageIdSet = new Set(deletedImages.ids);
  const imagesToDelete = (currentImages ?? []).filter((image) =>
    deletedImageIdSet.has(image.id),
  );
  const nextSortOrder =
    (currentImages ?? []).reduce(
      (maximum, image) => Math.max(maximum, image.sort_order),
      -1,
    ) + 1;
  let newImageRows: Awaited<ReturnType<typeof uploadImages>> = [];

  try {
    newImageRows = await uploadImages(id, imageFiles.files, nextSortOrder);
  } catch {
    return {
      status: "error",
      message: "ახალი ფოტოები ვერ აიტვირთა. გთხოვთ, კიდევ სცადოთ.",
      fieldErrors: { images: "ფოტოების ატვირთვა ვერ დასრულდა." },
    };
  }

  const { data, error } = await authorization.supabase
    .from("categories")
    .update(values)
    .eq("id", id)
    .select("id, slug")
    .maybeSingle();

  if (error) {
    await deleteR2Objects(newImageRows.map((image) => image.object_key)).catch(
      () => undefined,
    );

    return {
      status: "error",
      message: getDatabaseErrorMessage(error.code),
    };
  }

  if (!data) {
    await deleteR2Objects(newImageRows.map((image) => image.object_key)).catch(
      () => undefined,
    );

    return {
      status: "error",
      message: "კატალოგი ვერ მოიძებნა ან მისი შეცვლის უფლება არ გაქვთ.",
    };
  }

  if (newImageRows.length > 0) {
    const { error: insertImagesError } = await authorization.supabase
      .from("category_images")
      .insert(newImageRows);

    if (insertImagesError) {
      await deleteR2Objects(
        newImageRows.map((image) => image.object_key),
      ).catch(() => undefined);

      return {
        status: "error",
        message:
          "კატალოგი განახლდა, მაგრამ ახალი ფოტოები ვერ დაემატა.",
        fieldErrors: { images: "ფოტოების დამატება ვერ დასრულდა." },
      };
    }
  }

  if (imagesToDelete.length > 0) {
    const { error: deleteImagesError } = await authorization.supabase
      .from("category_images")
      .delete()
      .eq("category_id", id)
      .in(
        "id",
        imagesToDelete.map((image) => image.id),
      );

    if (deleteImagesError) {
      return {
        status: "error",
        message:
          "კატალოგი განახლდა, მაგრამ მონიშნული ფოტოები ვერ წაიშალა.",
        fieldErrors: { images: "ფოტოების წაშლა ვერ დასრულდა." },
      };
    }

    await deleteR2Objects(
      imagesToDelete.map((image) => image.object_key),
    ).catch((cleanupError) => {
      console.error("R2 category image cleanup failed", cleanupError);
    });
  }

  revalidatePath("/categories");
  revalidatePath(`/category/${previousSlug}`);
  revalidatePath(`/category/${data.slug}`);
  redirect(`/category/${encodeURIComponent(data.slug)}`);
}

export async function deleteCategory(
  _previousState: CategoryActionState,
  formData: FormData,
): Promise<CategoryActionState> {
  const id = String(formData.get("id") ?? "");
  const redirectAfterDelete =
    String(formData.get("redirectAfterDelete") ?? "") === "true";

  if (!uuidPattern.test(id)) {
    return { status: "error", message: "კატალოგის ID არასწორია." };
  }

  const authorization = await getAuthorizedClient();

  if (!authorization.supabase) {
    return { status: "error", message: authorization.error };
  }

  const { data: categoryImages, error: categoryImagesError } =
    await authorization.supabase
      .from("category_images")
      .select("object_key")
      .eq("category_id", id);

  if (categoryImagesError) {
    return {
      status: "error",
      message: "კატალოგის ფოტოები ვერ შემოწმდა. გთხოვთ, კიდევ სცადოთ.",
    };
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
      message: "კატალოგი ვერ მოიძებნა ან მისი წაშლის უფლება არ გაქვთ.",
    };
  }

  await deleteR2Objects(
    (categoryImages ?? []).map((image) => image.object_key),
  ).catch((cleanupError) => {
    console.error("R2 category cleanup failed", cleanupError);
  });

  revalidatePath("/categories");

  if (redirectAfterDelete) {
    redirect("/categories");
  }

  return {
    status: "success",
    message: "კატალოგი წარმატებით წაიშალა.",
  };
}
