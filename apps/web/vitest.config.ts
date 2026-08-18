import { createRequire } from 'node:module';
import { dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import react from '@vitejs/plugin-react';
import type { PluginOption } from 'vite';
import { defineConfig } from 'vitest/config';

const pkg = (name: string) =>
  fileURLToPath(new URL(`../../packages/${name}/src/index.ts`, import.meta.url));

/**
 * Copia única de React para todo el árbol de pruebas.
 *
 * La aplicación móvil fija React 19.0.0 por requisito de Expo, así que el
 * monorepo convive con dos versiones y algunas dependencias de la web
 * (`@tanstack/react-query`, `react-hook-form`) terminan con una copia anidada.
 * Con dos instancias vivas, el renderer encola el trabajo en una y los hooks se
 * ejecutan contra la otra: `render()` devuelve un contenedor vacío o falla con
 * «Cannot read properties of null», sin más pistas. El empaquetador de Next
 * unifica React en la aplicación real; en las pruebas hay que hacerlo explícito.
 *
 * La referencia es la copia que usa `react-dom`, no una ruta escrita a mano,
 * para que siga siendo correcta si cambia el árbol de dependencias.
 */
const requireFromConfig = createRequire(import.meta.url);
const reactDomEntry = requireFromConfig.resolve('react-dom');
const reactDomDir = dirname(reactDomEntry);
const reactDir = dirname(createRequire(reactDomEntry).resolve('react'));

export default defineConfig({
  // The monorepo can hoist `vite` and `@vitejs/plugin-react` into separate copies of
  // the (identical) vite version; align the plugin to the vite that vitest resolves.
  plugins: [react() as PluginOption],
  resolve: {
    dedupe: ['react', 'react-dom'],
    // En forma de arreglo con expresión regular: un alias de cadena para
    // `react` capturaría también `react-dom`.
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
    // `@tanstack/react-query` y `react-hook-form` publican fuentes y traen su
    // propia copia anidada de React. Al procesarlos con Vite en vez de dejarlos
    // como externos, sus importaciones pasan por los alias de arriba y usan la
    // misma instancia que el resto.
    server: { deps: { inline: [/@tanstack\/react-query/u, /react-hook-form/u] } },
    environment: 'jsdom',
    exclude: ['e2e/**', 'node_modules/**', '.next/**'],
    globals: true,
    setupFiles: ['./src/test/setup.ts'],
  },
});
