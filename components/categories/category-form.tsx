"use client";

import { useActionState, useState } from "react";
import { LoaderCircle } from "lucide-react";
import Link from "next/link";

import {
  createCategory,
  updateCategory,
  type CategoryActionState,
} from "@/app/categories/actions";
import { CategoryImagesField } from "@/components/categories/category-images-field";
import type { Category } from "@/components/categories/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createSlug } from "@/lib/slug";

const initialCategoryActionState: CategoryActionState = {
  status: "idle",
  message: "",
};

type CategoryFormProps = {
  mode: "create" | "edit";
  category?: Category;
};

export function CategoryForm({ mode, category }: CategoryFormProps) {
  const action = mode === "create" ? createCategory : updateCategory;
  const [state, formAction, pending] = useActionState(
    action,
    initialCategoryActionState,
  );
  const [name, setName] = useState(category?.name ?? "");
  const [slug, setSlug] = useState(category?.slug ?? "");
  const [slugEdited, setSlugEdited] = useState(false);
  const cancelHref =
    mode === "edit" && category ? `/category/${category.slug}` : "/categories";

  function handleNameChange(event: React.ChangeEvent<HTMLInputElement>) {
    const nextName = event.target.value;
    setName(nextName);

    if (!slugEdited) {
      setSlug(createSlug(nextName));
    }
  }

  function handleSlugChange(event: React.ChangeEvent<HTMLInputElement>) {
    setSlugEdited(true);
    setSlug(createSlug(event.target.value));
  }

  return (
    <form
      action={formAction}
      className="mt-7 rounded-3xl bg-white p-5 shadow-[0_16px_30px_rgba(0,0,0,0.04)] lg:p-8"
    >
      {category && (
        <>
          <input type="hidden" name="id" value={category.id} />
          <input type="hidden" name="previousSlug" value={category.slug} />
        </>
      )}

      <div className="grid gap-5 lg:grid-cols-2">
        <div className="grid gap-2 lg:col-span-2">
          <Label htmlFor="category-name">კატალოგის დასახელება</Label>
          <Input
            id="category-name"
            name="name"
            value={name}
            onChange={handleNameChange}
            placeholder="მაგალითად: მაგიდები"
            required
            minLength={2}
            maxLength={80}
            autoFocus
            aria-invalid={Boolean(state.fieldErrors?.name)}
            aria-describedby={
              state.fieldErrors?.name ? "category-name-error" : undefined
            }
            className="h-12 border-[#d6c3b8] bg-white"
          />
          {state.fieldErrors?.name && (
            <p
              id="category-name-error"
              className="text-xs font-medium text-[#c62828]"
            >
              {state.fieldErrors.name}
            </p>
          )}
        </div>

        <div className="grid gap-2 lg:col-span-2">
          <Label htmlFor="category-slug">სლაგი</Label>
          <Input
            id="category-slug"
            name="slug"
            value={slug}
            onChange={handleSlugChange}
            placeholder="მაგიდები"
            required
            minLength={2}
            maxLength={80}
            pattern="[ა-ჰa-z0-9]+(?:-[ა-ჰa-z0-9]+)*"
            aria-invalid={Boolean(state.fieldErrors?.slug)}
            aria-describedby={
              state.fieldErrors?.slug
                ? "category-slug-error"
                : "category-slug-help"
            }
            className="h-12 border-[#d6c3b8] bg-white"
          />
          {state.fieldErrors?.slug ? (
            <p
              id="category-slug-error"
              className="text-xs font-medium text-[#c62828]"
            >
              {state.fieldErrors.slug}
            </p>
          ) : (
            <p
              id="category-slug-help"
              className="text-xs leading-5 text-[#605e5b]"
            >
              დასახელებიდან ავტომატურად შეიქმნება; სურვილის შემთხვევაში
              შეცვალეთ.
            </p>
          )}
        </div>

        <div className="grid gap-2 lg:col-span-2">
          <Label htmlFor="category-description">აღწერა</Label>
          <textarea
            id="category-description"
            name="description"
            defaultValue={category?.description}
            placeholder="მოკლედ აღწერეთ კატალოგი..."
            rows={8}
            maxLength={5000}
            aria-invalid={Boolean(state.fieldErrors?.description)}
            aria-describedby={
              state.fieldErrors?.description
                ? "category-description-error"
                : "category-description-help"
            }
            className="w-full resize-y rounded-lg border border-[#d6c3b8] bg-white px-3 py-3 text-sm leading-6 outline-none placeholder:text-[#83746b] focus-visible:ring-2 focus-visible:ring-[#7f512f]/30"
          />
          {state.fieldErrors?.description ? (
            <p
              id="category-description-error"
              className="text-xs font-medium text-[#c62828]"
            >
              {state.fieldErrors.description}
            </p>
          ) : (
            <p
              id="category-description-help"
              className="text-xs leading-5 text-[#605e5b]"
            >
              აღწერა სურვილისამებრ შეგიძლიათ დატოვოთ ცარიელი.
            </p>
          )}
        </div>

        <CategoryImagesField
          existingImages={category?.images}
          serverError={state.fieldErrors?.images}
        />
      </div>

      {state.status === "error" && state.message && (
        <p
          role="alert"
          className="mt-5 rounded-xl bg-[#ffdad6] px-4 py-3 text-sm font-medium text-[#93000a]"
        >
          {state.message}
        </p>
      )}

      <div className="mt-8 flex flex-col-reverse gap-3 border-t border-[#e4e2e1] pt-5 sm:flex-row sm:justify-end">
        <Link
          href={cancelHref}
          className="inline-flex h-11.5 items-center justify-center rounded-lg border border-[#d6c3b8] px-5 text-sm font-semibold text-[#605e5b]"
        >
          გაუქმება
        </Link>
        <Button type="submit" disabled={pending} className="min-w-40">
          {pending && (
            <LoaderCircle
              aria-hidden="true"
              className="mr-2 size-4 animate-spin"
            />
          )}
          {mode === "create" ? "კატალოგის შექმნა" : "ცვლილებების შენახვა"}
        </Button>
      </div>
    </form>
  );
}
