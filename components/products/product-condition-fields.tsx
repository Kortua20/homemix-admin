"use client";

import { useState } from "react";
import { Check, Plus, Trash2 } from "lucide-react";

import { cn } from "@/lib/utils";

import type {
  ConditionAspect,
  ConditionGrade,
  ProductConditionAspect,
  ProductFlaw,
} from "@/components/products/types";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  FLAW_SEVERITY_LABELS,
  FLAW_TYPE_LABELS,
  FLAW_SEVERITIES,
  FLAW_TYPES,
} from "@/lib/flaw-data";

// A photo the flaw rows can be anchored to. New photos carry the id the images field
// minted for them, so a flaw can reference a photo that does not exist server-side yet.
export type AnchorablePhoto = {
  id: string;
  label: string;
  previewUrl?: string;
};

type FlawRow = {
  key: string;
  flawType: string;
  severity: string;
  location: string;
  note: string;
  imageId: string;
};

type ProductConditionFieldsProps = {
  aspects: ConditionAspect[];
  grades: ConditionGrade[];
  photos: AnchorablePhoto[];
  existingAspects?: ProductConditionAspect[];
  existingFlaws?: ProductFlaw[];
  serverError?: string;
};

function emptyFlawRow(): FlawRow {
  return {
    key: crypto.randomUUID(),
    flawType: "scratch",
    severity: "minor",
    location: "",
    note: "",
    imageId: "",
  };
}

export function ProductConditionFields({
  aspects,
  grades,
  photos,
  existingAspects = [],
  existingFlaws = [],
  serverError,
}: ProductConditionFieldsProps) {
  const [flaws, setFlaws] = useState<FlawRow[]>(() =>
    existingFlaws.map((flaw) => ({
      key: flaw.id,
      flawType: flaw.flawType,
      severity: flaw.severity,
      location: flaw.locationKa ?? "",
      note: flaw.noteKa,
      imageId: flaw.imageId ?? "",
    })),
  );

  const existingAspectByCode = new Map(
    existingAspects.map((aspect) => [aspect.aspectCode, aspect]),
  );

  function updateFlaw(key: string, patch: Partial<FlawRow>) {
    setFlaws((current) =>
      current.map((flaw) => (flaw.key === key ? { ...flaw, ...patch } : flaw)),
    );
  }

  return (
    <div className="grid gap-6 lg:col-span-2">
      <section
        aria-labelledby="condition-aspects-heading"
        className="rounded-2xl border border-[#e4e2e1] p-4 lg:p-5"
      >
        <h3
          id="condition-aspects-heading"
          className="text-base font-semibold text-[#1b1c1c]"
        >
          მდგომარეობა დეტალურად
        </h3>
        <p className="mt-1 text-xs leading-5 text-[#605e5b]">
          თითოეული ნაწილის ცალკე შეფასება მყიდველს ეხმარება გაიგოს, ეხება თუ არა
          ნაკლი მას. დატოვეთ ცარიელი, თუ არ ეხება ამ ნივთს.
        </p>

        <div className="mt-4 grid gap-3">
          {aspects.map((aspect) => {
            const existing = existingAspectByCode.get(aspect.code);

            return (
              <div
                key={aspect.code}
                className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] sm:items-center"
              >
                <div>
                  <Label htmlFor={`aspect-${aspect.code}`}>
                    {aspect.labelKa}
                  </Label>
                  <p className="mt-0.5 text-xs leading-4 text-[#83746b]">
                    {aspect.descriptionKa}
                  </p>
                </div>
                <div className="grid gap-2">
                  <select
                    id={`aspect-${aspect.code}`}
                    name={`aspectGrade_${aspect.code}`}
                    defaultValue={existing?.gradeCode ?? ""}
                    className="h-11 w-full rounded-lg border border-[#d6c3b8] bg-white px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-[#7f512f]/30"
                  >
                    <option value="">— არ ეხება —</option>
                    {grades.map((grade) => (
                      <option key={grade.code} value={grade.code}>
                        {grade.labelKa}
                      </option>
                    ))}
                  </select>
                  <Input
                    name={`aspectNote_${aspect.code}`}
                    defaultValue={existing?.note ?? ""}
                    placeholder="შენიშვნა (სურვილისამებრ)"
                    maxLength={500}
                    className="h-11 border-[#d6c3b8] bg-white"
                  />
                </div>
              </div>
            );
          })}
        </div>
      </section>

      <section
        aria-labelledby="product-flaws-heading"
        className="rounded-2xl border border-[#e4e2e1] p-4 lg:p-5"
      >
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h3
              id="product-flaws-heading"
              className="text-base font-semibold text-[#1b1c1c]"
            >
              ნაკლოვანებები
            </h3>
            <p className="mt-1 text-xs leading-5 text-[#605e5b]">
              ჩამოთვალეთ კონკრეტული ნაკლი და, სადაც შესაძლებელია, მიაბით ფოტო.
              ფოტოზე ნაჩვენები ნაკლი ნდობას იწვევს, დამალული — პირიქით.
            </p>
          </div>
          <button
            type="button"
            onClick={() => setFlaws((current) => [...current, emptyFlawRow()])}
            className="inline-flex h-10 shrink-0 items-center gap-2 rounded-lg border border-[#7f512f] px-4 text-sm font-semibold text-[#7f512f] transition-colors hover:bg-[#f9f3ef]"
          >
            <Plus aria-hidden="true" className="size-4" />
            ნაკლის დამატება
          </button>
        </div>

        {flaws.length === 0 ? (
          <p className="mt-4 rounded-xl bg-[#f7f5f4] px-4 py-3 text-sm leading-6 text-[#605e5b]">
            ნაკლი ჯერ არ არის ჩამატებული. თუ ნივთს ნაკლი აქვს, დაამატეთ — ეს
            ამცირებს დაბრუნებებს და ზრდის ნდობას.
          </p>
        ) : (
          <ul className="mt-4 grid gap-4">
            {flaws.map((flaw, index) => (
              <li
                key={flaw.key}
                className="grid gap-3 rounded-xl bg-[#faf8f7] p-3 lg:p-4"
              >
                {/* Grouped by index so the server can reassemble each row. */}
                <input type="hidden" name="flawKeys" value={flaw.key} />

                <div className="flex items-center justify-between gap-3">
                  <span className="text-xs font-semibold text-[#83746b]">
                    ნაკლი {index + 1}
                  </span>
                  <button
                    type="button"
                    onClick={() =>
                      setFlaws((current) =>
                        current.filter((row) => row.key !== flaw.key),
                      )
                    }
                    aria-label={`ნაკლი ${index + 1} — ამოღება`}
                    className="flex size-9 items-center justify-center rounded-lg text-[#c62828] transition-colors hover:bg-[#fdeceb]"
                  >
                    <Trash2 aria-hidden="true" className="size-4" />
                  </button>
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="grid gap-1.5">
                    <Label htmlFor={`flaw-type-${flaw.key}`}>ტიპი</Label>
                    <select
                      id={`flaw-type-${flaw.key}`}
                      name={`flawType_${flaw.key}`}
                      value={flaw.flawType}
                      onChange={(event) =>
                        updateFlaw(flaw.key, { flawType: event.target.value })
                      }
                      className="h-11 w-full rounded-lg border border-[#d6c3b8] bg-white px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-[#7f512f]/30"
                    >
                      {FLAW_TYPES.map((type) => (
                        <option key={type} value={type}>
                          {FLAW_TYPE_LABELS[type]}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="grid gap-1.5">
                    <Label htmlFor={`flaw-severity-${flaw.key}`}>
                      სიმძიმე
                    </Label>
                    <select
                      id={`flaw-severity-${flaw.key}`}
                      name={`flawSeverity_${flaw.key}`}
                      value={flaw.severity}
                      onChange={(event) =>
                        updateFlaw(flaw.key, { severity: event.target.value })
                      }
                      className="h-11 w-full rounded-lg border border-[#d6c3b8] bg-white px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-[#7f512f]/30"
                    >
                      {FLAW_SEVERITIES.map((severity) => (
                        <option key={severity} value={severity}>
                          {FLAW_SEVERITY_LABELS[severity]}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="grid gap-1.5">
                  <Label htmlFor={`flaw-location-${flaw.key}`}>
                    ადგილმდებარეობა
                  </Label>
                  <Input
                    id={`flaw-location-${flaw.key}`}
                    name={`flawLocation_${flaw.key}`}
                    value={flaw.location}
                    onChange={(event) =>
                      updateFlaw(flaw.key, { location: event.target.value })
                    }
                    placeholder="მაგალითად: მარცხენა ფეხი"
                    maxLength={160}
                    className="h-11 border-[#d6c3b8] bg-white"
                  />
                </div>

                <div className="grid gap-1.5">
                  <Label htmlFor={`flaw-note-${flaw.key}`}>აღწერა</Label>
                  <textarea
                    id={`flaw-note-${flaw.key}`}
                    name={`flawNote_${flaw.key}`}
                    value={flaw.note}
                    onChange={(event) =>
                      updateFlaw(flaw.key, { note: event.target.value })
                    }
                    rows={2}
                    maxLength={500}
                    required
                    placeholder="რა არის ზუსტად და რამდენად შესამჩნევია."
                    className="w-full resize-y rounded-lg border border-[#d6c3b8] bg-white px-3 py-2 text-sm leading-6 outline-none placeholder:text-[#83746b] focus-visible:ring-2 focus-visible:ring-[#7f512f]/30"
                  />
                </div>

                {/* Anchoring a flaw to its photo is the whole point of this section, and a
                    <select> of file names made it guesswork: nobody knows which of
                    IMG_4821 and IMG_4822 shows the scratch. The thumbnails are the same
                    images the upload field already renders, so this adds no new data path
                    — only the ability to see what you are choosing.

                    A radio group, not buttons: one photo per flaw is exactly radio
                    semantics, it gives keyboard users arrow-key navigation for free, and
                    the value still submits under the same field name the server reads. */}
                <fieldset className="grid gap-1.5">
                  <legend className="mb-1.5 text-sm font-semibold leading-[1.4] tracking-wider text-[#51443c]">
                    ფოტო
                  </legend>

                  {photos.length === 0 ? (
                    <p className="text-xs leading-5 text-[#83746b]">
                      ჯერ დაამატეთ ფოტოები, რომ ნაკლს ფოტო მიაბათ.
                    </p>
                  ) : (
                    <div className="flex flex-wrap gap-2">
                      {photos.map((photo, index) => {
                        const selected = flaw.imageId === photo.id;
                        const inputId = `flaw-${flaw.key}-photo-${photo.id}`;

                        return (
                          <div key={photo.id} className="relative">
                            {/* Visually hidden rather than `hidden`: a hidden input is
                                removed from the tab order and unreachable by keyboard. */}
                            <input
                              type="radio"
                              id={inputId}
                              name={`flawImage_${flaw.key}`}
                              value={photo.id}
                              checked={selected}
                              onChange={() =>
                                updateFlaw(flaw.key, { imageId: photo.id })
                              }
                              className="peer sr-only"
                            />
                            <label
                              htmlFor={inputId}
                              title={photo.label}
                              className={cn(
                                "block cursor-pointer overflow-hidden rounded-lg border-2 transition-colors",
                                "peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-[#7f512f]",
                                selected
                                  ? "border-[#7f512f]"
                                  : "border-transparent hover:border-[#d6c3b8]",
                              )}
                            >
                              {photo.previewUrl ? (
                                // eslint-disable-next-line @next/next/no-img-element
                                <img
                                  src={photo.previewUrl}
                                  alt={photo.label}
                                  className="size-16 object-cover"
                                />
                              ) : (
                                <span className="grid size-16 place-items-center bg-[#f3ede9] text-xs text-[#83746b]">
                                  {index + 1}
                                </span>
                              )}
                            </label>

                            {selected ? (
                              <span
                                aria-hidden="true"
                                className="pointer-events-none absolute -top-1.5 -right-1.5 grid size-5 place-items-center rounded-full bg-[#7f512f] text-white"
                              >
                                <Check className="size-3" />
                              </span>
                            ) : null}
                          </div>
                        );
                      })}

                      {/* The escape hatch. Some real flaws — an odour, a wobble — have no
                          meaningful photo, and product_flaws.image_id is nullable for
                          exactly that reason. Without this the radio group would be a trap:
                          once a photo is picked there is no way back to none. */}
                      <div className="relative">
                        <input
                          type="radio"
                          id={`flaw-${flaw.key}-photo-none`}
                          name={`flawImage_${flaw.key}`}
                          value=""
                          checked={flaw.imageId === ""}
                          onChange={() => updateFlaw(flaw.key, { imageId: "" })}
                          className="peer sr-only"
                        />
                        <label
                          htmlFor={`flaw-${flaw.key}-photo-none`}
                          className={cn(
                            "grid size-16 cursor-pointer place-items-center rounded-lg border-2 border-dashed px-1 text-center text-[11px] leading-tight transition-colors",
                            "peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-[#7f512f]",
                            flaw.imageId === ""
                              ? "border-[#7f512f] bg-[#f7f1ec] text-[#7f512f]"
                              : "border-[#d6c3b8] text-[#83746b] hover:border-[#7f512f]",
                          )}
                        >
                          ფოტოს გარეშე
                        </label>
                      </div>
                    </div>
                  )}
                </fieldset>
              </li>
            ))}
          </ul>
        )}

        {serverError ? (
          <p className="mt-4 text-xs font-medium text-[#c62828]">
            {serverError}
          </p>
        ) : null}
      </section>
    </div>
  );
}
