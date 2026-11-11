# Testing — admin

| Command | Tool | What it covers |
| --- | --- | --- |
| `pnpm test` | Vitest + Testing Library | Logic and components: periods and dates, money parsing, report totals, the Excel workbook, the sale server actions and export route (with Supabase mocked), the sale and finance forms, the accounting tables. |
| `pnpm test:e2e` | Playwright | Whole flows in a real browser against the local stack: recording, reporting, exporting and undoing sales; used-item sales through the form; the accounting page; the stale-form guard. |

`pnpm test:watch` re-runs Vitest on save. The **database** tests (grants, RLS, the sale functions) live
with the schema in the storefront repo: `npm run test:db` there.

## Prerequisites for E2E

- **The local Supabase stack**, started from the storefront repo (`npx supabase start`), with
  `.env.local` pointing at it. The suite aborts unless `NEXT_PUBLIC_SUPABASE_URL` is a loopback address,
  and checks that the service-role key belongs to that same stack.
- **The storefront repo next to this one** (`../homemix`), where the service-role key is read with
  `npx supabase status`. Elsewhere, set `SUPABASE_WORKDIR`, or `SUPABASE_SERVICE_ROLE_KEY` directly.
- **Google Chrome**, used locally instead of downloading Playwright's Chromium. CI uses
  `npx playwright install chromium`.
- `pnpm test:e2e` reuses a dev server on port 3001, or starts one.

## How E2E stays safe and repeatable

- **Staff login:** `e2e/auth.setup.ts` signs in once as `e2e-staff@homemix.test`, a local-only user.
  Its password is generated fresh on every run and set through the local Auth admin API, so no
  credential exists in the repo or the environment.
- **Test data:** each test creates its own category and products with unique slugs (`e2e/support/fixtures.ts`)
  and removes them afterwards, sales first because of the RESTRICT foreign key. Tests never depend on
  seed data and never touch real rows.
- **Serial runs:** tests run one at a time; one dev server compiling pages for parallel workers is
  slower and flakier.

## Conventions

- Unit and component tests sit next to the code they test (`lib/accounting/data.test.ts`).
- `test/fake-supabase.ts` stands in for the Supabase client: it records every query-builder call and
  answers from a handler, so tests assert both what was asked of the database and what the code did
  with the answer.
- Rules that need testing live in plain modules (`lib/accounting/*`), not in `"use server"` files,
  whose every export is a browser-callable endpoint.
- Query by what a user perceives — role, label, visible text — not by CSS classes.
- Async Server Components (the accounting and product pages) are covered by E2E only: Vitest can't
  render them yet (see the Next.js testing guide in `node_modules/next/dist/docs`).
