import { fileURLToPath } from 'node:url';
import { defineConfig } from '../../../../web/node_modules/vitest/dist/config.js';
import webConfig from '../../../../web/vitest.config';

/**
 * Discovery deck hook tests (jsdom + renderHook), reusing the web config for a
 * single React copy and the `@gymsheet/*` aliases. Run from `apps/mobile`:
 *   node ../web/node_modules/vitest/vitest.mjs run --config src/features/discovery/vitest.config.mts
 */
export default defineConfig({
  ...webConfig,
  root: fileURLToPath(new URL('../../../', import.meta.url)),
  resolve: {
    ...webConfig.resolve,
    alias: [
      { find: /^@\//u, replacement: fileURLToPath(new URL('../../', import.meta.url)) },
      ...(Array.isArray(webConfig.resolve?.alias) ? webConfig.resolve.alias : []),
    ],
  },
  test: {
    ...webConfig.test,
    include: ['src/features/discovery/__tests__/*.test.tsx'],
    setupFiles: [fileURLToPath(new URL('../../../../web/src/test/setup.ts', import.meta.url))],
  },
});
