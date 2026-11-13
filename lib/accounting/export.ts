import ExcelJS from "exceljs";

import { PRODUCT_STATUS_LABELS, LISTING_KIND_LABELS } from "@/lib/product-data";
import type { SalesReport, StockReport } from "@/lib/accounting/data";
import { describePeriod } from "@/lib/accounting/format";
import type { AccountingPeriod } from "@/lib/accounting/period";
import { formatIsoDate, todayInTbilisi } from "@/lib/business-date";

// .xlsx rather than CSV. A CSV's separator is interpreted by the reader's locale, and Excel
// in a Georgian (or most European) locale expects ";" — a comma-separated file opens as one
// column of text there. xlsx also keeps money as numbers and dates as dates, so the
// accountant can sum, filter and pivot without converting anything first.
//
// Two sheets: a summary first (what the page's cards show), then the rows with a totals line
// built from SUM formulas, so the totals stay right if a row is corrected in the file.

const MONEY_FORMAT = "#,##0.00";
const DATE_FORMAT = "dd.mm.yyyy";
const PERCENT_FORMAT = "0.0%";
const HEADER_FILL: ExcelJS.Fill = {
  type: "pattern",
  pattern: "solid",
  fgColor: { argb: "FFF6F3F2" },
};

// Excel stores a date as a day count. exceljs derives it from the Date's UTC time, so a
// UTC-midnight Date lands on exactly the calendar day — never the day before, which a
// local-midnight Date would in any timezone east of UTC.
function excelDate(iso: string | null) {
  if (!iso) return null;
  const [year, month, day] = iso.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, day));
}

type Column = {
  header: string;
  key: string;
  width: number;
  numFmt?: string;
  // SUM in the totals row. Columns without it (dates, per-unit prices) are left blank.
  total?: boolean;
};

function addDataSheet(
  workbook: ExcelJS.Workbook,
  name: string,
  columns: Column[],
  rows: Record<string, unknown>[],
  totalsLabel: string,
) {
  const sheet = workbook.addWorksheet(name, {
    views: [{ state: "frozen", ySplit: 1 }],
  });

  sheet.columns = columns.map(({ header, key, width, numFmt }) => ({
    header,
    key,
    width,
    style: numFmt ? { numFmt } : undefined,
  }));

  const header = sheet.getRow(1);
  header.font = { bold: true };
  header.fill = HEADER_FILL;
  header.alignment = { vertical: "middle", wrapText: true };
  header.height = 30;

  rows.forEach((row) => sheet.addRow(row));

  // Filter dropdowns on the header, over the data only — not the totals row, which a filter
  // would otherwise sort into the middle of the data.
  sheet.autoFilter = {
    from: { row: 1, column: 1 },
    to: { row: Math.max(rows.length + 1, 1), column: columns.length },
  };

  const lastDataRow = rows.length + 1;
  const totals = sheet.addRow({ [columns[0].key]: totalsLabel });
  totals.font = { bold: true };
  totals.fill = HEADER_FILL;

  columns.forEach((column, index) => {
    if (!column.total || rows.length === 0) return;
    const letter = sheet.getColumn(index + 1).letter;
    totals.getCell(index + 1).value = {
      formula: `SUM(${letter}2:${letter}${lastDataRow})`,
    };
  });

  return sheet;
}

function addSummarySheet(
  workbook: ExcelJS.Workbook,
  title: string,
  lines: [string, string | number | null, string?][],
  notes: string[],
) {
  const sheet = workbook.addWorksheet("შეჯამება");
  sheet.columns = [
    { key: "label", width: 42 },
    { key: "value", width: 22 },
  ];

  const titleRow = sheet.addRow([title]);
  titleRow.font = { bold: true, size: 14 };
  sheet.addRow([]);

  for (const [label, value, numFmt] of lines) {
    const row = sheet.addRow([label, value ?? "—"]);
    row.getCell(1).font = { bold: true };
    if (numFmt && typeof value === "number") row.getCell(2).numFmt = numFmt;
  }

  if (notes.length > 0) {
    sheet.addRow([]);
    const heading = sheet.addRow(["შენიშვნა"]);
    heading.font = { bold: true };
    notes.forEach((note) => sheet.addRow([note]));
  }

  return sheet;
}

export async function buildSalesWorkbook(
  report: SalesReport,
  period: Pick<AccountingPeriod, "from" | "to">,
) {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "Home Mix";
  workbook.created = new Date();

  const { summary } = report;
  const notes: string[] = [];
  if (summary.unrecordedSoldCount > 0) {
    notes.push(
      `${summary.unrecordedSoldCount} პროდუქტი მონიშნულია გაყიდულად, მაგრამ გაყიდვა არ არის დაფიქსირებული — ფაილში არ შედის.`,
    );
  }
  if (summary.missingCost > 0) {
    notes.push(
      `${summary.missingCost} გაყიდვას შესყიდვის ფასი არ ჰქონდა — მოგება დათვლილია ${summary.profitBaseCount} გაყიდვაზე.`,
    );
  }

  addSummarySheet(
    workbook,
    "Home Mix — გაყიდვები",
    [
      ["პერიოდი", describePeriod(period)],
      ["ექსპორტის თარიღი", formatIsoDate(todayInTbilisi())],
      ["გაყიდვები", summary.count],
      ["გაყიდული ცალი", summary.units],
      ["შემოსავალი (ფაქტიური), ₾", summary.revenue, MONEY_FORMAT],
      ["შესყიდვის ღირებულება, ₾", summary.cost, MONEY_FORMAT],
      ["მოგება, ₾", summary.profit, MONEY_FORMAT],
      ["მარჟა", summary.margin, PERCENT_FORMAT],
      ["საიტის ფასით იქნებოდა, ₾", summary.listTotal, MONEY_FORMAT],
      ["ვაჭრობით დათმობილი, ₾", summary.discountTotal, MONEY_FORMAT],
    ],
    notes,
  );

  addDataSheet(
    workbook,
    "გაყიდვები",
    [
      { header: "გაყიდვის თარიღი", key: "soldOn", width: 14, numFmt: DATE_FORMAT },
      { header: "პროდუქტი", key: "name", width: 40 },
      { header: "კატალოგი", key: "category", width: 20 },
      { header: "ტიპი", key: "kind", width: 12 },
      { header: "რაოდენობა", key: "quantity", width: 11, total: true },
      { header: "შესყიდვის ფასი, ₾", key: "cost", width: 16, numFmt: MONEY_FORMAT, total: true },
      { header: "საიტის ფასით, ₾", key: "list", width: 16, numFmt: MONEY_FORMAT, total: true },
      { header: "გაყიდვის ფასი, ₾", key: "sale", width: 16, numFmt: MONEY_FORMAT, total: true },
      { header: "ერთეულის ფასი, ₾", key: "unit", width: 16, numFmt: MONEY_FORMAT },
      { header: "ფასდაკლება, ₾", key: "discount", width: 15, numFmt: MONEY_FORMAT, total: true },
      { header: "მოგება, ₾", key: "profit", width: 15, numFmt: MONEY_FORMAT, total: true },
      { header: "მარჟა", key: "margin", width: 10, numFmt: PERCENT_FORMAT },
      { header: "შენიშვნა", key: "note", width: 30 },
    ],
    report.rows.map((row) => ({
      soldOn: excelDate(row.soldOn),
      name: row.name,
      category: row.categoryName,
      kind: LISTING_KIND_LABELS[row.listingKind],
      quantity: row.quantity,
      // Blank cells, not 0, for unknown figures — SUM skips blanks, so the file's totals
      // follow the same "unknown is not zero" rule as the page.
      cost: row.cost,
      list: row.listTotal,
      sale: row.salePrice,
      unit: row.unitSalePrice,
      discount: row.discount,
      profit: row.profit,
      margin: row.margin,
      note: row.note ?? "",
    })),
    `სულ (${summary.count})`,
  );

  return workbook.xlsx.writeBuffer();
}

export async function buildStockWorkbook(report: StockReport) {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "Home Mix";
  workbook.created = new Date();

  const { summary } = report;

  addSummarySheet(
    workbook,
    "Home Mix — მარაგი",
    [
      ["მდგომარეობა", formatIsoDate(todayInTbilisi())],
      ["პროდუქტები", summary.count],
      ["ერთეულები", summary.units],
      ["ღირებულება შესყიდვის ფასით, ₾", summary.costValue, MONEY_FORMAT],
      ["ღირებულება საიტის ფასით, ₾", summary.listValue, MONEY_FORMAT],
      ["მოსალოდნელი მოგება, ₾", summary.potentialProfit, MONEY_FORMAT],
    ],
    summary.missingPurchasePrice > 0
      ? [
          `${summary.missingPurchasePrice} პროდუქტს შესყიდვის ფასი არ აქვს — შესყიდვის ღირებულებასა და მოსალოდნელ მოგებაში არ ითვლება.`,
        ]
      : [],
  );

  addDataSheet(
    workbook,
    "მარაგი",
    [
      { header: "დამატებულია", key: "createdOn", width: 14, numFmt: DATE_FORMAT },
      { header: "პროდუქტი", key: "name", width: 40 },
      { header: "კატალოგი", key: "category", width: 20 },
      { header: "ტიპი", key: "kind", width: 12 },
      { header: "სტატუსი", key: "status", width: 16 },
      { header: "რაოდენობა", key: "quantity", width: 11, total: true },
      { header: "შესყიდვის ფასი (ერთ.), ₾", key: "purchase", width: 18, numFmt: MONEY_FORMAT },
      { header: "საიტის ფასი (ერთ.), ₾", key: "list", width: 18, numFmt: MONEY_FORMAT },
      { header: "ღირებულება (შესყიდვით), ₾", key: "costValue", width: 20, numFmt: MONEY_FORMAT, total: true },
      { header: "ღირებულება (საიტით), ₾", key: "listValue", width: 20, numFmt: MONEY_FORMAT, total: true },
      { header: "მოსალოდნელი მოგება, ₾", key: "potential", width: 20, numFmt: MONEY_FORMAT, total: true },
    ],
    report.rows.map((row) => ({
      createdOn: excelDate(row.createdOn || null),
      name: row.name,
      category: row.categoryName,
      kind: LISTING_KIND_LABELS[row.listingKind],
      status: PRODUCT_STATUS_LABELS[row.status],
      quantity: row.quantity,
      purchase: row.purchasePrice,
      list: row.listPrice,
      costValue: row.costValue,
      listValue: row.listValue,
      potential: row.potentialProfit,
    })),
    `სულ (${summary.count})`,
  );

  return workbook.xlsx.writeBuffer();
}
