import { fileURLToPath } from 'node:url';
import react from '@vitejs/plugin-react';
import type { PluginOption } from 'vite';
import { defineConfig } from 'vitest/config';

const pkg = (name: string) =>
  fileURLToPath(new URL(`../../packages/${name}/src/index.ts`, import.meta.url));

export default defineConfig({
  // The monorepo can hoist `vite` and `@vitejs/plugin-react` into separate copies of
  // the (identical) vite version; align the plugin to the vite that vitest resolves.
  plugins: [react() as PluginOption],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
      '@gymsheet/types': pkg('types'),
      '@gymsheet/schemas': pkg('schemas'),
      '@gymsheet/api-client': pkg('api-client'),
      '@gymsheet/domain': pkg('domain'),
      '@gymsheet/hooks': pkg('hooks'),
      '@gymsheet/auth': pkg('auth'),
      '@gymsheet/design-tokens': pkg('design-tokens'),
      '@gymsheet/observability': pkg('observability'),
    },
  },
  test: {
    environment: 'jsdom',
    exclude: ['e2e/**', 'node_modules/**', '.next/**'],
    globals: true,
    setupFiles: ['./src/test/setup.ts'],
  },
});
