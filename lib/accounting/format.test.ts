import { describe, expect, it } from "vitest";

import { describePeriod, formatMoney, formatPercent } from "@/lib/accounting/format";

describe("formatMoney", () => {
  it("always shows two decimals so money columns align", () => {
    expect(formatMoney(1200)).toBe("1,200.00 ₾");
    expect(formatMoney(1200.5)).toBe("1,200.50 ₾");
  });

  it("keeps the sign of a loss", () => {
    expect(formatMoney(-10)).toBe("-10.00 ₾");
  });

  it("shows an unknown figure as a dash, never as zero", () => {
    expect(formatMoney(null)).toBe("—");
    expect(formatMoney(0)).toBe("0.00 ₾");
  });
});

describe("formatPercent", () => {
  it("formats a fraction to one decimal", () => {
    expect(formatPercent(0.5)).toBe("50.0%");
    expect(formatPercent(-10 / 90)).toBe("-11.1%");
    expect(formatPercent(null)).toBe("—");
  });
});

describe("describePeriod", () => {
  it("describes every bound combination", () => {
    expect(describePeriod({ from: "2026-11-01", to: "2026-11-11" })).toBe(
      "01.11.2026 — 11.11.2026",
    );
    expect(describePeriod({ from: "2026-11-01", to: null })).toBe("01.11.2026-დან");
    expect(describePeriod({ from: null, to: "2026-11-11" })).toBe("11.11.2026-მდე");
    expect(describePeriod({ from: null, to: null })).toBe("მთელი პერიოდი");
  });
});
