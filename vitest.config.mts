import { fileURLToPath } from "node:url";

import react from "@vitejs/plugin-react";
import tsconfigPaths from "vite-tsconfig-paths";
import { defineConfig } from "vitest/config";

// Unit and component tests. Set up as the Next.js testing guide describes
// (node_modules/next/dist/docs/01-app/02-guides/testing/vitest.md).
//
// Async Server Components (the accounting page, the product page) cannot be rendered here —
// Vitest does not support them yet — so they are covered by the Playwright suite in e2e/.
export default defineConfig({
  plugins: [tsconfigPaths(), react()],
  resolve: {
    alias: {
      "server-only": fileURLToPath(new URL("./test/server-only-stub.ts", import.meta.url)),
    },
  },
  test: {
    environment: "jsdom",
    setupFiles: ["./vitest.setup.ts"],
    include: ["**/*.test.{ts,tsx}"],
    exclude: ["node_modules/**", ".next/**", "e2e/**"],
    // Tests never talk to Supabase, R2 or OpenAI: each one mocks the client it needs. Clearing
    // mocks between tests keeps one test's stubbed responses from leaking into the next.
    clearMocks: true,
    restoreMocks: true,
  },
});
