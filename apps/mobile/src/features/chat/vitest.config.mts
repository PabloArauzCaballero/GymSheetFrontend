import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';
import webConfig from '../../../../web/vitest.config';

/**
 * Pruebas de pantalla del chat (jsdom + React Testing Library) con React Native
 * sustituido por elementos DOM. Reutiliza la configuración de la web (una sola
 * copia de React, alias de `@gymsheet/*`) pero sin su `setup.ts`, que depende de
 * `@testing-library/jest-dom`.
 *
 * Ejecutar desde `apps/mobile`:
 *   node ../../node_modules/vitest/vitest.mjs run --config src/features/chat/vitest.config.mts
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
    include: ['src/features/chat/__tests__/*.test.tsx'],
    setupFiles: [fileURLToPath(new URL('./__tests__/setup.ts', import.meta.url))],
  },
});
