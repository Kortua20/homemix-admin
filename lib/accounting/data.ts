import type { SupabaseClient } from "@supabase/supabase-js";

import type { ListingKind, ProductStatus } from "@/components/products/types";
import type { AccountingPeriod } from "@/lib/accounting/period";
import type { Database } from "@/lib/database.types";

// Reads the staff-only accounting views (see the storefront's schemas/10_product_finances.sql):
//   * product_sale_ledger — one row per sale, for the sales report;
//   * product_accounting  — one row per product, for the stock report.
// Shared by the page and the Excel export so the two can never disagree about what a total
// includes.
//
// Rules that every number follows:
//   * A sale's cost and list price are the snapshots taken when it was recorded, so
//     restocking at a new cost or repricing later does not rewrite past profit.
//   * A missing cost is unknown, not zero. Profit is computed only for sales whose cost is
//     known — treating an unknown cost as 0 would report the whole sale as profit — and the
//     summary carries how many lacked it so the page can say so.

// Same literal-string rule as productSelect in lib/product-data.ts: the row type is read off
// the literal.
const saleSelect =
  "id, slug, name, listing_kind, category_name, quantity, total_price, unit_cost, list_unit_price, sold_on, note";

const productSelect =
  "id, slug, name, status, listing_kind, stock_quantity, price, created_at, category_name, purchase_price";

// PostgREST caps a response at the project's max-rows (1000 by default) and does so silently.
// Totals over a truncated set would be wrong without any error, so every query pages until a
// short page comes back.
const FETCH_CHUNK = 1000;

// Statuses that are still stock: bought and not yet sold. `archived` is excluded — it is a
// mis-entered listing, not inventory.
const STOCK_STATUSES: ProductStatus[] = ["draft", "available", "reserved"];

export type SaleRow = {
  id: string;
  slug: string;
  name: string;
  categoryName: string;
  listingKind: ListingKind;
  soldOn: string;
  quantity: number;
  // Snapshot unit cost × quantity. Null when no purchase price was recorded at the time.
  cost: number | null;
  // Snapshot list price × quantity: what the sale would have brought at the advertised price.
  listTotal: number;
  // What the buyer actually paid, for all units together.
  salePrice: number;
  unitSalePrice: number;
  // listTotal − salePrice: what bargaining gave away. Negative if it sold above list.
  discount: number;
  profit: number | null;
  // profit / salePrice, as a fraction. Null when the cost is unknown or the sale was free.
  margin: number | null;
  note: string | null;
};

export type SalesSummary = {
  count: number;
  units: number;
  revenue: number;
  cost: number;
  missingCost: number;
  profit: number;
  // Sales with a known cost: the base the profit and margin are computed over.
  profitBaseCount: number;
  margin: number | null;
  listTotal: number;
  discountTotal: number;
  // Products marked `sold` with no sale recorded — everything sold before sales were
  // recorded, plus any marked sold without a price. Not tied to the period: they have no
  // date to place them in one.
  unrecordedSoldCount: number;
};

export type StockRow = {
  id: string;
  slug: string;
  name: string;
  categoryName: string;
  status: ProductStatus;
  listingKind: ListingKind;
  createdOn: string;
  quantity: number;
  purchasePrice: number | null;
  listPrice: number;
  costValue: number | null;
  listValue: number;
  potentialProfit: number | null;
};

export type StockSummary = {
  count: number;
  units: number;
  costValue: number;
  missingPurchasePrice: number;
  listValue: number;
  potentialProfit: number;
};

export type SalesReport = { view: "sales"; rows: SaleRow[]; summary: SalesSummary };
export type StockReport = { view: "stock"; rows: StockRow[]; summary: StockSummary };

// Money is summed in tetri (integer hundredths), because float addition drifts: a hundred
// rows of 0.10 do not add up to exactly 10.00 in binary floating point.
const toTetri = (value: number) => Math.round(value * 100);
const fromTetri = (value: number) => value / 100;

const toNumber = (value: number | string | null) =>
  value === null ? null : Number(value);

// Generic over the row type so each caller keeps its typed select. `page` builds a fresh,
// fully filtered and ordered query for one range; the order must be total (an id tiebreak),
// or rows can repeat or vanish between pages.
async function fetchAllRows<T>(
  page: (
    from: number,
    to: number,
  ) => PromiseLike<{ data: T[] | null; error: unknown }>,
): Promise<T[]> {
  const rows: T[] = [];

  for (let from = 0; ; from += FETCH_CHUNK) {
    const { data, error } = await page(from, from + FETCH_CHUNK - 1);

    if (error) {
      throw new Error("Accounting rows could not be loaded", { cause: error });
    }

    rows.push(...(data ?? []));

    if (!data || data.length < FETCH_CHUNK) return rows;
  }
}

export async function getSalesReport(
  supabase: SupabaseClient<Database>,
  period: Pick<AccountingPeriod, "from" | "to">,
): Promise<SalesReport> {
  const salesQuery = () => {
    let query = supabase.from("product_sale_ledger").select(saleSelect);
    if (period.from) query = query.gte("sold_on", period.from);
    if (period.to) query = query.lte("sold_on", period.to);
    return query;
  };

  const [rawRows, unrecorded] = await Promise.all([
    fetchAllRows((from, to) =>
      salesQuery()
        .order("sold_on", { ascending: false })
        .order("id", { ascending: true })
        .range(from, to),
    ),
    supabase
      .from("product_accounting")
      .select("id", { count: "exact", head: true })
      .eq("status", "sold")
      .eq("has_sales", false),
  ]);

  if (unrecorded.error) {
    throw new Error("Unrecorded sales could not be counted", {
      cause: unrecorded.error,
    });
  }

  const rows: SaleRow[] = rawRows.map((row) => {
    const quantity = Number(row.quantity ?? 1);
    const salePrice = Number(row.total_price ?? 0);
    const unitCost = toNumber(row.unit_cost);
    const listTotal = fromTetri(toTetri(Number(row.list_unit_price ?? 0)) * quantity);
    const cost = unitCost === null ? null : fromTetri(toTetri(unitCost) * quantity);
    const profit =
      cost === null ? null : fromTetri(toTetri(salePrice) - toTetri(cost));

    return {
      id: row.id ?? "",
      slug: row.slug ?? "",
      name: row.name ?? "",
      categoryName: row.category_name ?? "",
      listingKind: (row.listing_kind ?? "used_unique") as ListingKind,
      soldOn: row.sold_on ?? "",
      quantity,
      cost,
      listTotal,
      salePrice,
      unitSalePrice: salePrice / quantity,
      discount: fromTetri(toTetri(listTotal) - toTetri(salePrice)),
      profit,
      margin: profit !== null && salePrice > 0 ? profit / salePrice : null,
      note: row.note,
    };
  });

  return {
    view: "sales",
    rows,
    summary: summariseSales(rows, unrecorded.count ?? 0),
  };
}

function summariseSales(rows: SaleRow[], unrecordedSoldCount: number): SalesSummary {
  let units = 0;
  let revenue = 0;
  let cost = 0;
  let profit = 0;
  let profitBaseRevenue = 0;
  let listTotal = 0;
  let missingCost = 0;
  let profitBaseCount = 0;

  for (const row of rows) {
    units += row.quantity;
    revenue += toTetri(row.salePrice);
    listTotal += toTetri(row.listTotal);

    if (row.cost === null || row.profit === null) {
      missingCost += 1;
    } else {
      cost += toTetri(row.cost);
      profit += toTetri(row.profit);
      profitBaseRevenue += toTetri(row.salePrice);
      profitBaseCount += 1;
    }
  }

  return {
    count: rows.length,
    units,
    revenue: fromTetri(revenue),
    cost: fromTetri(cost),
    missingCost,
    profit: fromTetri(profit),
    profitBaseCount,
    margin: profitBaseRevenue > 0 ? profit / profitBaseRevenue : null,
    listTotal: fromTetri(listTotal),
    discountTotal: fromTetri(listTotal - revenue),
    unrecordedSoldCount,
  };
}

// A snapshot of what is in stock now. The period does not apply: stock has no sale date.
export async function getStockReport(
  supabase: SupabaseClient<Database>,
): Promise<StockReport> {
  const rawRows = await fetchAllRows((from, to) =>
    supabase
      .from("product_accounting")
      .select(productSelect)
      .in("status", STOCK_STATUSES)
      .order("created_at", { ascending: false })
      .order("id", { ascending: true })
      .range(from, to),
  );

  const rows: StockRow[] = rawRows
    .map((row) => {
      const listingKind = (row.listing_kind ?? "used_unique") as ListingKind;
      // A used item is one unit by definition (products_condition_matches_kind_check).
      const quantity =
        listingKind === "new_stocked" ? Number(row.stock_quantity ?? 0) : 1;
      const listPrice = Number(row.price ?? 0);
      const purchasePrice = toNumber(row.purchase_price);
      const costValue =
        purchasePrice === null
          ? null
          : fromTetri(toTetri(purchasePrice) * quantity);
      const listValue = fromTetri(toTetri(listPrice) * quantity);

      return {
        id: row.id ?? "",
        slug: row.slug ?? "",
        name: row.name ?? "",
        categoryName: row.category_name ?? "",
        status: (row.status ?? "draft") as ProductStatus,
        listingKind,
        createdOn: (row.created_at ?? "").slice(0, 10),
        quantity,
        purchasePrice,
        listPrice,
        costValue,
        listValue,
        potentialProfit:
          costValue === null
            ? null
            : fromTetri(toTetri(listValue) - toTetri(costValue)),
      };
    })
    // A new item with nothing left on the shelf holds no stock value.
    .filter((row) => row.quantity > 0);

  return { view: "stock", rows, summary: summariseStock(rows) };
}

function summariseStock(rows: StockRow[]): StockSummary {
  let units = 0;
  let costValue = 0;
  let listValue = 0;
  let potentialProfit = 0;
  let missingPurchasePrice = 0;

  for (const row of rows) {
    units += row.quantity;
    listValue += toTetri(row.listValue);

    if (row.costValue === null || row.potentialProfit === null) {
      missingPurchasePrice += 1;
    } else {
      costValue += toTetri(row.costValue);
      potentialProfit += toTetri(row.potentialProfit);
    }
  }

  return {
    count: rows.length,
    units,
    costValue: fromTetri(costValue),
    missingPurchasePrice,
    listValue: fromTetri(listValue),
    potentialProfit: fromTetri(potentialProfit),
  };
}
