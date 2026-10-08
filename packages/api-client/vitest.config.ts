import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';

const pkg = (name: string) =>
  fileURLToPath(new URL(`../${name}/src/index.ts`, import.meta.url));

export default defineConfig({
  resolve: {
    alias: [
      { find: '@gymsheet/types', replacement: pkg('types') },
      { find: '@gymsheet/schemas', replacement: pkg('schemas') },
    ],
  },
  test: { environment: 'node', include: ['src/**/*.test.ts'] },
});
