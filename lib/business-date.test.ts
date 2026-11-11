import { describe, expect, it } from "vitest";

import {
  addDays,
  addMonths,
  formatIsoDate,
  isValidIsoDate,
  startOfMonth,
  todayInTbilisi,
} from "@/lib/business-date";

describe("todayInTbilisi", () => {
  // Tbilisi is UTC+4 all year (no daylight saving), so the local day flips at 20:00 UTC.
  it("is already tomorrow in Tbilisi after 20:00 UTC", () => {
    expect(todayInTbilisi(new Date("2026-11-10T20:30:00Z"))).toBe("2026-11-11");
  });

  it("is still today in Tbilisi before 20:00 UTC", () => {
    expect(todayInTbilisi(new Date("2026-11-10T19:59:59Z"))).toBe("2026-11-10");
  });

  it("zero-pads month and day", () => {
    expect(todayInTbilisi(new Date("2026-01-05T08:00:00Z"))).toBe("2026-01-05");
  });
});

describe("isValidIsoDate", () => {
  it.each(["2026-11-11", "2028-02-29", "2000-01-01"])("accepts %s", (value) => {
    expect(isValidIsoDate(value)).toBe(true);
  });

  it.each([
    ["a day that does not exist", "2026-02-30"],
    ["Feb 29 in a non-leap year", "2026-02-29"],
    ["month 13", "2026-13-01"],
    ["an unpadded date", "2026-2-3"],
    ["a timestamp", "2026-11-11T10:00:00Z"],
    ["an empty string", ""],
  ])("rejects %s", (_label, value) => {
    expect(isValidIsoDate(value)).toBe(false);
  });
});

describe("addDays", () => {
  it("crosses month and year boundaries", () => {
    expect(addDays("2026-03-01", -1)).toBe("2026-02-28");
    expect(addDays("2026-12-31", 1)).toBe("2027-01-01");
  });
});

describe("addMonths", () => {
  it("clamps to the last day of a shorter month instead of rolling over", () => {
    expect(addMonths("2026-03-31", -1)).toBe("2026-02-28");
    expect(addMonths("2028-03-31", -1)).toBe("2028-02-29");
  });

  it("crosses year boundaries", () => {
    expect(addMonths("2026-01-15", -3)).toBe("2025-10-15");
    expect(addMonths("2026-11-11", -12)).toBe("2025-11-11");
  });
});

describe("startOfMonth / formatIsoDate", () => {
  it("returns the first of the month", () => {
    expect(startOfMonth("2026-11-11")).toBe("2026-11-01");
  });

  it("formats as DD.MM.YYYY", () => {
    expect(formatIsoDate("2026-11-05")).toBe("05.11.2026");
  });
});
