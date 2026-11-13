import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

// The Excel download. The report builders and workbook writers have their own tests; this
// checks the route's own job: who may download, which report is built from which params,
// and what the response says about the file.

const { createClient, getSalesReport, getStockReport } = vi.hoisted(() => ({
  createClient: vi.fn(),
  getSalesReport: vi.fn(),
  getStockReport: vi.fn(),
}));

vi.mock("@/lib/server", () => ({ createClient }));
vi.mock("@/lib/accounting/data", () => ({ getSalesReport, getStockReport }));

import { GET } from "@/app/accounting/export/route";

const emptySales = {
  view: "sales",
  rows: [],
  summary: {
    count: 0, units: 0, revenue: 0, cost: 0, missingCost: 0, profit: 0, profitBaseCount: 0,
    margin: null, listTotal: 0, discountTotal: 0, unrecordedSoldCount: 0,
  },
};
const emptyStock = {
  view: "stock",
  rows: [],
  summary: { count: 0, units: 0, costValue: 0, missingPurchasePrice: 0, listValue: 0, potentialProfit: 0 },
};

function signIn(claims: Record<string, unknown> | null) {
  createClient.mockResolvedValue({
    auth: { getClaims: async () => ({ data: claims ? { claims } : null, error: null }) },
  });
}

const request = (query: string) => new NextRequest(`http://localhost/accounting/export?${query}`);

beforeEach(() => {
  getSalesReport.mockResolvedValue(emptySales);
  getStockReport.mockResolvedValue(emptyStock);
  vi.spyOn(console, "error").mockImplementation(() => {});
});

describe("GET /accounting/export", () => {
  it.each([
    ["no session", null],
    ["an anonymous sign-in", { sub: "a", is_anonymous: true }],
  ])("returns 401 for %s and builds nothing", async (_label, claims) => {
    signIn(claims);
    const response = await GET(request("view=sales&period=all"));
    expect(response.status).toBe(401);
    expect(getSalesReport).not.toHaveBeenCalled();
  });

  it("sends a sales workbook for the requested period as a private download", async () => {
    signIn({ sub: "staff" });
    const response = await GET(request("view=sales&period=custom&from=2026-10-01&to=2026-10-31"));

    expect(response.status).toBe(200);
    expect(getSalesReport).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ from: "2026-10-01", to: "2026-10-31" }),
    );
    expect(response.headers.get("content-type")).toBe(
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    );
    expect(response.headers.get("content-disposition")).toBe(
      'attachment; filename="homemix-sales-2026-10-01_2026-10-31.xlsx"',
    );
    // Financial figures must never sit in a shared cache.
    expect(response.headers.get("cache-control")).toBe("private, no-store");

    const bytes = new Uint8Array(await response.arrayBuffer());
    expect([bytes[0], bytes[1]]).toEqual([0x50, 0x4b]); // "PK": an .xlsx is a zip
  });

  it("names an all-time export accordingly", async () => {
    signIn({ sub: "staff" });
    const response = await GET(request("view=sales&period=all"));
    expect(response.headers.get("content-disposition")).toContain("homemix-sales-all.xlsx");
  });

  it("sends the stock workbook for the stock view", async () => {
    signIn({ sub: "staff" });
    const response = await GET(request("view=stock"));
    expect(response.status).toBe(200);
    expect(getStockReport).toHaveBeenCalled();
    expect(getSalesReport).not.toHaveBeenCalled();
    expect(response.headers.get("content-disposition")).toMatch(/homemix-stock-\d{4}-\d{2}-\d{2}\.xlsx/);
  });

  it("returns 500 with a readable message when the report fails", async () => {
    signIn({ sub: "staff" });
    getSalesReport.mockRejectedValue(new Error("db down"));
    const response = await GET(request("view=sales&period=all"));
    expect(response.status).toBe(500);
    expect(await response.text()).toMatch(/ექსპორტი ვერ შესრულდა/);
  });
});
