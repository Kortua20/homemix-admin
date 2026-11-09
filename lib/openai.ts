import "server-only";

import OpenAI from "openai";

// Same shape as lib/r2.ts: read the configuration lazily, cache the client, and fail with a
// named error the caller can turn into a readable message. The key is read only here, on
// the server — it must never get a NEXT_PUBLIC_ prefix.
let cachedClient: OpenAI | null = null;

export function getOpenAIClient() {
  if (cachedClient) {
    return cachedClient;
  }

  const apiKey = process.env.OPENAI_API_KEY?.trim();

  if (!apiKey) {
    throw new Error("OPENAI_CONFIGURATION_MISSING");
  }

  cachedClient = new OpenAI({
    apiKey,
    // An admin is waiting on a spinner. One retry covers a transient 5xx; more would turn a
    // real outage into a minute-long wait before the error appears.
    timeout: 45_000,
    maxRetries: 1,
  });

  return cachedClient;
}

// Overridable so the model can be changed without a deploy of new code.
export function getProductAnalysisModel() {
  return process.env.OPENAI_PRODUCT_MODEL?.trim() || "gpt-6-luna";
}
