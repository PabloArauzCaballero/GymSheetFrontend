// Captura las mismas pantallas servidas a dos inquilinos distintos para
// comprobar de un vistazo que cambia la identidad y no la composición.
//
// Requiere el servidor con `TENANT_THEMES` configurado.
// Uso: node scripts/capture-tenant-themes.mjs [directorio]
import { mkdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { chromium } from 'playwright-core';

const outputDirectory = resolve(process.argv[2] ?? 'e2e-evidence-theme');
const credentials = {
  email: process.env.E2E_ADMIN_EMAIL ?? 'admin.dev@gymsheet.local',
  password: process.env.E2E_ADMIN_PASSWORD ?? 'GymSheet-Admin_2026!',
};

const tenants = [
  { label: 'gymsheet', origin: 'http://localhost:3002' },
  { label: 'lifthouse', origin: 'http://127.0.0.1:3002' },
];
const routes = ['/dashboard', '/admin/membership', '/admin/people'];

mkdirSync(outputDirectory, { recursive: true });
const browser = await chromium.launch();

for (const tenant of tenants) {
  const context = await browser.newContext({ reducedMotion: 'reduce' });
  const page = await context.newPage();

  await page.goto(`${tenant.origin}/login`);
  await page.getByLabel('Correo electrónico').fill(credentials.email);
  await page.getByLabel('Contraseña').fill(credentials.password);
  await page.getByRole('button', { name: 'Iniciar sesión' }).click();
  await page.waitForURL(/\/dashboard$/u, { timeout: 30_000 });

  const skip = page.getByRole('button', { name: 'Omitir' });
  await skip.waitFor({ state: 'visible', timeout: 6_000 }).catch(() => undefined);
  if (await skip.isVisible().catch(() => false)) await skip.click();

  const identity = await page.evaluate(() => ({
    tenant: document.documentElement.dataset.tenant,
    accent: getComputedStyle(document.documentElement).getPropertyValue('--volt').trim(),
  }));
  process.stdout.write(`${tenant.origin} → ${identity.tenant} (acento ${identity.accent})\n`);

  for (const route of routes) {
    await page.goto(`${tenant.origin}${route}`);
    await page.waitForLoadState('networkidle');
    await page
      .waitForFunction(() => [...document.images].every((image) => image.complete), undefined, {
        timeout: 15_000,
      })
      .catch(() => undefined);
    const name = route.replaceAll('/', '-').replace(/^-/u, '');
    await page.screenshot({
      path: resolve(outputDirectory, `${name}-${tenant.label}.png`),
      fullPage: true,
    });
  }
  await context.close();
}

await browser.close();
process.stdout.write(`Capturas en ${outputDirectory}\n`);
