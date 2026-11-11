import type { SupabaseClient } from "@supabase/supabase-js";

import type { Database } from "@/lib/database.types";

// A stand-in for the Supabase client in unit tests. It records every query-builder call
// (`from("x").select(...).eq(...)...`, `rpc(...)`) and answers each query from a handler the
// test supplies, so a test can assert both what was asked of the database and what the code
// did with the answer — without a network or a running stack.
//
// Deliberately loose about types: the real client's generics are checked by `tsc` against
// lib/database.types.ts, and the database itself is tested by pgTAP in the storefront repo.
// What this fake checks is the code's logic around the calls.

export type RecordedOp = { method: string; args: unknown[] };

export type RecordedQuery = {
  // The table or view name, or `rpc:<function>` for a remote procedure call.
  target: string;
  ops: RecordedOp[];
};

export type FakeResult = {
  data?: unknown;
  error?: unknown;
  count?: number | null;
};

export type FakeHandler = (query: RecordedQuery) => FakeResult;

const BUILDER_METHODS = [
  "select",
  "insert",
  "update",
  "upsert",
  "delete",
  "eq",
  "neq",
  "in",
  "is",
  "gte",
  "lte",
  "ilike",
  "order",
  "range",
  "limit",
  "single",
  "maybeSingle",
] as const;

function createBuilder(query: RecordedQuery, handler: FakeHandler) {
  const builder: Record<string, unknown> = {};

  for (const method of BUILDER_METHODS) {
    builder[method] = (...args: unknown[]) => {
      query.ops.push({ method, args });
      return builder;
    };
  }

  // Awaiting the chain is what runs the query, as with the real PostgREST builder.
  builder.then = (
    resolve: (value: FakeResult) => unknown,
    reject: (reason: unknown) => unknown,
  ) => {
    try {
      const result = handler(query);
      return Promise.resolve({
        data: result.data ?? null,
        error: result.error ?? null,
        count: result.count ?? null,
      }).then(resolve, reject);
    } catch (error) {
      return Promise.reject(error).then(resolve, reject);
    }
  };

  return builder;
}

export function createFakeSupabase(handler: FakeHandler = () => ({})) {
  const queries: RecordedQuery[] = [];

  const client = {
    from(target: string) {
      const query: RecordedQuery = { target, ops: [] };
      queries.push(query);
      return createBuilder(query, handler);
    },
    rpc(name: string, args?: unknown) {
      const query: RecordedQuery = {
        target: `rpc:${name}`,
        ops: [{ method: "rpc", args: [args] }],
      };
      queries.push(query);
      return createBuilder(query, handler);
    },
  };

  return {
    client: client as unknown as SupabaseClient<Database>,
    queries,
    // Queries against one table or rpc, in the order they were made.
    queriesFor: (target: string) => queries.filter((query) => query.target === target),
  };
}

// The arguments of the first call to `method` in a recorded query, or undefined.
export function opArgs(query: RecordedQuery, method: string) {
  return query.ops.find((op) => op.method === method)?.args;
}

export function hasOp(query: RecordedQuery, method: string, ...args: unknown[]) {
  return query.ops.some(
    (op) =>
      op.method === method &&
      args.every((arg, index) => JSON.stringify(op.args[index]) === JSON.stringify(arg)),
  );
}
