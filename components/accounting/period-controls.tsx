import Form from "next/form";
import Link from "next/link";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { describePeriod } from "@/lib/accounting/format";
import {
  buildAccountingHref,
  PERIOD_LABELS,
  PERIOD_PRESETS,
  type AccountingPeriod,
} from "@/lib/accounting/period";
import { todayInTbilisi } from "@/lib/business-date";
import { cn } from "@/lib/utils";

// Presets are links and the custom range is a GET form, so the period lives only in the URL
// and there is no client state to fall out of step with what the server queried. next/form
// keeps the submit a client-side navigation, so loading.tsx shows instead of a full reload.

const CHIP_CLASS =
  "inline-flex h-10 items-center rounded-full border px-4 text-sm transition-colors";

export function PeriodControls({ period }: { period: AccountingPeriod }) {
  const presets = PERIOD_PRESETS.filter((preset) => preset !== "custom");

  return (
    <div className="mt-4 rounded-3xl bg-white p-4 shadow-[0_10px_20px_rgba(0,0,0,0.04)] lg:p-5">
      <nav aria-label="პერიოდი" className="flex flex-wrap gap-2">
        {presets.map((preset) => {
          const active = period.preset === preset;
          return (
            <Link
              key={preset}
              href={buildAccountingHref("/accounting", "sales", {
                preset,
                from: null,
                to: null,
              })}
              aria-current={active ? "page" : undefined}
              className={cn(
                CHIP_CLASS,
                active
                  ? "border-walnut bg-warm-mist font-semibold text-walnut"
                  : "border-clay-border bg-white font-medium text-quiet-ink hover:border-walnut",
              )}
            >
              {PERIOD_LABELS[preset]}
            </Link>
          );
        })}
      </nav>

      <Form
        action="/accounting"
        className="mt-4 flex flex-col gap-3 border-t border-hairline pt-4 sm:flex-row sm:items-end"
      >
        <input type="hidden" name="view" value="sales" />
        <input type="hidden" name="period" value="custom" />
        <div className="grid gap-1.5">
          <Label htmlFor="accounting-from">დან</Label>
          <Input
            id="accounting-from"
            name="from"
            type="date"
            min="2000-01-01"
            max={todayInTbilisi()}
            // Keyed so a preset click, which changes the applied range, resets the input to
            // it — defaultValue alone is only read on mount.
            key={`from-${period.from ?? ""}`}
            defaultValue={period.from ?? ""}
            className="h-11 border-clay-border bg-white"
          />
        </div>
        <div className="grid gap-1.5">
          <Label htmlFor="accounting-to">მდე</Label>
          <Input
            id="accounting-to"
            name="to"
            type="date"
            min="2000-01-01"
            max={todayInTbilisi()}
            key={`to-${period.to ?? ""}`}
            defaultValue={period.to ?? ""}
            className="h-11 border-clay-border bg-white"
          />
        </div>
        <button
          type="submit"
          className={cn(
            "inline-flex h-11 items-center justify-center rounded-lg px-5 text-sm font-semibold transition-colors",
            period.preset === "custom"
              ? "bg-walnut text-white hover:bg-walnut-deep"
              : "border border-clay-border text-quiet-ink hover:border-walnut hover:text-walnut",
          )}
        >
          თარიღებით ჩვენება
        </button>
      </Form>

      <p className="mt-3 text-sm text-quiet-ink" role="status">
        ნაჩვენებია:{" "}
        <span className="font-semibold text-ink tabular-nums">
          {describePeriod(period)}
        </span>
      </p>
      {period.error ? (
        <p className="mt-2 text-sm font-medium text-destructive-ink">{period.error}</p>
      ) : null}
    </div>
  );
}
