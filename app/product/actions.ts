"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import {
  MAX_PRODUCT_IMAGES,
  MAX_PRODUCT_IMAGE_SIZE,
  isAllowedProductImage,
} from "@/lib/product-image-constraints";
import { deleteR2Objects, uploadProductImage } from "@/lib/r2";
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
    images?: string;
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
    fieldErrors.categoryId = "აირჩიეთ კატალოგი.";
  }

  return {
    values: { name, slug, description, price, category_id: categoryId },
    fieldErrors,
  };
}

function readProductImageFiles(formData: FormData) {
  const files = formData
    .getAll("images")
    .filter((entry): entry is File => entry instanceof File && entry.size > 0);
  let error: string | undefined;

  if (files.length > MAX_PRODUCT_IMAGES) {
    error = `შეგიძლიათ დაამატოთ მაქსიმუმ ${MAX_PRODUCT_IMAGES} ფოტო.`;
  } else if (files.some((file) => !isAllowedProductImage(file))) {
    error = "დაშვებულია მხოლოდ JPG, PNG და WebP ფორმატის ფოტოები.";
  } else if (files.some((file) => file.size > MAX_PRODUCT_IMAGE_SIZE)) {
    error = "თითოეული ფოტო არ უნდა აღემატებოდეს 5 მბ-ს.";
  }

  return { files, error };
}

function readDeletedImageIds(formData: FormData) {
  const ids = formData.getAll("deleteImageIds").map(String).filter(Boolean);
  const hasInvalidId = ids.some((id) => !uuidPattern.test(id));

  return {
    ids: [...new Set(ids)],
    error: hasInvalidId ? "წასაშლელი ფოტოს მონაცემები არასწორია." : undefined,
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

type UploadedImage = Awaited<ReturnType<typeof uploadProductImage>>;

async function uploadImages(
  productId: string,
  files: File[],
  startSortOrder: number,
) {
  const uploaded: UploadedImage[] = [];

  try {
    for (const file of files) {
      uploaded.push(await uploadProductImage(productId, file));
    }
  } catch (error) {
    await deleteR2Objects(uploaded.map((image) => image.objectKey)).catch(
      () => undefined,
    );
    throw error;
  }

  return uploaded.map((image, index) => ({
    product_id: productId,
    object_key: image.objectKey,
    original_name: image.originalName,
    content_type: image.contentType,
    size_bytes: image.sizeBytes,
    sort_order: startSortOrder + index,
  }));
}

function getDatabaseErrorMessage(code?: string) {
  if (code === "23505") {
    return "ამ სლაგით პროდუქტი უკვე არსებობს. გთხოვთ, სლაგი შეცვალოთ.";
  }

  if (code === "23503") {
    return "არჩეული კატალოგი აღარ არსებობს.";
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
  const imageFiles = readProductImageFiles(formData);

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
    .from("products")
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
        .from("product_images")
        .insert(imageRows);

      if (imageError) {
        throw imageError;
      }
    }
  } catch {
    await deleteR2Objects(imageRows.map((image) => image.object_key)).catch(
      () => undefined,
    );
    await authorization.supabase.from("products").delete().eq("id", data.id);

    return {
      status: "error",
      message: "პროდუქტის ფოტოები ვერ აიტვირთა. გთხოვთ, კიდევ სცადოთ.",
      fieldErrors: {
        images: "ფოტოების ატვირთვა ვერ დასრულდა.",
      },
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
  const imageFiles = readProductImageFiles(formData);
  const deletedImages = readDeletedImageIds(formData);

  if (imageFiles.error || deletedImages.error) {
    fieldErrors.images = imageFiles.error || deletedImages.error;
  }

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

  const { data: currentImages, error: currentImagesError } =
    await authorization.supabase
      .from("product_images")
      .select("id, object_key, sort_order")
      .eq("product_id", id)
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
  const remainingImageCount =
    (currentImages?.length ?? 0) - imagesToDelete.length;

  if (remainingImageCount + imageFiles.files.length > MAX_PRODUCT_IMAGES) {
    return {
      status: "error",
      message: "შეამოწმეთ შევსებული ველები.",
      fieldErrors: {
        images: `პროდუქტს შეიძლება ჰქონდეს მაქსიმუმ ${MAX_PRODUCT_IMAGES} ფოტო.`,
      },
    };
  }

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
    .from("products")
    .update({ ...values, updated_at: new Date().toISOString() })
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
      message: "პროდუქტი ვერ მოიძებნა ან მისი შეცვლის უფლება არ გაქვთ.",
    };
  }

  if (newImageRows.length > 0) {
    const { error: insertImagesError } = await authorization.supabase
      .from("product_images")
      .insert(newImageRows);

    if (insertImagesError) {
      await deleteR2Objects(
        newImageRows.map((image) => image.object_key),
      ).catch(() => undefined);

      return {
        status: "error",
        message: "პროდუქტი განახლდა, მაგრამ ახალი ფოტოები ვერ დაემატა.",
        fieldErrors: { images: "ფოტოების დამატება ვერ დასრულდა." },
      };
    }
  }

  if (imagesToDelete.length > 0) {
    const { error: deleteImagesError } = await authorization.supabase
      .from("product_images")
      .delete()
      .eq("product_id", id)
      .in(
        "id",
        imagesToDelete.map((image) => image.id),
      );

    if (deleteImagesError) {
      return {
        status: "error",
        message: "პროდუქტი განახლდა, მაგრამ მონიშნული ფოტოები ვერ წაიშალა.",
        fieldErrors: { images: "ფოტოების წაშლა ვერ დასრულდა." },
      };
    }

    await deleteR2Objects(
      imagesToDelete.map((image) => image.object_key),
    ).catch((cleanupError) => {
      console.error("R2 image cleanup failed", cleanupError);
    });
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

  const { data: productImages, error: productImagesError } =
    await authorization.supabase
      .from("product_images")
      .select("object_key")
      .eq("product_id", id);

  if (productImagesError) {
    return {
      status: "error",
      message: "პროდუქტის ფოტოები ვერ შემოწმდა. გთხოვთ, კიდევ სცადოთ.",
    };
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

  await deleteR2Objects(
    (productImages ?? []).map((image) => image.object_key),
  ).catch((cleanupError) => {
    console.error("R2 product cleanup failed", cleanupError);
  });

  revalidatePath("/dashboard");

  if (redirectAfterDelete) {
    redirect("/dashboard");
  }

  return {
    status: "success",
    message: "პროდუქტი წარმატებით წაიშალა.",
  };
}
