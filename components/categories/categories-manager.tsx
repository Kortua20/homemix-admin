"use client";

import { useActionState, useState } from "react";
import {
  CheckCircle2,
  Folder,
  FolderPlus,
  LoaderCircle,
  Pencil,
  Plus,
  Trash2,
  X,
} from "lucide-react";

import {
  createCategory,
  deleteCategory,
  updateCategory,
  type CategoryActionState,
} from "@/app/categories/actions";
import type { Category } from "@/components/categories/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createSlug } from "@/lib/slug";

const initialCategoryActionState: CategoryActionState = {
  status: "idle",
  message: "",
};

type CategoriesManagerProps = {
  categories: Category[];
};

type ModalShellProps = {
  title: string;
  description: string;
  onClose: () => void;
  children: React.ReactNode;
};

type CategoryFieldsProps = {
  category?: Category;
  state: CategoryActionState;
};

function ModalShell({
  title,
  description,
  onClose,
  children,
}: ModalShellProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-[#1b1c1c]/45 p-0 backdrop-blur-[2px] sm:items-center sm:p-5">
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="category-dialog-title"
        className="max-h-[92svh] w-full overflow-y-auto rounded-t-3xl bg-white p-5 shadow-[0_24px_60px_rgba(0,0,0,0.18)] sm:max-w-md sm:rounded-3xl sm:p-7"
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2
              id="category-dialog-title"
              className="text-2xl font-bold tracking-[-0.02em] text-[#1b1c1c]"
            >
              {title}
            </h2>
            <p className="mt-1 text-sm leading-6 text-[#605e5b]">
              {description}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="ფანჯრის დახურვა"
            className="flex size-10 shrink-0 items-center justify-center rounded-full bg-[#f6f3f2] text-[#605e5b]"
          >
            <X aria-hidden="true" className="size-5" />
          </button>
        </div>

        {children}
      </section>
    </div>
  );
}

function CategoryFields({ category, state }: CategoryFieldsProps) {
  const [name, setName] = useState(category?.name ?? "");
  const [slug, setSlug] = useState(category?.slug ?? "");
  const [slugEdited, setSlugEdited] = useState(false);

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
    <div className="grid gap-5">
      {category && <input type="hidden" name="id" value={category.id} />}

      <div className="grid gap-2">
        <Label htmlFor={`category-name-${category?.id ?? "new"}`}>
          დასახელება
        </Label>
        <Input
          id={`category-name-${category?.id ?? "new"}`}
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
            state.fieldErrors?.name
              ? `category-name-error-${category?.id ?? "new"}`
              : undefined
          }
          className="h-12 border-[#d6c3b8] bg-white"
        />
        {state.fieldErrors?.name && (
          <p
            id={`category-name-error-${category?.id ?? "new"}`}
            className="text-xs font-medium text-[#c62828]"
          >
            {state.fieldErrors.name}
          </p>
        )}
      </div>

      <div className="grid gap-2">
        <Label htmlFor={`category-slug-${category?.id ?? "new"}`}>სლაგი</Label>
        <Input
          id={`category-slug-${category?.id ?? "new"}`}
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
              ? `category-slug-error-${category?.id ?? "new"}`
              : `category-slug-help-${category?.id ?? "new"}`
          }
          className="h-12 border-[#d6c3b8] bg-white"
        />
        {state.fieldErrors?.slug ? (
          <p
            id={`category-slug-error-${category?.id ?? "new"}`}
            className="text-xs font-medium text-[#c62828]"
          >
            {state.fieldErrors.slug}
          </p>
        ) : (
          <p
            id={`category-slug-help-${category?.id ?? "new"}`}
            className="text-xs leading-5 text-[#605e5b]"
          >
            დასახელებიდან ავტომატურად შეიქმნება; სურვილის შემთხვევაში შეცვალეთ.
          </p>
        )}
      </div>
    </div>
  );
}

function ActionMessage({
  state,
  onClose,
}: {
  state: CategoryActionState;
  onClose: () => void;
}) {
  if (state.status === "success") {
    return (
      <div className="mt-6 rounded-2xl bg-[#edf7ed] p-5 text-center">
        <CheckCircle2
          aria-hidden="true"
          className="mx-auto size-8 text-[#287d3c]"
        />
        <p className="mt-2 text-sm font-semibold text-[#205f30]">
          {state.message}
        </p>
        <Button type="button" onClick={onClose} className="mt-5 w-full">
          დახურვა
        </Button>
      </div>
    );
  }

  if (state.status === "error" && state.message) {
    return (
      <p
        role="alert"
        className="mt-5 rounded-xl bg-[#ffdad6] px-4 py-3 text-sm font-medium text-[#93000a]"
      >
        {state.message}
      </p>
    );
  }

  return null;
}

function AddCategoryForm({ onClose }: { onClose: () => void }) {
  const [state, formAction, pending] = useActionState(
    createCategory,
    initialCategoryActionState,
  );

  return (
    <ModalShell
      title="კატეგორიის დამატება"
      description="შეიყვანეთ ქართული დასახელება — URL-ის სლაგი ავტომატურად შეიქმნება."
      onClose={onClose}
    >
      {state.status === "success" ? (
        <ActionMessage state={state} onClose={onClose} />
      ) : (
        <form action={formAction} className="mt-6">
          <CategoryFields state={state} />
          <ActionMessage state={state} onClose={onClose} />
          <div className="mt-7 grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={onClose}
              className="h-11.5 rounded-lg border border-[#d6c3b8] text-sm font-semibold text-[#605e5b]"
            >
              გაუქმება
            </button>
            <Button type="submit" disabled={pending}>
              {pending && (
                <LoaderCircle
                  aria-hidden="true"
                  className="mr-2 size-4 animate-spin"
                />
              )}
              დამატება
            </Button>
          </div>
        </form>
      )}
    </ModalShell>
  );
}

function EditCategoryForm({
  category,
  onClose,
}: {
  category: Category;
  onClose: () => void;
}) {
  const [state, formAction, pending] = useActionState(
    updateCategory,
    initialCategoryActionState,
  );

  return (
    <ModalShell
      title="კატეგორიის რედაქტირება"
      description="შეცვალეთ მხოლოდ კატეგორიის დასახელება ან სლაგი."
      onClose={onClose}
    >
      {state.status === "success" ? (
        <ActionMessage state={state} onClose={onClose} />
      ) : (
        <form action={formAction} className="mt-6">
          <CategoryFields category={category} state={state} />
          <ActionMessage state={state} onClose={onClose} />
          <div className="mt-7 grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={onClose}
              className="h-11.5 rounded-lg border border-[#d6c3b8] text-sm font-semibold text-[#605e5b]"
            >
              გაუქმება
            </button>
            <Button type="submit" disabled={pending}>
              {pending && (
                <LoaderCircle
                  aria-hidden="true"
                  className="mr-2 size-4 animate-spin"
                />
              )}
              შენახვა
            </Button>
          </div>
        </form>
      )}
    </ModalShell>
  );
}

function DeleteCategoryForm({
  category,
  onClose,
}: {
  category: Category;
  onClose: () => void;
}) {
  const [state, formAction, pending] = useActionState(
    deleteCategory,
    initialCategoryActionState,
  );

  return (
    <ModalShell
      title="კატეგორიის წაშლა"
      description="წაშლილი კატეგორიის აღდგენა შეუძლებელი იქნება."
      onClose={onClose}
    >
      {state.status === "success" ? (
        <ActionMessage state={state} onClose={onClose} />
      ) : (
        <form action={formAction} className="mt-6">
          <input type="hidden" name="id" value={category.id} />
          <div className="rounded-2xl bg-[#fcf9f8] p-4">
            <p className="text-sm text-[#605e5b]">წასაშლელი კატეგორია</p>
            <p className="mt-1 text-lg font-bold text-[#1b1c1c]">
              {category.name}
            </p>
            <p className="mt-1 text-sm text-[#83746b]">/{category.slug}</p>
          </div>
          <ActionMessage state={state} onClose={onClose} />
          <div className="mt-7 grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={onClose}
              className="h-11.5 rounded-lg border border-[#d6c3b8] text-sm font-semibold text-[#605e5b]"
            >
              გაუქმება
            </button>
            <Button
              type="submit"
              disabled={pending}
              className="bg-[#c62828] hover:bg-[#a61f1f]"
            >
              {pending && (
                <LoaderCircle
                  aria-hidden="true"
                  className="mr-2 size-4 animate-spin"
                />
              )}
              წაშლა
            </Button>
          </div>
        </form>
      )}
    </ModalShell>
  );
}

function CategoryCard({ category }: { category: Category }) {
  const [activeModal, setActiveModal] = useState<"edit" | "delete" | null>(
    null,
  );

  return (
    <>
      <article className="flex min-h-44 flex-col rounded-3xl bg-white p-5 shadow-[0_16px_30px_rgba(0,0,0,0.04)] lg:p-6">
        <div className="flex items-start justify-between gap-4">
          <div className="flex size-11 items-center justify-center rounded-2xl bg-[#e6e2de] text-[#7f512f]">
            <Folder aria-hidden="true" className="size-5" />
          </div>
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => setActiveModal("edit")}
              aria-label={`${category.name} — რედაქტირება`}
              className="flex size-10 items-center justify-center rounded-full text-[#605e5b] transition-colors hover:bg-[#f6f3f2] hover:text-[#7f512f]"
            >
              <Pencil aria-hidden="true" className="size-4.5" />
            </button>
            <button
              type="button"
              onClick={() => setActiveModal("delete")}
              aria-label={`${category.name} — წაშლა`}
              className="flex size-10 items-center justify-center rounded-full text-[#c62828] transition-colors hover:bg-[#ffdad6]/50"
            >
              <Trash2 aria-hidden="true" className="size-4.5" />
            </button>
          </div>
        </div>

        <div className="mt-auto pt-7">
          <h2 className="text-2xl font-bold tracking-[-0.02em] text-[#1b1c1c]">
            {category.name}
          </h2>
          <p className="mt-1 text-sm font-medium text-[#83746b]">
            /{category.slug}
          </p>
        </div>
      </article>

      {activeModal === "edit" && (
        <EditCategoryForm
          category={category}
          onClose={() => setActiveModal(null)}
        />
      )}
      {activeModal === "delete" && (
        <DeleteCategoryForm
          category={category}
          onClose={() => setActiveModal(null)}
        />
      )}
    </>
  );
}

export function CategoriesManager({ categories }: CategoriesManagerProps) {
  const [addingCategory, setAddingCategory] = useState(false);

  return (
    <>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-[-0.02em] text-[#1b1c1c] lg:text-5xl">
            კატეგორიები
          </h1>
          <p className="mt-2 text-sm leading-6 text-[#605e5b] lg:text-base">
            დაამატეთ, შეცვალეთ ან წაშალეთ პროდუქტის კატეგორიები.
          </p>
        </div>
        <Button
          type="button"
          onClick={() => setAddingCategory(true)}
          className="w-full gap-2 sm:w-auto"
        >
          <Plus aria-hidden="true" className="size-4.5" />
          კატეგორიის დამატება
        </Button>
      </div>

      {categories.length > 0 ? (
        <div className="mt-7 grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {categories.map((category) => (
            <CategoryCard key={category.id} category={category} />
          ))}
        </div>
      ) : (
        <div className="mt-7 rounded-3xl bg-white px-6 py-16 text-center shadow-[0_16px_30px_rgba(0,0,0,0.04)]">
          <FolderPlus
            aria-hidden="true"
            className="mx-auto size-10 text-[#83746b]"
          />
          <h2 className="mt-4 text-xl font-bold">კატეგორიები ჯერ არ არის</h2>
          <p className="mt-2 text-sm text-[#605e5b]">
            პირველი კატეგორიის შესაქმნელად დააჭირეთ დამატების ღილაკს.
          </p>
        </div>
      )}

      {addingCategory && (
        <AddCategoryForm onClose={() => setAddingCategory(false)} />
      )}
    </>
  );
}
