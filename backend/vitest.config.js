import { defineConfig } from "vitest/config";

// The default 'node' environment and 'forks' pool are correct for the native
// better-sqlite3 module — no overrides needed. setupFiles runs before any test
// module (and its imports) evaluate, which is where the test DB env is fixed.
export default defineConfig({
  test: {
    setupFiles: ["./test/setup.js"],
  },
});
