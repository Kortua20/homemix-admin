"use client";

import { useState } from "react";
import { Plus, Trash2 } from "lucide-react";

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

                <div className="grid gap-1.5">
                  <Label htmlFor={`flaw-image-${flaw.key}`}>ფოტო</Label>
                  <select
                    id={`flaw-image-${flaw.key}`}
                    name={`flawImage_${flaw.key}`}
                    value={flaw.imageId}
                    onChange={(event) =>
                      updateFlaw(flaw.key, { imageId: event.target.value })
                    }
                    className="h-11 w-full rounded-lg border border-[#d6c3b8] bg-white px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-[#7f512f]/30"
                  >
                    <option value="">— ფოტოს გარეშე —</option>
                    {photos.map((photo) => (
                      <option key={photo.id} value={photo.id}>
                        {photo.label}
                      </option>
                    ))}
                  </select>
                  {photos.length === 0 ? (
                    <p className="text-xs leading-5 text-[#83746b]">
                      ჯერ დაამატეთ ფოტოები, რომ ნაკლს ფოტო მიაბათ.
                    </p>
                  ) : null}
                </div>
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
