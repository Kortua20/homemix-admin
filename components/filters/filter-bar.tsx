"use client";

import { ChevronDown, Search, SlidersHorizontal, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useId, useRef, useState } from "react";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  RANGE_MAX_SUFFIX,
  RANGE_MIN_SUFFIX,
  buildListHref,
  countActiveFilters,
} from "@/lib/filters/url";
import {
  type FilterSchema,
  type FilterValues,
  type RangeValue,
  asList,
  asRange,
  asText,
} from "@/lib/filters/types";
import { cn } from "@/lib/utils";

// Renders any FilterSchema. Knows nothing about products — adding orders means passing a
// different schema, not touching this file.
//
// Two tiers, as asked: the field marked `primary` stays in the always-visible bar, and
// everything else lives behind a "filters" toggle. The toggle carries a count badge,
// because a collapsed panel that is silently narrowing the list is the main way this
// pattern misleads people.

type FilterBarProps = {
  schema: FilterSchema;
  // Server-parsed values: what the results actually reflect.
  values: FilterValues;
  pathname: string;
  // Lets the parent show a pending state while the server re-queries.
  startTransition: (callback: () => void) => void;
};

// Text typing debounces; every other control commits immediately. A checkbox or a select is
// a deliberate single act, so waiting 300ms after one just feels broken.
const SEARCH_DEBOUNCE_MS = 300;

export function FilterBar({
  schema,
  values,
  pathname,
  startTransition,
}: FilterBarProps) {
  const router = useRouter();
  const panelId = useId();
  const activeCount = countActiveFilters(schema, values);
  // Open by default when filters are already active, so a shared link does not hide the
  // reason its results look narrow.
  const [open, setOpen] = useState(activeCount > 0);

  const primary = schema.find(
    (field) => field.kind === "text" && field.primary,
  );
  const rest = schema.filter((field) => field !== primary);

  // Commits a change to the URL. Always resets to page 1: a new filter has nothing to do
  // with the page you were on, and keeping the offset lands on an empty page more often
  // than not.
  const commit = (next: FilterValues) => {
    startTransition(() => {
      router.replace(buildListHref(pathname, schema, next, 1), {
        scroll: false,
      });
    });
  };

  const clearAll = () => {
    startTransition(() => {
      router.replace(pathname, { scroll: false });
    });
    setOpen(false);
  };

  return (
    <div className="rounded-3xl bg-white p-4 shadow-[0_10px_20px_rgba(0,0,0,0.04)] lg:mt-8 lg:rounded-xl lg:border lg:border-[#e4e2e1] lg:p-4 lg:shadow-[0_10px_20px_rgba(0,0,0,0.02)]">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
        {primary && primary.kind === "text" ? (
          <PrimarySearch
            key={asText(values, primary.param)}
            field={primary}
            values={values}
            schema={schema}
            pathname={pathname}
            startTransition={startTransition}
          />
        ) : null}

        {rest.length > 0 ? (
          <div className="flex shrink-0 items-center gap-2">
            <button
              type="button"
              onClick={() => setOpen((value) => !value)}
              aria-expanded={open}
              aria-controls={panelId}
              className={cn(
                "inline-flex h-12 items-center gap-2 rounded-lg border px-4 text-sm font-semibold transition-colors",
                activeCount > 0
                  ? "border-[#7f512f] bg-[#fdf6f1] text-[#7f512f]"
                  : "border-[#d6c3b8] bg-white text-[#2b2926] hover:bg-[#fcf9f8]",
              )}
            >
              <SlidersHorizontal aria-hidden="true" className="size-4" />
              ფილტრები
              {activeCount > 0 ? (
                <span className="inline-flex size-5 items-center justify-center rounded-full bg-[#7f512f] text-xs font-bold text-white">
                  {activeCount}
                </span>
              ) : null}
              <ChevronDown
                aria-hidden="true"
                className={cn(
                  "size-4 transition-transform",
                  open && "rotate-180",
                )}
              />
            </button>

            {activeCount > 0 ? (
              <button
                type="button"
                onClick={clearAll}
                className="inline-flex h-12 items-center gap-1.5 rounded-lg px-3 text-sm font-semibold text-[#605e5b] transition-colors hover:bg-[#f0eded]"
              >
                <X aria-hidden="true" className="size-4" />
                გასუფთავება
              </button>
            ) : null}
          </div>
        ) : null}
      </div>

      {open && rest.length > 0 ? (
        <div
          id={panelId}
          className="mt-4 grid gap-4 border-t border-[#e4e2e1] pt-4 sm:grid-cols-2 lg:grid-cols-3"
        >
          {rest.map((field) => (
            <FilterControl
              key={field.param}
              field={field}
              values={values}
              onChange={commit}
            />
          ))}
        </div>
      ) : null}
    </div>
  );
}

// The always-visible text box. Split out and keyed on the committed value by the parent so
// an external URL change (back/forward, clear-all) remounts it with fresh state, rather
// than this component copying props into state inside an effect.
function PrimarySearch({
  field,
  values,
  schema,
  pathname,
  startTransition,
}: {
  field: Extract<FilterSchema[number], { kind: "text" }>;
  values: FilterValues;
  schema: FilterSchema;
  pathname: string;
  startTransition: (cb: () => void) => void;
}) {
  const router = useRouter();
  const committed = asText(values, field.param);
  const [draft, setDraft] = useState(committed);
  const lastPushedRef = useRef(committed);
  // The other filters are read through a ref rather than tracked as a dependency: including
  // them would restart the debounce timer every time any other control changes, so a
  // half-typed search would never commit while someone is also ticking checkboxes.
  const latestRef = useRef({ values, schema, pathname, startTransition });
  useEffect(() => {
    latestRef.current = { values, schema, pathname, startTransition };
  });

  // A genuine effect: it synchronizes an external system (the address bar) with local state
  // on a timer. It writes no state of its own.
  useEffect(() => {
    const trimmed = draft.trim();
    if (trimmed === lastPushedRef.current) return;

    const timer = setTimeout(() => {
      lastPushedRef.current = trimmed;
      const current = latestRef.current;
      const next = { ...current.values, [field.param]: trimmed };
      current.startTransition(() => {
        // replace, not push: one history entry per keystroke-pause would make Back walk
        // backwards through the search one letter at a time. Page 1, because a new search
        // has nothing to do with the page you were on.
        router.replace(buildListHref(current.pathname, current.schema, next, 1), {
          scroll: false,
        });
      });
    }, SEARCH_DEBOUNCE_MS);

    return () => clearTimeout(timer);
  }, [draft, field.param, router]);

  return (
    <div className="relative min-w-0 flex-1">
      <Search
        aria-hidden="true"
        className="pointer-events-none absolute left-4 top-1/2 size-4.5 -translate-y-1/2 text-[#605e5b]"
      />
      <Input
        type="search"
        value={draft}
        onChange={(event) => setDraft(event.target.value)}
        aria-label={field.label}
        placeholder={field.placeholder ?? field.label}
        className="h-12 border-[#d6c3b8] bg-white pl-11 text-base placeholder:text-[#83746b] lg:border-transparent lg:bg-[#fcf9f8]"
      />
    </div>
  );
}

// One control per field kind. The switch is the only place that knows how a kind renders,
// so adding a new kind touches this function and the types — not any list.
function FilterControl({
  field,
  values,
  onChange,
}: {
  field: FilterSchema[number];
  values: FilterValues;
  onChange: (next: FilterValues) => void;
}) {
  const controlId = useId();

  switch (field.kind) {
    case "text":
      return (
        <div className="min-w-0">
          <Label htmlFor={controlId} className="text-sm font-semibold">
            {field.label}
          </Label>
          <Input
            id={controlId}
            type="search"
            defaultValue={asText(values, field.param)}
            placeholder={field.placeholder}
            onBlur={(event) =>
              onChange({ ...values, [field.param]: event.target.value.trim() })
            }
            className="mt-1.5 h-11 border-[#d6c3b8] bg-white"
          />
        </div>
      );

    case "select":
      return (
        <div className="min-w-0">
          <Label htmlFor={controlId} className="text-sm font-semibold">
            {field.label}
          </Label>
          <select
            id={controlId}
            value={asText(values, field.param)}
            onChange={(event) =>
              onChange({ ...values, [field.param]: event.target.value })
            }
            className="mt-1.5 h-11 w-full rounded-lg border border-[#d6c3b8] bg-white px-3 text-sm text-[#2b2926] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#7f512f]"
          >
            <option value="">{field.placeholder ?? "ყველა"}</option>
            {field.options.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>
      );

    case "multi": {
      const selected = asList(values, field.param);
      return (
        <fieldset className="min-w-0">
          <legend className="text-sm font-semibold">{field.label}</legend>
          {/* Capped height with scroll: colours and materials have 13-17 entries each, and
              three unbounded lists would push the results grid off the screen. */}
          <div className="mt-1.5 max-h-40 space-y-1.5 overflow-y-auto rounded-lg border border-[#d6c3b8] bg-white p-2.5">
            {field.options.map((option) => {
              const checked = selected.includes(option.value);
              return (
                <label
                  key={option.value}
                  className="flex cursor-pointer items-center gap-2 text-sm text-[#2b2926]"
                >
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={() =>
                      onChange({
                        ...values,
                        [field.param]: checked
                          ? selected.filter((v) => v !== option.value)
                          : [...selected, option.value],
                      })
                    }
                    className="size-4 accent-[#7f512f]"
                  />
                  {option.hex ? (
                    <span
                      aria-hidden="true"
                      className="size-3.5 shrink-0 rounded-full border border-[#d6c3b8]"
                      style={{ backgroundColor: option.hex }}
                    />
                  ) : null}
                  <span className="truncate">{option.label}</span>
                </label>
              );
            })}
          </div>
        </fieldset>
      );
    }

    case "range": {
      const range = asRange(values, field.param);
      const update = (next: RangeValue) =>
        onChange({ ...values, [field.param]: next });
      // Committed on blur rather than per keystroke: a partially-typed "1" in a min-price
      // box is a filter nobody asked for.
      const parse = (raw: string) => {
        const text = raw.trim();
        if (!text) return undefined;
        const parsed = Number(text);
        return Number.isFinite(parsed) && parsed >= 0 ? parsed : undefined;
      };

      return (
        <fieldset className="min-w-0">
          <legend className="text-sm font-semibold">
            {field.label}
            {field.unit ? ` (${field.unit})` : ""}
          </legend>
          <div className="mt-1.5 flex items-center gap-2">
            <Input
              type="number"
              inputMode="numeric"
              min={field.min ?? 0}
              max={field.max}
              defaultValue={range.min ?? ""}
              aria-label={`${field.label} — მინიმუმი`}
              placeholder="მინ"
              onBlur={(event) =>
                update({ ...range, min: parse(event.target.value) })
              }
              className="h-11 border-[#d6c3b8] bg-white"
            />
            <span aria-hidden="true" className="text-[#83746b]">
              —
            </span>
            <Input
              type="number"
              inputMode="numeric"
              min={field.min ?? 0}
              max={field.max}
              defaultValue={range.max ?? ""}
              aria-label={`${field.label} — მაქსიმუმი`}
              placeholder="მაქს"
              onBlur={(event) =>
                update({ ...range, max: parse(event.target.value) })
              }
              className="h-11 border-[#d6c3b8] bg-white"
            />
          </div>
        </fieldset>
      );
    }
  }
}

export { RANGE_MAX_SUFFIX, RANGE_MIN_SUFFIX };
