import { execSync } from "node:child_process";
import path from "node:path";

import { loadEnvConfig } from "@next/env";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

import type { Database } from "@/lib/database.types";

// Access to the LOCAL Supabase stack for end-to-end tests: creating fixtures, creating the
// staff test user, and checking what landed in the database.
//
// SAFETY: these tests create users and write rows with the service-role key, which bypasses
// RLS. They must never point at production. Every entry point goes through
// assertLocalSupabase(), which refuses anything that is not a loopback address — the admin's
// .env.local has a commented-out production block that can be switched back on at any time.

// Same loader Next.js uses, so the tests see exactly the env the dev server sees.
loadEnvConfig(process.cwd());

const LOCAL_HOSTS = new Set(["127.0.0.1", "localhost", "[::1]", "::1"]);

export const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
export const publishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? "";

export function assertLocalSupabase() {
  let host = "";
  try {
    host = new URL(supabaseUrl).hostname;
  } catch {
    // falls through to the error below
  }

  if (!LOCAL_HOSTS.has(host)) {
    throw new Error(
      `E2E tests only run against a local Supabase stack, but NEXT_PUBLIC_SUPABASE_URL is "${supabaseUrl || "(unset)"}". ` +
        "Point .env.local at the local stack (`npx supabase start` in the storefront repo) and try again.",
    );
  }
}

// The service-role key, from SUPABASE_SERVICE_ROLE_KEY if set, otherwise from the local
// stack itself (`supabase status`), run in the storefront repo, which owns the stack. Asking
// the stack rather than storing the key keeps it out of every file.
function resolveServiceRoleKey() {
  if (process.env.SUPABASE_SERVICE_ROLE_KEY) return process.env.SUPABASE_SERVICE_ROLE_KEY;

  const workdir =
    process.env.SUPABASE_WORKDIR ?? path.resolve(process.cwd(), "..", "homemix");
  let status: { API_URL?: string; SERVICE_ROLE_KEY?: string };

  try {
    status = JSON.parse(
      execSync("npx --yes supabase status -o json", {
        cwd: workdir,
        encoding: "utf8",
        stdio: ["ignore", "pipe", "ignore"],
      }),
    );
  } catch {
    throw new Error(
      `Could not read the local Supabase stack from ${workdir}. Start it with \`npx supabase start\` there, ` +
        "or set SUPABASE_SERVICE_ROLE_KEY (and SUPABASE_WORKDIR if the storefront repo lives elsewhere).",
    );
  }

  // Several local stacks can run side by side; make sure this key belongs to the one the
  // app is actually using.
  if (status.API_URL?.replace(/\/$/, "") !== supabaseUrl.replace(/\/$/, "")) {
    throw new Error(
      `The stack in ${workdir} serves ${status.API_URL}, but the app uses ${supabaseUrl}.`,
    );
  }

  if (!status.SERVICE_ROLE_KEY) throw new Error("`supabase status` returned no service-role key.");
  return status.SERVICE_ROLE_KEY;
}

let adminClient: SupabaseClient<Database> | null = null;

// Service-role client: bypasses RLS. Test setup and assertions only — never app code.
export function createAdminClient() {
  assertLocalSupabase();
  adminClient ??= createClient<Database>(supabaseUrl, resolveServiceRoleKey(), {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  return adminClient;
}
