import { describe, expect, it } from "vitest";

import {
  buildAccountingHref,
  parseView,
  resolvePeriod,
} from "@/lib/accounting/period";

const TODAY = "2026-11-11";
const resolve = (params: Record<string, string>) => resolvePeriod(params, TODAY);

describe("resolvePeriod presets", () => {
  it("defaults to the current calendar month", () => {
    expect(resolve({})).toEqual({ preset: "this-month", from: "2026-11-01", to: TODAY });
  });

  it.each([
    ["7d", "2026-11-05"],
    ["1m", "2026-10-12"],
    ["3m", "2026-08-12"],
    ["6m", "2026-05-12"],
    ["1y", "2025-11-12"],
  ])("%s ends today and includes it", (preset, from) => {
    expect(resolve({ period: preset })).toEqual({ preset, from, to: TODAY });
  });

  it("6 months back from a month's last day clamps into a short February", () => {
    // 31 August − 6 months is 28 February (no 31st), so the range starts 1 March.
    expect(resolvePeriod({ period: "6m" }, "2026-08-31")).toEqual({
      preset: "6m",
      from: "2026-03-01",
      to: "2026-08-31",
    });
  });

  it("'all' has no bounds", () => {
    expect(resolve({ period: "all" })).toEqual({ preset: "all", from: null, to: null });
  });

  it("falls back to the default for an unknown preset", () => {
    expect(resolve({ period: "bogus" }).preset).toBe("this-month");
  });
});

describe("resolvePeriod custom ranges", () => {
  it("uses both dates", () => {
    expect(resolve({ period: "custom", from: "2026-10-01", to: "2026-10-31" })).toEqual({
      preset: "custom",
      from: "2026-10-01",
      to: "2026-10-31",
      error: undefined,
    });
  });

  it("treats dates without a preset as custom", () => {
    expect(resolve({ from: "2026-01-01" }).preset).toBe("custom");
  });

  it("allows an open end on either side", () => {
    expect(resolve({ period: "custom", from: "2026-10-01" })).toMatchObject({
      from: "2026-10-01",
      to: null,
    });
    expect(resolve({ period: "custom", to: "2026-10-01" })).toMatchObject({
      from: null,
      to: "2026-10-01",
    });
  });

  it("swaps reversed bounds", () => {
    expect(resolve({ period: "custom", from: "2026-10-31", to: "2026-10-01" })).toMatchObject({
      from: "2026-10-01",
      to: "2026-10-31",
    });
  });

  it("drops only the invalid bound, keeps the other, and says so", () => {
    const period = resolve({ period: "custom", from: "2026-13-01", to: "2026-10-01" });
    expect(period.from).toBeNull();
    expect(period.to).toBe("2026-10-01");
    expect(period.error).toBeTruthy();
  });

  it("reads the first value of a repeated param", () => {
    expect(
      resolvePeriod({ period: ["7d", "all"] } as Record<string, string[]>, TODAY).preset,
    ).toBe("7d");
  });
});

describe("parseView", () => {
  it("accepts stock and defaults to sales", () => {
    expect(parseView({ view: "stock" })).toBe("stock");
    expect(parseView({ view: "nope" })).toBe("sales");
    expect(parseView({})).toBe("sales");
  });
});

describe("buildAccountingHref", () => {
  it("writes dates only for a custom range", () => {
    expect(
      buildAccountingHref("/accounting", "sales", {
        preset: "custom",
        from: "2026-10-01",
        to: null,
      }),
    ).toBe("/accounting?view=sales&period=custom&from=2026-10-01");
    expect(
      buildAccountingHref("/accounting", "sales", {
        preset: "7d",
        from: "2026-11-05",
        to: TODAY,
      }),
    ).toBe("/accounting?view=sales&period=7d");
  });

  it("leaves the period off the stock view, which has none", () => {
    expect(
      buildAccountingHref("/accounting/export", "stock", {
        preset: "7d",
        from: null,
        to: null,
      }),
    ).toBe("/accounting/export?view=stock");
  });

  it("round-trips through resolvePeriod", () => {
    const href = buildAccountingHref("/accounting", "sales", {
      preset: "custom",
      from: "2026-10-01",
      to: "2026-10-31",
    });
    const params = Object.fromEntries(new URL(href, "http://x").searchParams);
    expect(resolve(params)).toMatchObject({ from: "2026-10-01", to: "2026-10-31" });
  });
});
