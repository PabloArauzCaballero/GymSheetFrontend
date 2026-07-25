import { fileURLToPath } from 'node:url';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vitest/config';

const pkg = (name: string) =>
  fileURLToPath(new URL(`../../packages/${name}/src/index.ts`, import.meta.url));

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
      '@gymsheet/types': pkg('types'),
      '@gymsheet/schemas': pkg('schemas'),
      '@gymsheet/api-client': pkg('api-client'),
      '@gymsheet/domain': pkg('domain'),
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
