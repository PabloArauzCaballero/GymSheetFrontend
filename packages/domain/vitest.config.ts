import { defineConfig } from "vitest/config";

// Las pruebas `test/*.test.mjs` usan `node:test`; las corre `yarn test` con
// `node --test`, no vitest (que las leía como suites vacías y fallaba).
export default defineConfig({
  test: { exclude: ["node_modules/**", "test/**/*.mjs"] },
});
