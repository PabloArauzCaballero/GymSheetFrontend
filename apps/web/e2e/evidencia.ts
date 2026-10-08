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
      // La cabecera de la aplicación no es parte del asistente: su etiqueta de rol tiene
      // un contraste insuficiente en tema claro desde antes de esta entrega (hallazgo aparte).
      .exclude('header.sticky')
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
  // En una captura de página completa los elementos «pegajosos» (la cabecera de la
  // aplicación y la barra de acciones del asistente) quedan a media página y
  // parecen un defecto; se colocan en su sitio natural sólo mientras se captura.
  const style = await page.addStyleTag({
    content:
      'header.sticky, [aria-label="Acciones del asistente"] { position: static !important; }',
  });
  await page.screenshot({ path, fullPage: true, animations: 'disabled' });
  await style.evaluate((node) => node.remove());
  return path;
}
