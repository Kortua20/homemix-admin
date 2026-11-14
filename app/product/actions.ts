"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import {
  MAX_PRODUCT_IMAGES,
  MAX_PRODUCT_IMAGE_SIZE,
  MAX_PRODUCT_IMAGE_UPLOAD_TOTAL,
  isAllowedProductImage,
} from "@/lib/product-image-constraints";
import { syncUsedSale, writePurchasePrice } from "@/lib/accounting/finance-writes";
import {
  readFinanceFields,
  resolveUsedSale,
  statusTransitionError,
} from "@/lib/accounting/sale-input";
import { isFlawSeverity, isFlawType } from "@/lib/flaw-data";
import { deleteR2Objects, uploadProductImage } from "@/lib/r2";
import { createClient } from "@/lib/server";
import { createSlug, isValidSlug } from "@/lib/slug";

// The aspect vocabulary is read from the database rather than hard-coded, so adding an
// aspect row does not require a code change. Falls back to an empty list, which writes no
// aspect ratings rather than failing the whole save.
async function getAspectCodes(
  supabase: Awaited<ReturnType<typeof createClient>>,
) {
  const { data } = await supabase.from("condition_aspects").select("code");
  return (data ?? []).map((row) => String(row.code));
}

export type ProductActionState = {
  status: "idle" | "error" | "success";
  message: string;
  fieldErrors?: {
    name?: string;
    slug?: string;
    description?: string;
    price?: string;
    compareAtPrice?: string;
    categoryId?: string;
    images?: string;
    listingKind?: string;
    productStatus?: string;
    conditionGrade?: string;
    conditionSummary?: string;
    stockQuantity?: string;
    flaws?: string;
    dimensions?: string;
    features?: string;
    attributes?: string;
    finances?: string;
  };
};

const uuidPattern =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

// Mirrors products_listing_kind_check / products_status_check. The database is the
// authority; validating here only produces a better message than a raw 23514.
const LISTING_KINDS = ["used_unique", "new_stocked"] as const;
const PRODUCT_STATUSES = [
  "draft",
  "available",
  "reserved",
  "sold",
  "archived",
] as const;

type ProductWriteValues = {
  name: string;
  slug: string;
  description: string;
  price: number;
  compare_at_price: number | null;
  category_id: string;
  listing_kind: string;
  status: string;
  condition_grade: string | null;
  condition_summary: string | null;
  stock_quantity: number | null;
  width_cm: number | null;
  length_cm: number | null;
  depth_cm: number | null;
  height_cm: number | null;
  seat_height_cm: number | null;
  weight_kg: number | null;
  dimension_note: string | null;
  is_foldable: boolean;
  folding_mechanism: string | null;
  unfolded_width_cm: number | null;
  unfolded_length_cm: number | null;
  unfolded_height_cm: number | null;
  has_storage: boolean | null;
};

// Mechanism codes follow the same pattern as every vocabulary code
// (folding_mechanisms_code_check). Checked here only to reject junk before the write; the
// foreign key is the real authority on whether the code exists.
const mechanismCodePattern = /^[a-z][a-z0-9_]{1,30}$/;

// "yes" / "no" / "" from the storage radio group. Anything else — a hand-crafted submit —
// is treated as "not specified" rather than guessed into a claim.
function readStorage(raw: FormDataEntryValue | null) {
  const value = String(raw ?? "");
  if (value === "yes") return true;
  if (value === "no") return false;
  return null;
}

// An empty field means "not measured" and must write NULL, not 0 — the CHECK constraints
// reject zero precisely so a blank cannot masquerade as a real measurement.
// Returns undefined for a value that is present but not a usable number, so the caller can
// tell "left blank" apart from "typed nonsense".
function readOptionalMeasurement(raw: FormDataEntryValue | null) {
  const text = String(raw ?? "").trim();
  if (text === "") return null;

  const value = Number(text);
  if (!Number.isFinite(value) || value <= 0) return undefined;

  return value;
}

function readProductFields(formData: FormData) {
  const name = String(formData.get("name") ?? "")
    .trim()
    .replace(/\s+/g, " ");
  const description = String(formData.get("description") ?? "").trim();
  const slug = createSlug(String(formData.get("slug") ?? ""));
  const priceValue = String(formData.get("price") ?? "").trim();
  const price = Number(priceValue);
  const categoryId = String(formData.get("categoryId") ?? "");
  const listingKind = String(formData.get("listingKind") ?? "");
  const productStatus = String(formData.get("productStatus") ?? "");
  const conditionGrade = String(formData.get("conditionGrade") ?? "").trim();
  const conditionSummary = String(formData.get("conditionSummary") ?? "").trim();
  const stockValue = String(formData.get("stockQuantity") ?? "").trim();
  const fieldErrors: NonNullable<ProductActionState["fieldErrors"]> = {};

  if (name.length < 2 || name.length > 160) {
    fieldErrors.name = "დასახელება უნდა შეიცავდეს 2-დან 160 სიმბოლომდე.";
  }

  if (slug.length < 2 || slug.length > 160) {
    fieldErrors.slug = "სლაგი უნდა შეიცავდეს 2-დან 160 სიმბოლომდე.";
  } else if (!isValidSlug(slug)) {
    fieldErrors.slug = "გამოიყენეთ ლათინური ასოები, ციფრები და დეფისი.";
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

  // The "was" price. Blank means "not on sale" and writes NULL — the same blank-vs-zero
  // distinction the measurements make, and for the same reason: a compare-at price of 0
  // would be a claim, not an absence.
  const compareAtValue = String(formData.get("compareAtPrice") ?? "").trim();
  const compareAtPrice = compareAtValue === "" ? null : Number(compareAtValue);

  if (compareAtPrice !== null) {
    if (
      !Number.isFinite(compareAtPrice) ||
      compareAtPrice <= 0 ||
      compareAtPrice > 9_999_999_999.99
    ) {
      fieldErrors.compareAtPrice = "შეიყვანეთ სწორი ძველი ფასი, ან დატოვეთ ცარიელი.";
    } else if (Number.isFinite(price) && compareAtPrice <= price) {
      // Mirrors products_compare_at_price_check. Checked here only to produce a message
      // that names the problem — the database is still the authority, and an equal price is
      // rejected rather than merely discouraged because it renders a 0% saving.
      fieldErrors.compareAtPrice =
        "ძველი ფასი მიმდინარე ფასზე მეტი უნდა იყოს, თორემ ფასდაკლება არ ჩანს.";
    }
  }

  if (!uuidPattern.test(categoryId)) {
    fieldErrors.categoryId = "აირჩიეთ კატალოგი.";
  }

  const isListingKind = (LISTING_KINDS as readonly string[]).includes(
    listingKind,
  );
  const isStatus = (PRODUCT_STATUSES as readonly string[]).includes(
    productStatus,
  );

  if (!isListingKind) {
    fieldErrors.listingKind = "აირჩიეთ პროდუქტის ტიპი.";
  }

  if (!isStatus) {
    fieldErrors.productStatus = "აირჩიეთ სტატუსი.";
  }

  // The two branches of products_condition_matches_kind_check. Building the payload from
  // the discriminator — rather than passing through whatever the form sent — means a
  // stale hidden input cannot produce a row the constraint rejects.
  const isUsed = listingKind === "used_unique";
  const stock = Number(stockValue);

  if (isUsed) {
    if (!conditionGrade) {
      fieldErrors.conditionGrade = "მეორადი ნივთისთვის მდგომარეობა სავალდებულოა.";
    }

    if (conditionSummary.length > 2000) {
      fieldErrors.conditionSummary =
        "მდგომარეობის აღწერა არ უნდა აღემატებოდეს 2000 სიმბოლოს.";
    }
  } else if (isListingKind) {
    if (
      stockValue === "" ||
      !Number.isInteger(stock) ||
      stock < 0 ||
      stock > 1_000_000
    ) {
      fieldErrors.stockQuantity = "შეიყვანეთ მარაგის რაოდენობა (0 ან მეტი).";
    }
  }

  // Dimensions apply to both listing kinds, so they sit outside the isUsed branch.
  const widthCm = readOptionalMeasurement(formData.get("widthCm"));
  const lengthCm = readOptionalMeasurement(formData.get("lengthCm"));
  const depthCm = readOptionalMeasurement(formData.get("depthCm"));
  const heightCm = readOptionalMeasurement(formData.get("heightCm"));
  const seatHeightCm = readOptionalMeasurement(formData.get("seatHeightCm"));
  const weightKg = readOptionalMeasurement(formData.get("weightKg"));
  const dimensionNote = String(formData.get("dimensionNote") ?? "").trim();

  if (
    [widthCm, lengthCm, depthCm, heightCm, seatHeightCm, weightKg].some(
      (value) => value === undefined,
    )
  ) {
    fieldErrors.dimensions = "ზომები უნდა იყოს დადებითი რიცხვები.";
  }

  if (dimensionNote.length > 500) {
    fieldErrors.dimensions = "ზომების შენიშვნა არ უნდა აღემატებოდეს 500 სიმბოლოს.";
  }

  // Folding. Built from the checkbox, like the condition half is built from listing_kind:
  // when the product does not fold, the mechanism and unfolded size are written as NULL
  // whatever the form sent, so products_folding_matches_foldable_check can never fire.
  const isFoldable = formData.get("isFoldable") === "true";
  const foldingMechanism = String(formData.get("foldingMechanism") ?? "").trim();
  const unfoldedWidthCm = readOptionalMeasurement(formData.get("unfoldedWidthCm"));
  const unfoldedLengthCm = readOptionalMeasurement(formData.get("unfoldedLengthCm"));
  const unfoldedHeightCm = readOptionalMeasurement(formData.get("unfoldedHeightCm"));

  if (isFoldable) {
    if (foldingMechanism && !mechanismCodePattern.test(foldingMechanism)) {
      fieldErrors.features = "აირჩიეთ გაშლის მექანიზმი სიიდან.";
    } else if (
      [unfoldedWidthCm, unfoldedLengthCm, unfoldedHeightCm].some(
        (value) => value === undefined,
      )
    ) {
      fieldErrors.features = "გაშლილი ზომები უნდა იყოს დადებითი რიცხვები.";
    }
  }

  const values: ProductWriteValues = {
    name,
    slug,
    description,
    price,
    compare_at_price: compareAtPrice,
    category_id: categoryId,
    listing_kind: listingKind,
    status: productStatus,
    condition_grade: isUsed ? conditionGrade : null,
    condition_summary: isUsed ? conditionSummary : null,
    stock_quantity: isUsed ? null : stock,
    width_cm: widthCm ?? null,
    length_cm: lengthCm ?? null,
    depth_cm: depthCm ?? null,
    height_cm: heightCm ?? null,
    seat_height_cm: seatHeightCm ?? null,
    weight_kg: weightKg ?? null,
    dimension_note: dimensionNote || null,
    is_foldable: isFoldable,
    folding_mechanism: isFoldable ? foldingMechanism || null : null,
    unfolded_width_cm: isFoldable ? (unfoldedWidthCm ?? null) : null,
    unfolded_length_cm: isFoldable ? (unfoldedLengthCm ?? null) : null,
    unfolded_height_cm: isFoldable ? (unfoldedHeightCm ?? null) : null,
    // Independent of folding: an ottoman bed with a lifting base has storage and no
    // mechanism at all.
    has_storage: readStorage(formData.get("hasStorage")),
  };

  return { values, fieldErrors };
}

// published_at records when a listing FIRST became available, which is what the storefront's
// "new arrival" badge is derived from. It is deliberately not created_at: a used item sits in
// `draft` while it is photographed and assessed, so the row exists days before it goes on
// sale (see the column comment in the storefront repo's schemas/03_products.sql).
//
// Two rules, and both matter:
//
//   - Stamp it only on the transition INTO `available` from a row that was never published.
//     Setting it on every save would make any edit to a live listing re-badge it as new,
//     which turns the badge into "recently edited" and is exactly the kind of quiet lie the
//     rest of this schema exists to avoid.
//   - Never clear it. A listing that sells and is later re-listed keeps its original
//     publication date rather than presenting as a new arrival on its second outing.
//
// Written here in the action rather than as a database trigger on purpose: this codebase
// keeps write rules in readProductFields and its neighbours, where they are visible to
// whoever is reading the save path. A trigger would be the hidden half of the story.
function getPublishedAtUpdate(
  nextStatus: string,
  currentPublishedAt: string | null,
): { published_at: string } | Record<string, never> {
  if (nextStatus !== "available" || currentPublishedAt !== null) return {};
  return { published_at: new Date().toISOString() };
}

// The finance rules — what the form's purchase and sale fields mean, and how they are
// written — live in lib/accounting (sale-input.ts, finance-writes.ts) rather than here, so
// they can be unit-tested without driving a whole product save through R2 and Supabase.
type SupabaseWriter = NonNullable<
  Awaited<ReturnType<typeof getAuthorizedClient>>["supabase"]
>;

// Undoes a createProduct that failed part-way. The sale row is deleted first because
// product_sales_product_id_fkey is RESTRICT; everything else hanging off the product
// cascades with it.
async function rollBackCreatedProduct(supabase: SupabaseWriter, productId: string) {
  await supabase.from("product_sales").delete().eq("product_id", productId);
  await supabase.from("products").delete().eq("id", productId);
}

// Each new photo carries a client-generated id so a flaw submitted in the same request can
// reference it (see SCHEMA_ROADMAP.md step 2). product_images.id has a gen_random_uuid()
// DEFAULT rather than being identity-generated, so supplying it is legitimate — but it
// means the id arrives from the browser and must be treated as untrusted input.
//
// The id↔file pairing is built BEFORE empty entries are filtered out. Pairing after the
// filter would silently shift the arrays whenever the browser submits a zero-size entry,
// anchoring every subsequent flaw to the wrong photo.
function readProductImageFiles(formData: FormData) {
  // An empty <input type="file"> still submits one zero-byte entry, so the raw arrays are
  // NOT expected to be the same length. Drop the empty entries first, keeping each real
  // file's position, and only then pair with the ids — which are emitted one per selected
  // file. Comparing the raw lengths would reject every save that adds no new photo.
  const realFiles = formData
    .getAll("images")
    .filter((entry): entry is File => entry instanceof File && entry.size > 0);
  const rawIds = formData.getAll("imageIds").map(String);
  let error: string | undefined;

  if (rawIds.length !== realFiles.length) {
    return {
      images: [],
      error: "ფოტოების მონაცემები არასრულია. გთხოვთ, თავიდან აირჩიოთ ფოტოები.",
    };
  }

  const images = realFiles.map((file, index) => ({ file, id: rawIds[index] }));
  const ids = images.map((image) => image.id);

  if (images.length > MAX_PRODUCT_IMAGES) {
    error = `შეგიძლიათ დაამატოთ მაქსიმუმ ${MAX_PRODUCT_IMAGES} ფოტო.`;
  } else if (ids.some((id) => !uuidPattern.test(id))) {
    error = "ფოტოს იდენტიფიკატორი არასწორია.";
  } else if (new Set(ids).size !== ids.length) {
    // A duplicate would make two photos share one id; the unique constraint on
    // product_images.id would catch it, but only after the R2 upload had already run.
    error = "ფოტოს იდენტიფიკატორი გამეორებულია.";
  } else if (images.some(({ file }) => !isAllowedProductImage(file))) {
    error = "დაშვებულია მხოლოდ JPG, PNG და WebP ფორმატის ფოტოები.";
  } else if (images.some(({ file }) => file.size > MAX_PRODUCT_IMAGE_SIZE)) {
    error = "თითოეული ფოტო არ უნდა აღემატებოდეს 5 მბ-ს.";
  } else if (
    images.reduce((total, { file }) => total + file.size, 0) >
    MAX_PRODUCT_IMAGE_UPLOAD_TOTAL
  ) {
    error = "ფოტოების საერთო ზომა ძალიან დიდია. გთხოვთ, ამოიღოთ ერთი ან რამდენიმე ფოტო.";
  }

  return { images, error };
}

export type FlawWriteRow = {
  product_id: string;
  image_id: string | null;
  flaw_type: string;
  severity: string;
  location_ka: string | null;
  note_ka: string;
  sort_order: number;
};

export type AspectWriteRow = {
  product_id: string;
  aspect_code: string;
  grade_code: string;
  note: string | null;
};

// Flaw rows arrive as parallel fields keyed by a client-generated row key:
//   flawKeys=<key>, flawType_<key>, flawSeverity_<key>, flawLocation_<key>,
//   flawNote_<key>, flawImage_<key>
// Keying by value rather than by index means reordering or removing a row in the browser
// cannot silently shift one flaw's note onto another flaw's photo.
//
// `allowedImageIds` is the set of photos this product will actually own after the submit:
// the newly uploaded ids plus the surviving existing ones. Validating against it is not
// optional — the foreign key only proves the image row exists, NOT that it belongs to this
// product, so without this check a malformed submit could anchor a flaw to another
// product's photo.
function readFlaws(
  formData: FormData,
  productId: string,
  allowedImageIds: Set<string>,
) {
  const keys = formData.getAll("flawKeys").map(String).filter(Boolean);
  const rows: FlawWriteRow[] = [];
  let error: string | undefined;

  if (keys.length > 40) {
    return { rows: [], error: "ნაკლოვანებების რაოდენობა ძალიან დიდია." };
  }

  keys.forEach((key, index) => {
    const flawType = String(formData.get(`flawType_${key}`) ?? "");
    const severity = String(formData.get(`flawSeverity_${key}`) ?? "");
    const location = String(formData.get(`flawLocation_${key}`) ?? "").trim();
    const note = String(formData.get(`flawNote_${key}`) ?? "").trim();
    const imageId = String(formData.get(`flawImage_${key}`) ?? "").trim();

    if (!isFlawType(flawType) || !isFlawSeverity(severity)) {
      error = "ნაკლის ტიპი ან სიმძიმე არასწორია.";
      return;
    }

    if (note.length < 2 || note.length > 500) {
      error = "ნაკლის აღწერა უნდა შეიცავდეს 2-დან 500 სიმბოლომდე.";
      return;
    }

    if (location.length > 160) {
      error = "ნაკლის ადგილმდებარეობა ძალიან გრძელია.";
      return;
    }

    if (imageId && !allowedImageIds.has(imageId)) {
      error = "ნაკლისთვის არჩეული ფოტო ამ პროდუქტს არ ეკუთვნის.";
      return;
    }

    rows.push({
      product_id: productId,
      image_id: imageId || null,
      flaw_type: flawType,
      severity,
      location_ka: location || null,
      note_ka: note,
      sort_order: index,
    });
  });

  return { rows, error };
}

// Aspect ratings arrive keyed by the aspect code itself, since the vocabulary is fixed.
// An empty grade means "does not apply to this item" and writes no row at all — which is
// distinct from, and more honest than, storing a neutral grade.
function readConditionAspects(
  formData: FormData,
  productId: string,
  aspectCodes: string[],
) {
  const rows: AspectWriteRow[] = [];
  let error: string | undefined;

  for (const code of aspectCodes) {
    const grade = String(formData.get(`aspectGrade_${code}`) ?? "").trim();
    const note = String(formData.get(`aspectNote_${code}`) ?? "").trim();

    if (!grade) continue;

    if (note.length > 500) {
      error = "მდგომარეობის შენიშვნა ძალიან გრძელია.";
      break;
    }

    rows.push({
      product_id: productId,
      aspect_code: code,
      grade_code: grade,
      note: note || null,
    });
  }

  return { rows, error };
}

// Attribute codes arrive as repeated checkbox values. Deduplicated because a malformed
// submit could repeat one, which the composite primary key would reject with a raw 23505
// after the product write had already happened.
//
// Codes are NOT validated against the vocabulary here: unlike a flaw's image_id, these
// reference global lookup tables, so the foreign key alone is a complete check — there is
// no per-product ownership to enforce. An unknown code surfaces as a 23503 and is mapped
// to a readable message by getDatabaseErrorMessage.
function readAttributeCodes(formData: FormData, field: string) {
  const codes = formData
    .getAll(field)
    .map(String)
    .map((code) => code.trim())
    .filter(Boolean);

  return [...new Set(codes)];
}

type AttributeWrite = {
  materials: { product_id: string; material_code: string }[];
  colours: { product_id: string; colour_code: string }[];
  styles: { product_id: string; style_code: string }[];
};

function readAttributes(formData: FormData, productId: string): AttributeWrite {
  return {
    materials: readAttributeCodes(formData, "materialCodes").map((code) => ({
      product_id: productId,
      material_code: code,
    })),
    colours: readAttributeCodes(formData, "colourCodes").map((code) => ({
      product_id: productId,
      colour_code: code,
    })),
    styles: readAttributeCodes(formData, "styleCodes").map((code) => ({
      product_id: productId,
      style_code: code,
    })),
  };
}

// Replaced wholesale rather than diffed, matching the condition detail above: the form
// always submits the complete set, so delete-then-insert cannot leave behind an attribute
// the user unchecked in the browser.
async function writeAttributes(
  supabase: NonNullable<Awaited<ReturnType<typeof getAuthorizedClient>>["supabase"]>,
  productId: string,
  attributes: AttributeWrite,
  replaceExisting: boolean,
) {
  if (replaceExisting) {
    await supabase.from("product_materials").delete().eq("product_id", productId);
    await supabase.from("product_colours").delete().eq("product_id", productId);
    await supabase.from("product_styles").delete().eq("product_id", productId);
  }

  if (attributes.materials.length > 0) {
    const { error } = await supabase
      .from("product_materials")
      .insert(attributes.materials);
    if (error) throw error;
  }

  if (attributes.colours.length > 0) {
    const { error } = await supabase
      .from("product_colours")
      .insert(attributes.colours);
    if (error) throw error;
  }

  if (attributes.styles.length > 0) {
    const { error } = await supabase
      .from("product_styles")
      .insert(attributes.styles);
    if (error) throw error;
  }
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

export type NewProductImage = { file: File; id: string };

async function uploadImages(
  productId: string,
  images: NewProductImage[],
  startSortOrder: number,
) {
  const uploaded: UploadedImage[] = [];

  try {
    for (const { file } of images) {
      uploaded.push(await uploadProductImage(productId, file));
    }
  } catch (error) {
    await deleteR2Objects(uploaded.map((image) => image.objectKey)).catch(
      () => undefined,
    );
    throw error;
  }

  // The id comes from the client so flaws submitted alongside can reference it. Index
  // alignment holds because `uploaded` is built by iterating `images` in order.
  return uploaded.map((image, index) => ({
    id: images[index].id,
    product_id: productId,
    object_key: image.objectKey,
    original_name: image.originalName,
    content_type: image.contentType,
    size_bytes: image.sizeBytes,
    sort_order: startSortOrder + index,
  }));
}

function getDatabaseErrorMessage(code?: string, constraint?: string) {
  // product_images.id now arrives from the client, so a 23505 is no longer necessarily a
  // slug collision. Naming the constraint keeps the message honest.
  if (code === "23505" && constraint?.startsWith("product_images")) {
    return "ფოტოს იდენტიფიკატორი უკვე გამოყენებულია. გთხოვთ, თავიდან აირჩიოთ ფოტოები.";
  }

  if (code === "23505") {
    return "ამ სლაგით პროდუქტი უკვე არსებობს. გთხოვთ, სლაგი შეცვალოთ.";
  }

  if (code === "23503" && constraint?.includes("material")) {
    return "არჩეული მასალა აღარ არსებობს.";
  }

  if (code === "23503" && constraint?.includes("colour")) {
    return "არჩეული ფერი აღარ არსებობს.";
  }

  if (code === "23503" && constraint?.includes("style")) {
    return "არჩეული სტილი აღარ არსებობს.";
  }

  if (code === "23503" && constraint?.includes("folding")) {
    return "არჩეული გაშლის მექანიზმი აღარ არსებობს.";
  }

  // product_sales is RESTRICT: sales must not vanish from the books with their product.
  if (code === "23503" && constraint?.includes("product_sales")) {
    return "ამ პროდუქტს გაყიდვები აქვს დაფიქსირებული და ბუღალტერიიდან არ უნდა წაიშალოს. წაშლის ნაცვლად დააარქივეთ.";
  }

  if (code === "23503") {
    return "არჩეული კატალოგი აღარ არსებობს.";
  }

  if (code === "23514" || code === "22003") {
    return "პროდუქტის მონაცემები დასაშვებ საზღვრებს არ შეესაბამება. შეამოწმეთ პროდუქტის ტიპი, მდგომარეობა და მარაგი.";
  }

  return "ოპერაცია ვერ შესრულდა. გთხოვთ, კიდევ სცადოთ.";
}

export async function createProduct(
  _previousState: ProductActionState,
  formData: FormData,
): Promise<ProductActionState> {
  const { values, fieldErrors } = readProductFields(formData);
  const finances = readFinanceFields(formData, values.status, values.listing_kind);
  // A product created as `sold` (entered after the fact) has no previous status: it is being
  // marked sold now, so it needs its sale price, and a blank date is stamped with today.
  const usedSale = resolveUsedSale(finances.values, null);
  const statusError = statusTransitionError(values.listing_kind, values.status, null);
  const imageFiles = readProductImageFiles(formData);

  if (imageFiles.error) {
    fieldErrors.images = imageFiles.error;
  }

  if (finances.error || usedSale.error) {
    fieldErrors.finances = finances.error || usedSale.error;
  }

  if (statusError) {
    fieldErrors.productStatus = statusError;
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

  // A product created directly as `available` is published now; one created as a draft is
  // stamped later, by updateProduct, when it actually goes live.
  const { data, error } = await authorization.supabase
    .from("products")
    .insert({ ...values, ...getPublishedAtUpdate(values.status, null) })
    .select("id, slug")
    .single();

  if (error) {
    return {
      status: "error",
      // PostgREST errors carry no `constraint` field, but the message names the violated
      // constraint — without it every 23503 here would claim the category is gone.
      message: getDatabaseErrorMessage(error.code, error.message),
    };
  }

  // Before the photos, so a failure here has nothing in R2 to clean up — only the product
  // row and, if it got that far, the sale row. The sale must go first: product_sales
  // restricts deleting a product that has sales.
  const financeError =
    (await writePurchasePrice(
      authorization.supabase,
      data.id,
      finances.values.purchasePrice,
    )) ??
    (await syncUsedSale(authorization.supabase, {
      productId: data.id,
      listingKind: values.listing_kind,
      previousKind: null,
      listPrice: values.price,
      input: finances.values,
      soldOn: usedSale.soldOn,
    }));

  if (financeError) {
    await rollBackCreatedProduct(authorization.supabase, data.id);

    return {
      status: "error",
      message: "პროდუქტი ვერ შეიქმნა: ფინანსური მონაცემები ვერ შეინახა. გთხოვთ, კიდევ სცადოთ.",
      fieldErrors: { finances: "ფინანსური მონაცემების შენახვა ვერ დასრულდა." },
    };
  }

  let imageRows: Awaited<ReturnType<typeof uploadImages>> = [];

  try {
    imageRows = await uploadImages(data.id, imageFiles.images, 0);

    if (imageRows.length > 0) {
      const { error: imageError } = await authorization.supabase
        .from("product_images")
        .insert(imageRows);

      if (imageError) {
        throw imageError;
      }
    }

    // Condition detail only exists for used items; the CHECK constraint guarantees a new
    // stocked product has no condition data to attach.
    if (values.listing_kind === "used_unique") {
      const allowedImageIds = new Set(imageRows.map((image) => image.id));
      const flaws = readFlaws(formData, data.id, allowedImageIds);
      const aspects = readConditionAspects(
        formData,
        data.id,
        await getAspectCodes(authorization.supabase),
      );

      if (flaws.error || aspects.error) {
        throw new Error(flaws.error || aspects.error);
      }

      if (aspects.rows.length > 0) {
        const { error: aspectError } = await authorization.supabase
          .from("product_condition_aspects")
          .insert(aspects.rows);
        if (aspectError) throw aspectError;
      }

      if (flaws.rows.length > 0) {
        const { error: flawError } = await authorization.supabase
          .from("product_flaws")
          .insert(flaws.rows);
        if (flawError) throw flawError;
      }
    }

    // Attributes apply to both listing kinds, so this sits outside the used_unique branch.
    // Inside the try: a failure here rolls the whole product back, same as the flaws.
    await writeAttributes(
      authorization.supabase,
      data.id,
      readAttributes(formData, data.id),
      false,
    );
  } catch (imageError) {
    await deleteR2Objects(imageRows.map((image) => image.object_key)).catch(
      () => undefined,
    );
    await rollBackCreatedProduct(authorization.supabase, data.id);

    // A client-supplied image id that collides with an existing row arrives here as a
    // 23505 on product_images. Without naming it, the user would see the generic upload
    // failure and have no idea that re-selecting the photos is the fix.
    const databaseError = imageError as { code?: string; constraint?: string };

    return {
      status: "error",
      message: databaseError?.code
        ? getDatabaseErrorMessage(databaseError.code, databaseError.constraint)
        : "პროდუქტის ფოტოები ვერ აიტვირთა. გთხოვთ, კიდევ სცადოთ.",
      fieldErrors: {
        images: "ფოტოების ატვირთვა ვერ დასრულდა.",
      },
    };
  }

  revalidatePath("/dashboard");
  revalidatePath("/accounting");
  redirect(`/product/${encodeURIComponent(data.slug)}`);
}

export async function updateProduct(
  _previousState: ProductActionState,
  formData: FormData,
): Promise<ProductActionState> {
  const id = String(formData.get("id") ?? "");
  const previousSlug = String(formData.get("previousSlug") ?? "");
  const { values, fieldErrors } = readProductFields(formData);
  const finances = readFinanceFields(formData, values.status, values.listing_kind);
  const imageFiles = readProductImageFiles(formData);
  const deletedImages = readDeletedImageIds(formData);
  // The stock the form was loaded with. See the stock check below.
  const loadedStockValue = String(formData.get("loadedStockQuantity") ?? "").trim();

  if (imageFiles.error || deletedImages.error) {
    fieldErrors.images = imageFiles.error || deletedImages.error;
  }

  if (finances.error) {
    fieldErrors.finances = finances.error;
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

  // The current published_at is needed to decide whether this save is the first transition
  // into `available`; the current status and kind decide how a used item's sale is written;
  // the current stock guards against overwriting a sale (below). Fetched alongside the images
  // rather than in a separate round trip.
  const [
    { data: currentImages, error: currentImagesError },
    { data: currentProduct, error: currentProductError },
  ] = await Promise.all([
    authorization.supabase
      .from("product_images")
      .select("id, object_key, sort_order")
      .eq("product_id", id)
      .order("sort_order"),
    authorization.supabase
      .from("products")
      .select("published_at, status, listing_kind, stock_quantity")
      .eq("id", id)
      .maybeSingle(),
  ]);

  if (currentImagesError) {
    return {
      status: "error",
      message: "არსებული ფოტოები ვერ შემოწმდა. გთხოვთ, კიდევ სცადოთ.",
    };
  }

  // A read failure must not be treated as "never published": that would re-stamp
  // published_at and re-badge a long-live listing as a new arrival. Fail the save instead.
  if (currentProductError) {
    return {
      status: "error",
      message: "პროდუქტის მონაცემები ვერ შემოწმდა. გთხოვთ, კიდევ სცადოთ.",
    };
  }

  if (!currentProduct) {
    return {
      status: "error",
      message: "პროდუქტი ვერ მოიძებნა ან მისი შეცვლის უფლება არ გაქვთ.",
    };
  }

  // Lost-update guard. The form writes stock_quantity back as a plain number, but a sale
  // recorded from the product page changes stock while this form may already be open in
  // another tab. Saving it would silently put the sold units back on the shelf. If the stock
  // moved since the form was loaded, refuse and ask for a reload instead of guessing which
  // number is right.
  if (
    loadedStockValue !== "" &&
    currentProduct.listing_kind === "new_stocked" &&
    String(currentProduct.stock_quantity ?? "") !== loadedStockValue
  ) {
    return {
      status: "error",
      message: `მარაგი შეიცვალა ფორმის გახსნის შემდეგ (ახლა: ${currentProduct.stock_quantity ?? 0}) — სავარაუდოდ დაფიქსირდა გაყიდვა. განაახლეთ გვერდი და თავიდან შეიტანეთ ცვლილებები.`,
      fieldErrors: { stockQuantity: "მარაგი სხვაგან შეიცვალა. განაახლეთ გვერდი." },
    };
  }

  const usedSale = resolveUsedSale(finances.values, currentProduct.status);
  const statusError = statusTransitionError(
    values.listing_kind,
    values.status,
    currentProduct.status,
  );

  if (usedSale.error || statusError) {
    return {
      status: "error",
      message: "შეამოწმეთ შევსებული ველები.",
      fieldErrors: {
        ...(usedSale.error ? { finances: usedSale.error } : {}),
        ...(statusError ? { productStatus: statusError } : {}),
      },
    };
  }

  const deletedImageIdSet = new Set(deletedImages.ids);
  const imagesToDelete = (currentImages ?? []).filter((image) =>
    deletedImageIdSet.has(image.id),
  );
  const remainingImageCount =
    (currentImages?.length ?? 0) - imagesToDelete.length;

  if (remainingImageCount + imageFiles.images.length > MAX_PRODUCT_IMAGES) {
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
    newImageRows = await uploadImages(id, imageFiles.images, nextSortOrder);
  } catch {
    return {
      status: "error",
      message: "ახალი ფოტოები ვერ აიტვირთა. გთხოვთ, კიდევ სცადოთ.",
      fieldErrors: { images: "ფოტოების ატვირთვა ვერ დასრულდა." },
    };
  }

  const { data, error } = await authorization.supabase
    .from("products")
    .update({
      ...values,
      // Spread last so it can add published_at, and omitted entirely when this is not the
      // first publish — an absent key leaves the stored value alone, where an explicit
      // undefined or null would clear it.
      ...getPublishedAtUpdate(values.status, currentProduct.published_at),
      updated_at: new Date().toISOString(),
    })
    .eq("id", id)
    .select("id, slug")
    .maybeSingle();

  if (error) {
    await deleteR2Objects(newImageRows.map((image) => image.object_key)).catch(
      () => undefined,
    );

    return {
      status: "error",
      // See the matching note in createProduct.
      message: getDatabaseErrorMessage(error.code, error.message),
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

      // Same reasoning as createProduct: a colliding client-supplied image id must say so
      // rather than hide behind the generic "photos could not be added".
      return {
        status: "error",
        message:
          insertImagesError.code === "23505"
            ? getDatabaseErrorMessage(
                insertImagesError.code,
                (insertImagesError as { constraint?: string }).constraint,
              )
            : "პროდუქტი განახლდა, მაგრამ ახალი ფოტოები ვერ დაემატა.",
        fieldErrors: { images: "ფოტოების დამატება ვერ დასრულდა." },
      };
    }
  }

  // Promote the chosen photo to sort_order 0.
  //
  // The storefront's card and the gallery both lead with the lowest sort_order, so this is
  // what decides the shop-window image. Until now that was whichever photo happened to be
  // uploaded first, changeable only by deleting everything and re-uploading in order.
  //
  // Every surviving row is renumbered 0..n-1 with the chosen one first, rather than swapping
  // two rows. Checked against the schema: product_images has no unique constraint on
  // (product_id, sort_order), so a plain rewrite cannot collide — and renumbering the whole
  // list is also self-healing for gaps left by earlier deletions.
  //
  // A failed renumber does not fail the save. The product and its photos are already stored
  // correctly and only their order is stale; rolling back a successful update over an
  // ordering detail would be the worse trade.
  const requestedLeadId = String(formData.get("leadImageId") ?? "").trim();
  if (requestedLeadId) {
    const surviving = [
      ...(currentImages ?? [])
        .filter((image) => !deletedImageIdSet.has(image.id))
        .map((image) => ({ id: image.id, sort_order: image.sort_order })),
      ...newImageRows.map((row) => ({
        id: row.id,
        sort_order: row.sort_order,
      })),
    ].sort((a, b) => a.sort_order - b.sort_order);

    const lead = surviving.find((image) => image.id === requestedLeadId);
    // Silently ignored when the id is unknown or already leading: a stale form referring to
    // a photo that was deleted in the same submit is a no-op, not an error.
    if (lead && surviving[0]?.id !== requestedLeadId) {
      const reordered = [
        lead,
        ...surviving.filter((image) => image.id !== requestedLeadId),
      ];

      await Promise.all(
        reordered.map((image, index) =>
          authorization.supabase
            .from("product_images")
            .update({ sort_order: index })
            .eq("id", image.id),
        ),
      );
    }
  }

  // Condition detail is replaced wholesale rather than diffed: the form always submits the
  // complete set, so delete-then-insert is both simpler and cannot leave a flaw the user
  // removed in the browser still sitting in the database.
  //
  // Ordering matters — this runs BEFORE the image deletion below. A flaw anchored to a
  // photo being deleted is re-inserted here with whatever the form last said; doing it
  // afterwards would race the image_id SET NULL.
  if (values.listing_kind === "used_unique") {
    const survivingImageIds = new Set(
      (currentImages ?? [])
        .filter((image) => !deletedImageIdSet.has(image.id))
        .map((image) => image.id),
    );
    for (const row of newImageRows) survivingImageIds.add(row.id);

    const flaws = readFlaws(formData, id, survivingImageIds);
    const aspects = readConditionAspects(
      formData,
      id,
      await getAspectCodes(authorization.supabase),
    );

    if (flaws.error || aspects.error) {
      return {
        status: "error",
        message: "შეამოწმეთ შევსებული ველები.",
        fieldErrors: { flaws: flaws.error || aspects.error },
      };
    }

    await authorization.supabase
      .from("product_flaws")
      .delete()
      .eq("product_id", id);
    await authorization.supabase
      .from("product_condition_aspects")
      .delete()
      .eq("product_id", id);

    if (aspects.rows.length > 0) {
      const { error: aspectError } = await authorization.supabase
        .from("product_condition_aspects")
        .insert(aspects.rows);

      if (aspectError) {
        return {
          status: "error",
          message: "პროდუქტი განახლდა, მაგრამ მდგომარეობის შეფასება ვერ შეინახა.",
          fieldErrors: { flaws: "მდგომარეობის შენახვა ვერ დასრულდა." },
        };
      }
    }

    if (flaws.rows.length > 0) {
      const { error: flawError } = await authorization.supabase
        .from("product_flaws")
        .insert(flaws.rows);

      if (flawError) {
        return {
          status: "error",
          message: "პროდუქტი განახლდა, მაგრამ ნაკლოვანებები ვერ შეინახა.",
          fieldErrors: { flaws: "ნაკლოვანებების შენახვა ვერ დასრულდა." },
        };
      }
    }
  }

  // Replaced wholesale, like the condition detail above. Outside the used_unique branch
  // because a new stocked product has materials and colours too.
  try {
    await writeAttributes(
      authorization.supabase,
      id,
      readAttributes(formData, id),
      true,
    );
  } catch (attributeError) {
    const databaseError = attributeError as {
      code?: string;
      constraint?: string;
    };

    return {
      status: "error",
      message: databaseError?.code
        ? getDatabaseErrorMessage(databaseError.code, databaseError.constraint)
        : "პროდუქტი განახლდა, მაგრამ მასალა/ფერი ვერ შეინახა.",
      fieldErrors: { attributes: "მასალის და ფერის შენახვა ვერ დასრულდა." },
    };
  }

  const financeError =
    (await writePurchasePrice(
      authorization.supabase,
      id,
      finances.values.purchasePrice,
    )) ??
    (await syncUsedSale(authorization.supabase, {
      productId: id,
      listingKind: values.listing_kind,
      previousKind: currentProduct.listing_kind,
      listPrice: values.price,
      input: finances.values,
      soldOn: usedSale.soldOn,
    }));

  if (financeError) {
    return {
      status: "error",
      message: "პროდუქტი განახლდა, მაგრამ ფინანსური მონაცემები ვერ შეინახა.",
      fieldErrors: { finances: "ფინანსური მონაცემების შენახვა ვერ დასრულდა." },
    };
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
  revalidatePath("/accounting");
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
      // The message names the violated constraint; without it a product that has recorded
      // sales would be told its catalog no longer exists.
      message: getDatabaseErrorMessage(error.code, error.message),
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
  revalidatePath("/accounting");

  if (redirectAfterDelete) {
    redirect("/dashboard");
  }

  return {
    status: "success",
    message: "პროდუქტი წარმატებით წაიშალა.",
  };
}
