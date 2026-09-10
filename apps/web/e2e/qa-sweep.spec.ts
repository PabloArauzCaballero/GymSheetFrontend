/**
 * Barrido de QA (WS1). No es una prueba de regresión: recorre cada ruta y
 * vuelca a `qa-evidence/sweep.json` lo que encuentra —errores de consola,
 * peticiones fallidas, desbordamiento horizontal, violaciones de axe y el
 * título/encabezado de cada pantalla— para que el informe cite hechos.
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Page } from '@playwright/test';
import { admin, athlete, signIn } from './fixtures';

type Row = {
  path: string;
  role: string;
  viewport: string;
  status: number | null;
  finalUrl: string;
  title: string;
  h1: string[];
  consoleErrors: string[];
  pageErrors: string[];
  failedRequests: string[];
  overflowPx: number;
  axe: { id: string; impact: string | null | undefined; nodes: number; help: string }[];
};

const rows: Row[] = [];

const PUBLIC = ['/', '/login', '/register', '/recover-password', '/terminos', '/privacidad', '/gimnasios'];
const PORTAL = [
  '/dashboard', '/workouts', '/workouts/new', '/exercises', '/exercises/new', '/routines',
  '/trayectoria', '/membership', '/access', '/notifications', '/profile', '/plans',
  '/tutorials', '/comunidad', '/chat', '/onboarding',
];
const ADMIN = [
  '/admin', '/admin/access', '/admin/equipment', '/admin/exercises', '/admin/facilities',
  '/admin/membership', '/admin/operacion', '/admin/people', '/admin/permissions', '/admin/usuarios',
];

async function warm(page: Page, paths: string[]): Promise<void> {
  for (const path of paths) {
    await page.goto(path, { waitUntil: 'load', timeout: 120_000 }).catch(() => undefined);
    await page.waitForLoadState('domcontentloaded').catch(() => undefined);
  }
}

async function visit(page: Page, path: string, role: string, viewport: string): Promise<void> {
  const consoleErrors: string[] = [];
  const pageErrors: string[] = [];
  const failedRequests: string[] = [];
  const onConsole = (m: { type(): string; text(): string }) => {
    if (m.type() === 'error') consoleErrors.push(m.text().slice(0, 300));
  };
  const onPageError = (e: Error) => pageErrors.push(String(e.message).slice(0, 300));
  const onResponse = (r: { status(): number; url(): string; request(): { method(): string } }) => {
    if (r.status() >= 400) failedRequests.push(`${r.status()} ${r.request().method()} ${r.url().replace('http://localhost:3002', '')}`);
  };
  page.on('console', onConsole);
  page.on('pageerror', onPageError);
  page.on('response', onResponse);

  let status: number | null = null;
  for (const attempt of [0, 1]) {
    try {
      const response = await page.goto(path, { waitUntil: 'load', timeout: 120_000 });
      status = response?.status() ?? status;
    } catch (error) {
      if (attempt === 1) pageErrors.push(`NAV ${String(error).slice(0, 200)}`);
    }
    await page.waitForLoadState('domcontentloaded').catch(() => undefined);
    await page.waitForTimeout(2500);
    // `next dev` compila la ruta en la primera visita y deja el título del
    // overlay; medir ahí retrata al compilador, no a la pantalla.
    if (!(await page.title().catch(() => '')).startsWith('Loading')) break;
  }

  const overflowPx = await page
    .evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)
    .catch(() => -1);
  const title = await page.title().catch(() => '');
  const h1 = await page.locator('h1').allInnerTexts().catch(() => []);

  let axe: Row['axe'] = [];
  try {
    const results = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
      .analyze();
    axe = results.violations
      .filter((v) => v.impact === 'critical' || v.impact === 'serious' || v.impact === 'moderate')
      .map((v) => ({ id: v.id, impact: v.impact, nodes: v.nodes.length, help: v.help }));
  } catch (error) {
    axe = [{ id: 'axe-failed', impact: 'unknown', nodes: 0, help: String(error).slice(0, 160) }];
  }

  page.off('console', onConsole);
  page.off('pageerror', onPageError);
  page.off('response', onResponse);

  rows.push({
    path, role, viewport, status,
    finalUrl: page.url().replace('http://localhost:3002', ''),
    title, h1: h1.map((t) => t.trim()).slice(0, 3),
    consoleErrors: [...new Set(consoleErrors)],
    pageErrors: [...new Set(pageErrors)],
    failedRequests: [...new Set(failedRequests)],
    overflowPx, axe,
  });
}

test.afterAll(() => {
  mkdirSync('qa-evidence', { recursive: true });
  writeFileSync(`qa-evidence/sweep-${test.info().project.name}.json`, JSON.stringify(rows, null, 2));
});

test('barrido anonimo', async ({ page }) => {
  test.setTimeout(600_000);
  const anonPaths = [...PUBLIC, '/dashboard', '/admin'];
  await warm(page, anonPaths);
  for (const path of PUBLIC) await visit(page, path, 'anon', page.viewportSize()?.width + 'px');
  // Ruta protegida sin sesion: debe rebotar a /login con returnTo.
  await visit(page, '/dashboard', 'anon', page.viewportSize()?.width + 'px');
  await visit(page, '/admin', 'anon', page.viewportSize()?.width + 'px');
  expect(rows.length).toBeGreaterThan(0);
});

test('barrido atleta', async ({ page }) => {
  test.setTimeout(900_000);
  await signIn(page, athlete);
  const athletePaths = [...PORTAL, ...ADMIN, '/terminos', '/privacidad'];
  await warm(page, athletePaths);
  for (const path of athletePaths)
    await visit(page, path, 'cliente', page.viewportSize()?.width + 'px');
});

test('barrido admin', async ({ page }) => {
  test.setTimeout(900_000);
  await signIn(page, admin);
  await warm(page, [...PORTAL, ...ADMIN]);
  for (const path of [...PORTAL, ...ADMIN]) await visit(page, path, 'admin', page.viewportSize()?.width + 'px');
});
