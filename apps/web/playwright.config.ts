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
