import { expect, type Page } from '@playwright/test';

/**
 * Deja el tour de bienvenida como «ya visto» antes de una captura.
 *
 * Una cuenta recién creada abre el tour «¡Hola! 1/5» sobre cualquier pantalla del
 * portal y su capa cubre justo lo que la captura debe demostrar. En la app real
 * eso es lo correcto (la guía se ofrece en el primer acceso), así que NO se oculta
 * en la app: la prueba hace lo que haría quien ya lo vio, pulsar «Omitir», y la
 * app registra el progreso por su camino normal. Si el tour no aparece (cuenta que
 * ya lo cerró) no pasa nada.
 *
 * Aparece con retardo tras montar la página: se espera una ventana corta, no una
 * única consulta de visibilidad.
 */
export async function marcarTourVisto(page: Page): Promise<void> {
  const omitir = page.getByRole('button', { name: /^Omitir$|Cerrar tutorial/u }).first();
  await omitir.waitFor({ state: 'visible', timeout: 2_500 }).catch(() => undefined);
  if (await omitir.isVisible().catch(() => false)) {
    // Si un manejador de la prueba (`cerrarTour`) se adelanta y lo cierra, este clic ya no tiene objetivo.
    await omitir.click({ timeout: 5_000 }).catch(() => undefined);
    await expect(omitir).toBeHidden({ timeout: 15_000 });
  }
}
