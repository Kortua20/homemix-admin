import "@testing-library/jest-dom/vitest";
import { cleanup } from "@testing-library/react";
import { afterEach } from "vitest";

// `server-only` is aliased to an empty stub in vitest.config.mts.

// Testing Library only unmounts automatically when Vitest globals are on; they are not, so
// each test's DOM is removed explicitly.
afterEach(() => {
  cleanup();
});
