/**
 * Exhaustive click-sweep evidence generator.
 *
 * Logs in with real mock users against the live NestJS backend and, for every
 * client-facing route, clicks EACH interactive element in document order,
 * capturing a screenshot per click as evidence.
 *
 * Isolation strategy: the page is reloaded fresh before every single click so
 * each interaction starts from a deterministic state (querySelectorAll returns
 * document order, which is stable across identical loads). This makes the sweep
 * robust even when a click mutates or replaces the DOM.
 *
 * Safety:
 *  - native confirm()/prompt() dialogs are DISMISSED (cancel) so destructive
 *    "are you sure?" flows never commit.
 *  - popups (target=_blank / WhatsApp) are screenshotted then closed.
 *  - the logout control is skipped during sweeps and tested once at the end.
 *
 * Usage: node scripts/click-sweep.mjs
 */
import { chromium } from 'playwright';
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const BASE = process.env.SWEEP_BASE_URL ?? 'http://localhost:3002';
const PASSWORD = process.env.E2E_ATHLETE_PASSWORD ?? 'GymSheet-Demo_2026!';
const OUT_ROOT = join(process.cwd(), 'click-evidence');

const INTERACTIVE =
  'a[href], button, [role="button"], [role="tab"], [role="switch"], [role="menuitem"], [role="link"], summary, input[type="submit"], label[for], [onclick]';

// Client routes reachable by a CLIENTE role (admin routes are role-gated).
const CLIENT_ROUTES = [
  '/dashboard',
  '/workouts',
  '/workouts/new',
  '/plans',
  '/routines',
  '/exercises',
  '/exercises/new',
  '/membership',
  '/access',
  '/notifications',
  '/profile',
  '/tutorials',
];

const LOGOUT_RE = /cerrar sesi[oó]n|logout|salir/iu;

const results = [];
let shotCounter = 0;

function slug(s) {
  return (s || 'element')
    .toString()
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/gu, '-')
    .replace(/^-+|-+$/gu, '')
    .slice(0, 48) || 'element';
}

async function screenshot(page, dir, name) {
  const n = String(++shotCounter).padStart(3, '0');
  const file = join(dir, `${n}_${slug(name)}.png`);
  try {
    await page.screenshot({ path: file, fullPage: true });
  } catch {
    await page.screenshot({ path: file }); // fallback: viewport only
  }
  return file;
}

let currentUser = null;
let currentPassword = PASSWORD;

async function login(page, email, password = PASSWORD) {
  let lastErr;
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      // Clear cookies so /login always renders the form (never redirects when a
      // stale/valid session lingers), keeping the flow deterministic.
      await page.context().clearCookies();
      await page.goto(`${BASE}/login`, { waitUntil: 'domcontentloaded' });
      await page.getByLabel('Correo electrónico').fill(email, { timeout: 12_000 });
      await page.getByLabel('Contraseña').fill(password, { timeout: 12_000 });
      await page.getByRole('button', { name: 'Iniciar sesión' }).click();
      await page.waitForURL((u) => !/\/login/u.test(u.pathname), { timeout: 20_000 });
      await page.waitForLoadState('networkidle').catch(() => {});
      currentUser = email;
      currentPassword = password;
      return;
    } catch (e) {
      lastErr = e;
      console.log(`  [login attempt ${attempt}/3 failed] ${String(e).slice(0, 90)}`);
      await page.waitForTimeout(1200);
    }
  }
  throw new Error(`login failed for ${email}: ${String(lastErr).slice(0, 120)}`);
}

/**
 * The mock JWT lives ~15 min. Rather than react to lapses, re-authenticate
 * proactively before every route so each sweep starts with a fresh token.
 */
async function ensureSession(page) {
  if (!currentUser) return;
  await login(page, currentUser, currentPassword);
}

/** Enumerate resiliently: a client-side navigation can destroy the JS context. */
async function safeEnumerate(page) {
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      return await enumerate(page);
    } catch (e) {
      if (attempt === 3) throw e;
      await page.waitForTimeout(500);
      await page.waitForLoadState('networkidle').catch(() => {});
    }
  }
  return [];
}

/** Describe visible/enabled interactive elements deterministically. */
async function enumerate(page) {
  return page.$$eval(INTERACTIVE, (els, logoutSrc) => {
    const LOGOUT_RE = new RegExp(logoutSrc, 'iu');
    const out = [];
    els.forEach((el, domIndex) => {
      const style = getComputedStyle(el);
      const rect = el.getBoundingClientRect();
      const visible =
        style.visibility !== 'hidden' &&
        style.display !== 'none' &&
        Number(style.opacity) > 0.05 &&
        rect.width > 0 &&
        rect.height > 0;
      const disabled = el.hasAttribute('disabled') || el.getAttribute('aria-disabled') === 'true';
      const name = (
        el.getAttribute('aria-label') ||
        el.textContent ||
        el.getAttribute('title') ||
        el.getAttribute('name') ||
        ''
      )
        .replace(/\s+/gu, ' ')
        .trim();
      out.push({
        domIndex,
        tag: el.tagName.toLowerCase(),
        role: el.getAttribute('role') || '',
        href: el.getAttribute('href') || '',
        target: el.getAttribute('target') || '',
        name,
        visible,
        disabled,
        isLogout: LOGOUT_RE.test(name),
      });
    });
    return out;
  }, LOGOUT_RE.source);
}

function actionable(list) {
  // Deterministic filter mirrored between the count pass and each click pass.
  return list.filter((e) => e.visible && !e.disabled && !e.isLogout);
}

async function sweepRoute(page, route, dir) {
  const routeDir = join(dir, slug(route));
  mkdirSync(routeDir, { recursive: true });

  await ensureSession(page);
  // Baseline page evidence.
  await page.goto(`${BASE}${route}`, { waitUntil: 'domcontentloaded' });
  await page.waitForLoadState('networkidle').catch(() => {});
  const landed = new URL(page.url()).pathname;
  await screenshot(page, routeDir, `page${landed !== route ? `_redirected_to_${slug(landed)}` : ''}`);

  const baseline = actionable(await safeEnumerate(page));
  const routeResult = {
    route,
    landed,
    total: baseline.length,
    clicks: [],
  };
  console.log(`\n=== ${route} (landed ${landed}) — ${baseline.length} clickable elements ===`);

  for (let i = 0; i < baseline.length; i++) {
    // Fresh, isolated state before each click.
    await page.goto(`${BASE}${route}`, { waitUntil: 'domcontentloaded' });
    await page.waitForLoadState('networkidle').catch(() => {});
    // Session may have lapsed mid-route → re-auth and reload the route.
    if (currentUser && /\/login/u.test(new URL(page.url()).pathname) && route !== '/login') {
      await login(page, currentUser, currentPassword);
      await page.goto(`${BASE}${route}`, { waitUntil: 'domcontentloaded' });
      await page.waitForLoadState('networkidle').catch(() => {});
    }

    let fullMeta;
    try {
      fullMeta = await safeEnumerate(page);
    } catch {
      routeResult.clicks.push({ index: i, status: 'enumerate-failed' });
      continue;
    }
    const live = actionable(fullMeta);
    if (i >= live.length) break;
    const meta = live[i];

    // Re-locate the same element via its full-selector nth in document order.
    const handles = await page.$$(INTERACTIVE);
    // Map filtered index back to a real handle by replaying the same filter.
    const keptDomIndexes = live.map((e) => e.domIndex);
    const domIndex = keptDomIndexes[i];
    const handle = handles[domIndex];
    if (!handle) {
      routeResult.clicks.push({ index: i, name: meta.name, status: 'vanished' });
      continue;
    }

    const label = `${String(i + 1).padStart(2, '0')}_${meta.tag}${meta.role ? '-' + meta.role : ''}_${meta.name || meta.href}`;
    let popup = null;
    const onPopup = (p) => {
      popup = p;
    };
    page.on('popup', onPopup);

    let status = 'clicked';
    try {
      await handle.scrollIntoViewIfNeeded({ timeout: 3000 }).catch(() => {});
      // Highlight the target for the evidence shot.
      await handle.evaluate((el) => {
        el.style.outline = '3px solid #ff2d55';
        el.style.outlineOffset = '2px';
      }).catch(() => {});
      await handle.click({ timeout: 5000 });
      await page.waitForLoadState('networkidle').catch(() => {});
      await page.waitForTimeout(350);
    } catch (err) {
      status = 'click-failed';
      // Try a forced click as a fallback (covers overlay/animation cases).
      try {
        await handle.click({ timeout: 3000, force: true });
        status = 'clicked-forced';
        await page.waitForTimeout(300);
      } catch {
        /* record failure below */
      }
      if (status === 'click-failed') {
        routeResult.clicks.push({ index: i, name: meta.name, status, error: String(err).slice(0, 120) });
        page.off('popup', onPopup);
        continue;
      }
    }

    const afterPath = new URL(page.url()).pathname;
    const nav = afterPath !== landed;

    if (popup) {
      await popup.waitForLoadState('domcontentloaded').catch(() => {});
      const pshot = await screenshot(popup, routeDir, `${label}__popup`);
      await popup.close().catch(() => {});
      routeResult.clicks.push({
        index: i,
        name: meta.name,
        tag: meta.tag,
        status: 'opened-popup',
        popupUrl: popup.url?.() ?? '',
        screenshot: pshot,
      });
    } else {
      const shot = await screenshot(page, routeDir, `${label}${nav ? `__nav_${slug(afterPath)}` : ''}`);
      routeResult.clicks.push({
        index: i,
        name: meta.name,
        tag: meta.tag,
        role: meta.role,
        href: meta.href,
        status,
        navigatedTo: nav ? afterPath : null,
        screenshot: shot,
      });
    }
    page.off('popup', onPopup);
  }

  results.push(routeResult);
  return routeResult;
}

async function run() {
  const runId = process.env.SWEEP_RUN_ID || 'run';
  const outDir = join(OUT_ROOT, runId);
  mkdirSync(outDir, { recursive: true });

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    locale: 'es-ES',
  });
  const page = await context.newPage();

  // Global safety: cancel native confirm/prompt so destructive flows don't commit.
  page.on('dialog', (d) => {
    console.log(`  [dialog:${d.type()}] "${d.message().slice(0, 60)}" -> dismiss`);
    d.dismiss().catch(() => {});
  });

  // ---------- ADMIN-ONLY MODE (supplemental) ----------
  // Sweeps the role-gated admin routes with the seeded admin account, appending
  // evidence to the same run dir. Guarded so the main flow stays untouched.
  if (process.env.SWEEP_MODE === 'admin') {
    const adminEmail = process.env.ADMIN_EMAIL ?? 'admin.dev@gymsheet.local';
    const adminPassword = process.env.ADMIN_PASSWORD ?? PASSWORD;
    const ADMIN_ROUTES = process.env.SWEEP_ADMIN_ROUTES
      ? process.env.SWEEP_ADMIN_ROUTES.split(',').map((r) => r.trim()).filter(Boolean)
      : [
          '/admin',
          '/admin/equipment',
          '/admin/exercises',
          '/admin/facilities',
          '/admin/membership',
          '/admin/access',
        ];
    const adminDir = join(outDir, '05_admin');
    mkdirSync(adminDir, { recursive: true });
    try {
      await login(page, adminEmail, adminPassword);
      await screenshot(page, adminDir, 'after-login-landing');
      for (const route of ADMIN_ROUTES) {
        await sweepRoute(page, route, adminDir).catch((e) =>
          console.error(`admin route ${route} failed:`, e.message),
        );
      }
    } catch (e) {
      console.error('admin section failed:', e.message);
    } finally {
      await browser.close().catch(() => {});
    }
    const adminClicks = results.reduce((a, r) => a + r.clicks.length, 0);
    writeFileSync(
      join(outDir, 'report-admin.json'),
      JSON.stringify({ base: BASE, mode: 'admin', routes: results }, null, 2),
    );
    console.log('\n=== ADMIN SUMMARY ===');
    console.log(`Admin routes swept: ${results.length}, clicks: ${adminClicks}, screenshots: ${shotCounter}`);
    for (const r of results) console.log(`  ${r.route} -> ${r.clicks.length}/${r.total} (landed ${r.landed})`);
    return;
  }

  try {
    // ---------- 1) Public pages (unauthenticated) ----------
    const publicDir = join(outDir, '00_public');
    mkdirSync(publicDir, { recursive: true });
    await sweepRoute(page, '/login', publicDir);
    await sweepRoute(page, '/register', publicDir);

    // ---------- 2) active.mock — full client sweep ----------
    const activeDir = join(outDir, '01_active_mock');
    mkdirSync(activeDir, { recursive: true });
    await login(page, 'active.mock@gymsheet.local');
    await screenshot(page, activeDir, 'after-login-landing');
    for (const route of CLIENT_ROUTES) {
      await sweepRoute(page, route, activeDir).catch((e) =>
        console.error(`route ${route} failed:`, e.message),
      );
    }
    // Detail routes that need a real id: derive first exercise id from the catalog.
    try {
      await ensureSession(page);
      await page.goto(`${BASE}/exercises`, { waitUntil: 'domcontentloaded' });
      await page.waitForLoadState('networkidle').catch(() => {});
      // Pick a real exercise DETAIL link (a UUID), never /new or an /edit route.
      const firstDetail = await page.$$eval('a[href^="/exercises/"]', (as) =>
        as
          .map((a) => a.getAttribute('href'))
          .find((h) => /\/exercises\/[0-9a-f-]{8,}$/u.test(h) && !/\/(new|edit)$/u.test(h)),
      );
      if (firstDetail) {
        await sweepRoute(page, firstDetail, activeDir);
        await sweepRoute(page, `${firstDetail}/edit`, activeDir);
      }
    } catch (e) {
      console.error('exercise detail sweep failed:', e.message);
    }

    // ---------- 3) new.mock — onboarding flow ----------
    try {
      const newDir = join(outDir, '02_new_mock');
      mkdirSync(newDir, { recursive: true });
      await login(page, 'new.mock@gymsheet.local');
      await screenshot(page, newDir, 'after-login-landing');
      await sweepRoute(page, '/onboarding', newDir);
    } catch (e) {
      console.error('new.mock section failed:', e.message);
    }

    // ---------- 4) expired.mock — membership / renewal ----------
    try {
      const expiredDir = join(outDir, '03_expired_mock');
      mkdirSync(expiredDir, { recursive: true });
      await login(page, 'expired.mock@gymsheet.local');
      await screenshot(page, expiredDir, 'after-login-landing');
      await sweepRoute(page, '/membership', expiredDir);
      await sweepRoute(page, '/dashboard', expiredDir);
    } catch (e) {
      console.error('expired.mock section failed:', e.message);
    }

    // ---------- 5) logout (tested explicitly at the very end) ----------
    try {
      const logoutDir = join(outDir, '04_logout');
      mkdirSync(logoutDir, { recursive: true });
      await login(page, 'active.mock@gymsheet.local');
      await page.goto(`${BASE}/dashboard`, { waitUntil: 'domcontentloaded' });
      await screenshot(page, logoutDir, 'before-logout');
      await page.getByRole('button', { name: 'Cerrar sesión' }).first().click().catch(() => {});
      await page.waitForLoadState('networkidle').catch(() => {});
      await page.waitForTimeout(1000);
      await screenshot(page, logoutDir, `after-logout_${slug(new URL(page.url()).pathname)}`);
    } catch (e) {
      console.error('logout section failed:', e.message);
    }
  } finally {
    await browser.close().catch(() => {});
  }

  // ---------- report ----------
  const totalClicks = results.reduce((a, r) => a + r.clicks.length, 0);
  const failures = results.flatMap((r) =>
    r.clicks.filter((c) => c.status === 'click-failed').map((c) => ({ route: r.route, ...c })),
  );
  const report = {
    base: BASE,
    routesSwept: results.length,
    totalClicks,
    totalScreenshots: shotCounter,
    failures,
    routes: results,
  };
  writeFileSync(join(outDir, 'report.json'), JSON.stringify(report, null, 2));

  console.log('\n==================== SUMMARY ====================');
  console.log(`Routes swept:      ${results.length}`);
  console.log(`Clicks performed:  ${totalClicks}`);
  console.log(`Screenshots:       ${shotCounter}`);
  console.log(`Click failures:    ${failures.length}`);
  console.log(`Evidence dir:      ${outDir}`);
  for (const r of results) {
    console.log(`  ${r.route} -> ${r.clicks.length}/${r.total} clicked (landed ${r.landed})`);
  }
}

run().catch((e) => {
  console.error('SWEEP CRASHED:', e);
  process.exit(1);
});
