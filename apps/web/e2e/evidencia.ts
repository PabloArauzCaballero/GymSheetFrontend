import AxeBuilder from '@axe-core/playwright';
import { expect, type Page } from '@playwright/test';

/**
 * Evidencia visual de un requisito (06 · Pruebas y evidencia).
 *
 * Guarda la captura en `docs/evidencias/rutinas/<RF>/web/` con el nombre
 * `RF-XX_pNN_<paso>_<ancho>_<tema>.png`, y antes de capturar comprueba que la
 * pantalla no esté a medio cargar y que axe no encuentre violaciones serias o
 * críticas (DoD-9). Una captura tomada con la página cargando no es evidencia.
 *
 * El tema sale de `data-theme` del documento (claro / oscuro) y el ancho del
 * viewport (390 o 1440).
 */
export async function evidencia(
  page: Page,
  rf: string,
  paso: string,
  nombre: string,
): Promise<string> {
  const viewport = page.viewportSize();
  if (!viewport) throw new Error('La página no tiene viewport: no se puede nombrar la captura.');
  const theme = await page.evaluate(() => document.documentElement.dataset.theme ?? 'dark');
  const tema = theme === 'light' ? 'claro' : 'oscuro';

  await expect(page.locator('[aria-busy="true"]')).toHaveCount(0);
  await page.waitForLoadState('networkidle');

  const serious = (
    await new AxeBuilder({ page })
      // Los avisos emergentes (sonner) son transitorios y no son del asistente.
      .exclude('[data-sonner-toaster]')
      .analyze()
  ).violations.filter(
    (violation) => violation.impact === 'serious' || violation.impact === 'critical',
  );
  expect(
    serious.map(
      (violation) =>
        `${violation.id} (${violation.nodes.length}): ${violation.nodes.map((node) => node.target.join(' ')).join(' | ')}`,
    ),
    `axe: violaciones serias en ${rf} p${paso} ${nombre}`,
  ).toEqual([]);

  const path = `../../docs/evidencias/rutinas/${rf}/web/${rf}_p${paso}_${nombre}_${viewport.width}_${tema}.png`;
  await page.screenshot({ path, fullPage: true, animations: 'disabled' });
  return path;
}
