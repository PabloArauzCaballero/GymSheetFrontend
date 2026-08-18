import { createRequire } from 'node:module';
import { dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import react from '@vitejs/plugin-react';
import type { PluginOption } from 'vite';
import { defineConfig } from 'vitest/config';

const pkg = (name: string) =>
  fileURLToPath(new URL(`../../packages/${name}/src/index.ts`, import.meta.url));

/**
 * Alinea todo el árbol de pruebas con una única instancia de React.
 *
 * El monorepo termina con varias copias: la aplicación móvil fija 19.0.0 y
 * arrastra esa versión a la raíz, `react-dom` resuelve entonces una 19.2.0
 * anidada propia y la web tiene la suya. Con dos instancias vivas el renderer
 * encola el trabajo en una y `act()` lo busca en la otra, así que `render()`
 * devuelve un contenedor vacío sin error alguno —el fallo más caro de
 * diagnosticar—.
 *
 * La referencia es la copia que usa `react-dom`, no una ruta escrita a mano: si
 * el árbol de dependencias cambia, esto sigue apuntando a la correcta.
 */
const require_ = createRequire(import.meta.url);
const reactDomEntry = require_.resolve('react-dom');
const reactDomDir = dirname(reactDomEntry);
const reactDir = dirname(createRequire(reactDomEntry).resolve('react'));

export default defineConfig({
  // The monorepo can hoist `vite` and `@vitejs/plugin-react` into separate copies of
  // the (identical) vite version; align the plugin to the vite that vitest resolves.
  plugins: [react() as PluginOption],
  resolve: {
    dedupe: ['react', 'react-dom'],
    // Las entradas van en forma de arreglo con expresión regular porque un alias
    // de cadena para `react` también capturaría `react-dom`.
    alias: [
      { find: /^react$/u, replacement: reactDir },
      { find: /^react\/(.*)$/u, replacement: `${reactDir}/$1` },
      { find: /^react-dom$/u, replacement: reactDomDir },
      { find: /^react-dom\/(.*)$/u, replacement: `${reactDomDir}/$1` },
      { find: '@gymsheet/types', replacement: pkg('types') },
      { find: '@gymsheet/schemas', replacement: pkg('schemas') },
      { find: '@gymsheet/api-client', replacement: pkg('api-client') },
      { find: '@gymsheet/domain', replacement: pkg('domain') },
      { find: '@gymsheet/hooks', replacement: pkg('hooks') },
      { find: '@gymsheet/notifications', replacement: pkg('notifications') },
      { find: '@gymsheet/auth', replacement: pkg('auth') },
      { find: '@gymsheet/design-tokens', replacement: pkg('design-tokens') },
      { find: '@gymsheet/observability', replacement: pkg('observability') },
      { find: '@', replacement: fileURLToPath(new URL('./src', import.meta.url)) },
    ],
  },
  test: {
    // Vitest deja las dependencias de `node_modules` fuera de la transformación,
    // así que el `require('react')` interno de `react-dom` escapaba a los alias
    // y seguía cargando su copia anidada. Procesarlo con Vite lo somete a la
    // misma resolución que el resto y deja una única instancia viva.
    server: { deps: { inline: [/react-dom/u, /@testing-library\/react/u] } },
    environment: 'jsdom',
    exclude: ['e2e/**', 'node_modules/**', '.next/**'],
    globals: true,
    setupFiles: ['./src/test/setup.ts'],
  },
});
