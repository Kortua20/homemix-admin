"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { AlertCircle, LoaderCircle, Sparkles } from "lucide-react";

import { suggestProductDetails } from "@/app/product/ai-actions";
import { JumpLink } from "@/components/products/jump-link";
import type { AnchorablePhoto } from "@/components/products/product-condition-fields";
import type {
  AttributeKind,
  AttributeSelection,
  ProductAiSuggestion,
} from "@/components/products/types";
import { Button } from "@/components/ui/button";
import { MAX_AI_ANALYSIS_IMAGES } from "@/lib/product-image-constraints";
import { prepareImageForAnalysis } from "@/lib/product-image-optimization";

// Sends the photos already in the form to the AI and hands the result to ProductForm, which
// owns the fields and decides what is filled automatically. This component only owns the
// request: its pending and error state, and the replace/undo affordance for a description
// the admin had already written.
//
// Explicitly triggered, never on upload: photos are added and removed in several passes, and
// analysing each intermediate set would spend calls on selections nobody meant to describe.
//
// The photos come from the `photos` list ProductImagesField already reports upward. Each one
// carries a previewUrl — an object URL for a new file, the authenticated image route for a
// saved one — so the same fetch works for both without touching the upload field.

type ProductAiAssistProps = {
  photos: AnchorablePhoto[];
  disabled: boolean;
  suggestion: ProductAiSuggestion | null;
  onSuggestion: (suggestion: ProductAiSuggestion) => void;
  onAnalysingChange: (analysing: boolean) => void;
  description: string;
  onDescriptionChange: (description: string) => void;
  selection: AttributeSelection;
  categoryId: string;
  name: string;
};

const ATTRIBUTE_LABELS: [AttributeKind, string][] = [
  ["colours", "ფერი"],
  ["materials", "მასალა"],
  ["styles", "სტილი"],
];

const RESULT_LINK_CLASS =
  "font-semibold text-walnut underline underline-offset-2 hover:no-underline";

// The result line, derived from what the form holds NOW rather than recorded when the answer
// arrived. Photos are at the top of the form and the filled fields are well below, so these
// links are how the admin gets to what needs reviewing — and if they edit the description or
// untick a colour, the line updates instead of describing a state that no longer exists.
function getResultSummary(
  suggestion: ProductAiSuggestion,
  selection: AttributeSelection,
  description: string,
  categoryId: string,
  name: string,
) {
  // In the order the fields appear in the form, top to bottom.
  const links: { key: string; label: string; targetId: string }[] = [];

  if (suggestion.nameKa !== "" && name === suggestion.nameKa) {
    links.push({ key: "name", label: "დასახელება", targetId: "product-name" });
  }

  if (suggestion.category && categoryId === suggestion.category.id) {
    links.push({
      key: "category",
      label: "კატალოგი",
      targetId: "product-category",
    });
  }

  if (suggestion.descriptionKa !== "" && description === suggestion.descriptionKa) {
    links.push({
      key: "description",
      label: "აღწერა",
      targetId: "product-description",
    });
  }

  let possible = 0;

  for (const [kind, label] of ATTRIBUTE_LABELS) {
    const selected = new Set(selection[kind]);
    const codes = suggestion[kind].map((item) => item.code);
    const ticked = codes.filter((code) => selected.has(code)).length;

    possible += codes.length - ticked;

    if (ticked > 0) {
      links.push({
        key: kind,
        label: `${label} (${ticked})`,
        targetId: "product-attributes",
      });
    }
  }

  return { links, possible };
}

async function buildAnalysisFormData(photos: AnchorablePhoto[]) {
  const formData = new FormData();

  for (const [index, photo] of photos.entries()) {
    if (!photo.previewUrl) continue;

    const response = await fetch(photo.previewUrl);

    if (!response.ok) {
      throw new Error("PHOTO_FETCH_FAILED");
    }

    const blob = await prepareImageForAnalysis(await response.blob());
    formData.append(
      "images",
      new File([blob], `photo-${index + 1}.jpg`, { type: "image/jpeg" }),
    );
  }

  return formData;
}

export function ProductAiAssist({
  photos,
  disabled,
  suggestion,
  onSuggestion,
  onAnalysingChange,
  description,
  onDescriptionChange,
  selection,
  categoryId,
  name,
}: ProductAiAssistProps) {
  const [analysing, startAnalysis] = useTransition();
  // The answer arrives 5–15 s after the click. Calling the onSuggestion captured by the
  // click would merge against the form as it was then, missing a name typed or a slug
  // edited during the wait. The ref always holds the handler from the latest render.
  const onSuggestionRef = useRef(onSuggestion);
  useEffect(() => {
    onSuggestionRef.current = onSuggestion;
  });
  const [error, setError] = useState("");
  // The admin's own text, kept after they choose to replace it with the suggestion, so one
  // click puts it back. Null when there is nothing to undo.
  const [replacedDescription, setReplacedDescription] = useState<string | null>(
    null,
  );

  const usablePhotos = photos.filter((photo) => photo.previewUrl);
  const photosToSend = usablePhotos.slice(0, MAX_AI_ANALYSIS_IMAGES);
  const canAnalyse = photosToSend.length > 0 && !disabled && !analysing;

  function handleAnalyse() {
    setError("");
    setReplacedDescription(null);
    // Reported synchronously rather than derived from `analysing` in an effect: the form
    // disables Save from the same click. Server Actions run one at a time per client, so a
    // Save pressed now would silently queue behind this request instead of running.
    onAnalysingChange(true);

    startAnalysis(async () => {
      try {
        const formData = await buildAnalysisFormData(photosToSend);
        const result = await suggestProductDetails(formData);

        if (result.status === "error") {
          setError(result.message);
          return;
        }

        onSuggestionRef.current(result.suggestion);
      } catch {
        setError("ფოტოების ანალიზი ვერ მოხერხდა. შეამოწმეთ კავშირი და სცადეთ ხელახლა.");
      } finally {
        onAnalysingChange(false);
      }
    });
  }

  function handleReplaceDescription() {
    if (!suggestion) return;
    setReplacedDescription(description);
    onDescriptionChange(suggestion.descriptionKa);
  }

  function handleUndoReplace() {
    if (replacedDescription === null) return;
    onDescriptionChange(replacedDescription);
    setReplacedDescription(null);
  }

  const canOfferDescription =
    suggestion !== null &&
    suggestion.isFurniture &&
    suggestion.descriptionKa !== "" &&
    description !== suggestion.descriptionKa;
  const summary = suggestion
    ? getResultSummary(suggestion, selection, description, categoryId, name)
    : null;

  return (
    <section
      id="product-ai"
      // Focusable as a jump target for the description field's "analyse photos" nudge.
      tabIndex={-1}
      aria-labelledby="product-ai-heading"
      className="grid gap-3 rounded-2xl border border-hairline bg-warm-canvas p-4 outline-none lg:col-span-2 lg:p-5"
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h3
            id="product-ai-heading"
            className="inline-flex items-center gap-2 text-base font-semibold text-ink"
          >
            <Sparkles aria-hidden="true" className="size-4 text-walnut" />
            ფოტოებით შევსება
          </h3>
          <p className="mt-1 text-xs leading-5 text-quiet-ink">
            AI ფოტოებიდან შემოგთავაზებთ აღწერას, ფერს, მასალასა და სტილს. არაფერი
            ინახება — ყველაფერი გადაამოწმეთ შენახვამდე.
          </p>
        </div>

        <Button
          type="button"
          onClick={handleAnalyse}
          disabled={!canAnalyse}
          className="shrink-0"
        >
          {analysing ? (
            <LoaderCircle aria-hidden="true" className="mr-2 size-4 animate-spin" />
          ) : (
            <Sparkles aria-hidden="true" className="mr-2 size-4" />
          )}
          {analysing
            ? "ანალიზი მიმდინარეობს..."
            : suggestion
              ? "ხელახლა ანალიზი"
              : "ფოტოების ანალიზი"}
        </Button>
      </div>

      {usablePhotos.length === 0 ? (
        <p className="text-xs text-soft-brown">
          ჯერ დაამატეთ მინიმუმ ერთი ფოტო.
        </p>
      ) : usablePhotos.length > MAX_AI_ANALYSIS_IMAGES ? (
        <p className="text-xs text-soft-brown">
          ანალიზისთვის გამოყენებული იქნება პირველი {MAX_AI_ANALYSIS_IMAGES} ფოტო.
        </p>
      ) : null}

      {error ? (
        <p
          role="alert"
          className="flex items-start gap-1.5 text-xs font-medium text-destructive"
        >
          <AlertCircle aria-hidden="true" className="mt-px size-3.5 shrink-0" />
          <span>{error}</span>
        </p>
      ) : null}

      <div aria-live="polite" className="grid gap-2">
        {suggestion && !analysing ? (
          !suggestion.isFurniture ? (
            <p className="rounded-xl bg-[#fff3cd] px-3 py-2 text-xs font-medium text-[#705500]">
              ფოტოებზე ავეჯი ვერ ამოიცნო, ამიტომ ველები არ შეცვლილა.
            </p>
          ) : (
            <>
              {!suggestion.sameItem ? (
                <p className="rounded-xl bg-[#fff3cd] px-3 py-2 text-xs font-medium text-[#705500]">
                  როგორც ჩანს, ფოტოებზე სხვადასხვა ნივთია, ამიტომ ველები ავტომატურად
                  არ შეივსო. შემოთავაზებები მონიშნულია და შეგიძლიათ ხელით აირჩიოთ.
                </p>
              ) : null}

              {summary && (summary.links.length > 0 || summary.possible > 0) ? (
                <>
                  <p className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs leading-5 text-quiet-ink">
                    <span className="font-semibold text-ink">გადაამოწმეთ:</span>
                    {summary.links.map((link, index) => (
                      <span key={link.key} className="inline-flex items-center gap-2">
                        {index > 0 ? <span aria-hidden="true">·</span> : null}
                        <JumpLink targetId={link.targetId} className={RESULT_LINK_CLASS}>
                          {link.label}
                        </JumpLink>
                      </span>
                    ))}
                    {summary.possible > 0 ? (
                      <span className="inline-flex items-center gap-2">
                        {summary.links.length > 0 ? (
                          <span aria-hidden="true">·</span>
                        ) : null}
                        <JumpLink
                          targetId="product-attributes"
                          className={RESULT_LINK_CLASS}
                        >
                          შესაძლო ({summary.possible})
                        </JumpLink>
                      </span>
                    ) : null}
                  </p>
                  <p className="text-xs leading-5 text-quiet-ink">
                    <Sparkles
                      aria-hidden="true"
                      className="mr-1 inline size-3 text-walnut"
                    />
                    — AI-ს შემოთავაზება. წყვეტილი ჩარჩო ნიშნავს „შესაძლოა“ — აირჩიეთ,
                    თუ ეთანხმებით.
                  </p>
                </>
              ) : !canOfferDescription && replacedDescription === null ? (
                <p className="text-xs leading-5 text-quiet-ink">
                  AI-მ ამ ფოტოებიდან შემოთავაზება ვერ მოამზადა.
                </p>
              ) : null}

              {suggestion.materialNoteKa ? (
                <p className="text-xs leading-5 text-quiet-ink">
                  <span className="font-semibold text-ink">მასალის შესახებ: </span>
                  {suggestion.materialNoteKa}
                </p>
              ) : null}

              {replacedDescription !== null ? (
                <p className="flex flex-wrap items-center gap-2 text-xs text-quiet-ink">
                  აღწერა ჩანაცვლდა AI-ს ვერსიით.
                  <button
                    type="button"
                    onClick={handleUndoReplace}
                    className="font-semibold text-walnut underline underline-offset-2"
                  >
                    დაბრუნება
                  </button>
                </p>
              ) : canOfferDescription ? (
                // Worded neutrally on purpose: the field may hold the admin's own text, an
                // edited version of the AI's, or nothing (when photos looked like different
                // items and nothing was filled automatically).
                <p className="flex flex-wrap items-center gap-2 text-xs text-quiet-ink">
                  {description.trim() === ""
                    ? null
                    : "აღწერის ველი განსხვავდება AI-ს ვერსიისგან."}
                  <button
                    type="button"
                    onClick={handleReplaceDescription}
                    className="font-semibold text-walnut underline underline-offset-2"
                  >
                    {description.trim() === ""
                      ? "AI-ს აღწერის ჩასმა"
                      : "AI-ს ვერსიით ჩანაცვლება"}
                  </button>
                </p>
              ) : null}
            </>
          )
        ) : null}
      </div>
    </section>
  );
}
