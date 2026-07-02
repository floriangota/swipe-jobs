import "@testing-library/jest-dom/vitest";
import { cleanup } from "@testing-library/react";
import { afterEach } from "vitest";

// React Testing Library does not auto-clean under Vitest unless globals are on;
// do it explicitly to keep tests isolated.
afterEach(() => {
  cleanup();
});
