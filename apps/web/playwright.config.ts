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
    command: `"${process.execPath}" node_modules/next/dist/bin/next dev --port 3002`,
    url: 'http://localhost:3002',
    reuseExistingServer: !process.env.CI,
  },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
    { name: 'mobile', use: { ...devices['Pixel 7'] } },
  ],
});
