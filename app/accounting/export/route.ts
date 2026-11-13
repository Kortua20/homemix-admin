import type { NextRequest } from "next/server";

import { getSalesReport, getStockReport } from "@/lib/accounting/data";
import { buildSalesWorkbook, buildStockWorkbook } from "@/lib/accounting/export";
import { parseView, resolvePeriod } from "@/lib/accounting/period";
import { todayInTbilisi } from "@/lib/business-date";
import { createClient } from "@/lib/server";

// exceljs needs Node APIs (streams, zip), and the figures must never be cached anywhere.
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Same auth gate as the image route. RLS on product_finances would return nothing to a
// non-staff caller anyway, but a 401 is a clearer answer than an empty spreadsheet.
export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const { data: authData, error: authError } = await supabase.auth.getClaims();
  const isAnonymous = authData?.claims?.is_anonymous === true;

  if (authError || !authData?.claims?.sub || isAnonymous) {
    return new Response(null, { status: 401 });
  }

  // Parsed by the same functions as the page, so the file matches what was on screen.
  const params = Object.fromEntries(request.nextUrl.searchParams);
  const view = parseView(params);
  const period = resolvePeriod(params);

  try {
    let buffer: ArrayBuffer;
    let filename: string;

    if (view === "sales") {
      const report = await getSalesReport(supabase, period);
      buffer = await buildSalesWorkbook(report, period);
      const range =
        period.from || period.to
          ? `${period.from ?? "start"}_${period.to ?? todayInTbilisi()}`
          : "all";
      filename = `homemix-sales-${range}.xlsx`;
    } else {
      const report = await getStockReport(supabase);
      buffer = await buildStockWorkbook(report);
      filename = `homemix-stock-${todayInTbilisi()}.xlsx`;
    }

    return new Response(buffer, {
      headers: {
        "Content-Type":
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        // ASCII-only filename, so no header encoding is needed and every browser and OS
        // saves it under the same name.
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Cache-Control": "private, no-store",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch (error) {
    console.error("Accounting export failed", error);
    return new Response("ექსპორტი ვერ შესრულდა. სცადეთ თავიდან.", {
      status: 500,
      headers: { "Content-Type": "text/plain; charset=utf-8" },
    });
  }
}
