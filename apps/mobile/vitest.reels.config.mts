import { fileURLToPath } from "node:url";
import { defineConfig } from "../web/node_modules/vitest/dist/config.js";
import webConfig from "../web/vitest.config";

export default defineConfig({
  ...webConfig,
  root: fileURLToPath(new URL(".", import.meta.url)),
  resolve: {
    ...webConfig.resolve,
    alias: [
      {
        find: /^@\//u,
        replacement: fileURLToPath(new URL("./src/", import.meta.url)),
      },
      ...(Array.isArray(webConfig.resolve?.alias)
        ? webConfig.resolve.alias
        : []),
    ],
  },
  test: {
    ...webConfig.test,
    include: ["src/api/reels-service.test.mjs"],
    setupFiles: [
      fileURLToPath(new URL("../web/src/test/setup.ts", import.meta.url)),
    ],
  },
});
