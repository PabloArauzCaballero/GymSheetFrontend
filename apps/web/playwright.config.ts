import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { defineConfig, devices } from '@playwright/test';

/**
 * Credenciales de las pruebas, desde `apps/web/.env.e2e` si existe.
 *
 * Se lee a mano en vez de añadir `dotenv`: son cinco líneas y la alternativa es
 * una dependencia más en el árbol por un fichero de tres claves. Lo que ya
 * viene en el entorno gana, para que CI mande sobre el fichero local.
 */
function loadE2EEnvironment(): void {
  let contents: string;
  try {
    contents = readFileSync(resolve(__dirname, '.env.e2e'), 'utf8');
  } catch {
    return; // Sin fichero se usan los valores por defecto de e2e/fixtures.ts.
  }
  for (const line of contents.split('\n')) {
    const match = /^\s*([A-Z0-9_]+)\s*=\s*(.*)$/u.exec(line);
    if (!match) continue;
    const key = match[1];
    const rawValue = match[2];
    if (key === undefined || rawValue === undefined) continue;
    if (process.env[key] !== undefined) continue;
    process.env[key] = rawValue.trim().replace(/^["']|["']$/gu, '');
  }
}

loadE2EEnvironment();

/*
 * Requisito del backend que no es obvio hasta que la suite se atasca.
 *
 * Casi todos los flujos inician sesión, y el backend limita la autenticación a
 * `AUTH_RATE_LIMIT_MAX` peticiones por minuto — 10 por defecto. Con ese tope la
 * suite se estrangula a sí misma: el backend empieza a responder 429, el login
 * deja de completarse, y los tests caen en cascada con `waitForURL` agotando el
 * tiempo. El síntoma engaña, porque parecen veinte defectos repartidos por toda
 * la aplicación en vez de una sola causa.
 *
 * Para correr esto en local, sube el tope en el `.env` del backend antes de
 * arrancarlo. El esquema de configuración lo acota a 100, así que ese es el
 * máximo admisible:
 *
 *   AUTH_RATE_LIMIT_MAX=100
 *   RATE_LIMIT_MAX=1000
 *
 * Y devuélvelos a sus valores de producción después: el tope bajo existe para
 * que la fuerza bruta contra el login salga cara.
 */
export default defineConfig({
  testDir: './e2e',
  fullyParallel: false,
  workers: 1,
  /*
   * El servidor de pruebas es `next dev`, que compila cada ruta la primera vez
   * que alguien entra en ella. Con el límite por defecto de treinta segundos la
   * primera visita a una pantalla pesada se quedaba a medias y la navegación se
   * abortaba: cada corrida caía en una prueba distinta, siempre con un error de
   * red que no tenía relación con lo que se estaba comprobando. Un límite
   * holgado no oculta nada —los fallos de verdad siguen fallando— y quita la
   * intermitencia que hace que una suite deje de creerse.
   */
  timeout: 90_000,
  /*
   * La espera por defecto de una aserción es de cinco segundos. Con la suite
   * entera en marcha —dos proyectos, casi ochenta pruebas y el servidor de
   * desarrollo compilando— una redirección tras el acceso puede tardar más, y
   * el resultado era una tanda de fallos que decían «sigue en /login» sin que
   * el backend hubiera rechazado nada: no había defecto que arreglar, sólo una
   * espera corta.
   */
  expect: { timeout: 15_000 },
  use: {
    baseURL: 'http://localhost:3002',
    trace: 'on-first-retry',
  },
  webServer: {
    // El binario se **resuelve**, no se adivina.
    //
    // La ruta anterior era `node_modules/next/dist/bin/next` relativa a
    // `apps/web`, y ahí no existe: esto es un monorepo con Yarn Workspaces y
    // `next` queda elevado a `node_modules/` de la raíz. El servidor no
    // arrancaba nunca —`Cannot find module …/apps/web/node_modules/next`— y
    // con él caía la suite entera antes del primer test.
    //
    // `require.resolve` pregunta a Node dónde está de verdad, así que funciona
    // igual con el paquete elevado, sin elevar, o con un `nohoist` futuro.
    command: `"${process.execPath}" "${require.resolve('next/dist/bin/next')}" dev --port 3002`,
    url: 'http://localhost:3002',
    reuseExistingServer: !process.env.CI,
  },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
    { name: 'mobile', use: { ...devices['Pixel 7'] } },
  ],
});
