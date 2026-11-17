/**
 * Franja 7a · REPP operates the gyms.
 *
 * 1. A gym `ADMIN` (legacy role) sees no administration entry anywhere and is
 *    sent away from every `/admin/*` page; the backend answers 403 on `admin/*`.
 * 2. The platform admin chooses a gym in `/sistema`, the banner «Operando …»
 *    follows it on every page, the BFF calls go out with the scoped token, and
 *    «Salir» goes back to its own token. Proven through the real API and the
 *    HttpOnly cookie, not by the toast.
 */
import { test } from '@playwright/test';
import { e2eTenantId } from './fixtures';
import { apiDe, crearCuenta, promover, sql } from './rutinas-datos';
import { abrirComo, comboLabel, combos, expect } from './rutinas-pagina';

// `/admin/operacion` and `/admin/membership` left with franja 8e (ADR-0026).
const ADMIN_PAGES = ['/admin', '/admin/equipment', '/admin/usuarios', '/admin/facilities'];

for (const combo of combos) {
  test.describe(`administración de plataforma · ${comboLabel(combo)}`, () => {
    test.use({ viewport: { width: combo.width, height: combo.height } });
    test.setTimeout(240_000);

    test('un ADMIN del gimnasio no ve administración y sale de /admin', async ({ page, context, baseURL }) => {
      const cuenta = await crearCuenta('admin-gym', `Admin Heredado ${Date.now().toString(36)}`);
      await sql(`UPDATE public.usuarios SET rol='ADMIN' WHERE id='${cuenta.id}'`);
      await abrirComo(page, context, baseURL, combo, cuenta);

      await page.goto('/dashboard');
      // The person portal: no gym console to land on any more.
      await expect(page).toHaveURL(/\/dashboard$/u);
      const links = await page.locator('a[href]').evaluateAll((nodes) =>
        nodes.map((node) => node.getAttribute('href') ?? ''),
      );
      expect(links.filter((href) => /^\/(admin|sistema|moderacion)(\/|$)/u.test(href))).toEqual([]);

      for (const path of ADMIN_PAGES) {
        await page.goto(path);
        await page.waitForURL((url) => !url.pathname.startsWith('/admin'));
        expect(new URL(page.url()).searchParams.get('denied')).toBe('1');
      }
      const api = await page.request.get('/api/backend/admin/equipment/catalog');
      expect(api.status()).toBe(403);
    });

    test('el administrador de plataforma opera un gimnasio y sale', async ({ page, context, baseURL }) => {
      const sistema = await promover(await crearCuenta('sistema', 'QA Sistema Operación'), 'SYSTEM_ADMIN');
      const gimnasios = await apiDe(sistema)<Array<{ id: string; nombre: string }>>('GET', '/admin/tenants');
      const gimnasio = gimnasios.data.find((item) => item.id === e2eTenantId);
      expect(gimnasio, `el gimnasio ${e2eTenantId} existe`).toBeTruthy();
      await abrirComo(page, context, baseURL, combo, sistema);

      await page.goto('/sistema');
      const banner = page.getByRole('complementary', { name: 'Gimnasio que operas' });
      await expect(banner).toHaveCount(0);
      await page.getByLabel('Gimnasio', { exact: true }).selectOption(e2eTenantId);
      await page.getByRole('button', { name: 'Operar' }).click();
      await expect(banner).toContainText(`Operando ${gimnasio!.nombre}`);

      // The scoped token lives in an HttpOnly cookie the page cannot read.
      const cookie = (await context.cookies()).find((item) => item.name === 'gymsheet_impersonation');
      expect(cookie?.httpOnly).toBe(true);
      expect(cookie?.sameSite).toBe('Lax');
      expect(await page.evaluate(() => document.cookie)).not.toContain('gymsheet_impersonation');

      // The banner follows every page, and the BFF answers for the gym being operated.
      await page.goto('/admin/equipment');
      await expect(banner).toContainText(gimnasio!.nombre);
      const equipos = await page.request.get('/api/backend/admin/equipment/catalog');
      expect(equipos.status()).toBe(200);
      await page.reload();
      await expect(banner).toContainText(gimnasio!.nombre);

      await banner.getByRole('button', { name: 'Salir' }).click();
      await expect(banner).toHaveCount(0);
      expect((await context.cookies()).some((item) => item.name === 'gymsheet_impersonation')).toBe(false);
      await page.reload();
      await expect(banner).toHaveCount(0);
    });
  });
}
