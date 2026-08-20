import { expect, type Page } from '@playwright/test';

/**
 * Las cuentas con las que corren las pruebas end-to-end.
 *
 * Estaban copiadas literalmente en ocho ficheros, cada copia con su propia
 * contraseña por defecto, y ninguna coincidía ya con la siembra del backend.
 * El síntoma no era «credencial incorrecta» sino veinticinco pruebas fallando
 * con un tiempo de espera agotado en `/login`, que es lo que hace que una suite
 * así se acabe ignorando: parece rota por todas partes cuando lo único que pasa
 * es que nadie exportó una variable.
 *
 * Ahora hay un solo sitio. Los valores salen del entorno, y los que quedan
 * escritos aquí son los del `docker compose` de desarrollo documentado en el
 * README, no un secreto: contra cualquier otra base hay que exportarlos.
 *
 * `apps/web/.env.e2e` (ignorado por git) es la forma cómoda de fijarlos una vez;
 * `playwright.config.ts` lo carga si existe.
 */
export const admin = {
  email: process.env.E2E_ADMIN_EMAIL ?? 'admin@gymsheet.local',
  password: process.env.E2E_ADMIN_PASSWORD ?? 'AdminLocal2026!',
};

export const athlete = {
  email: process.env.E2E_ATHLETE_EMAIL ?? 'active.mock@gymsheet.local',
  password: process.env.E2E_ATHLETE_PASSWORD ?? 'MockLocal2026!',
};

/**
 * La contraseña compartida por las cuentas de escenario (`*.mock@…`). Es la
 * misma que la del atleta porque la siembra las crea a todas con
 * `SEED_MOCK_PASSWORD`; se nombra aparte para que las pruebas que entran como
 * «el socio vencido» o «el que no terminó el alta» digan a qué se refieren.
 */
export const mockPassword = athlete.password;

/**
 * Cierra el tour de bienvenida si está abierto.
 *
 * Se abre solo en un perfil nuevo y su capa cubre la página entera, así que el
 * primer clic de cualquier prueba se lo come el overlay y el fallo aparece como
 * un tiempo de espera agotado sobre un elemento que la propia traza describe
 * como «visible, enabled and stable». Aparece con retardo tras montar la
 * página: una única consulta de visibilidad llega antes que él.
 *
 * Su ausencia no es un fallo —en un perfil que ya lo cerró no vuelve—, de ahí
 * que la espera se descarte en silencio.
 */
export async function dismissTour(page: Page): Promise<void> {
  const close = page.getByRole('button', { name: /Cerrar tutorial|Omitir/u }).first();
  await close.waitFor({ state: 'visible', timeout: 6_000 }).catch(() => undefined);
  if (await close.isVisible().catch(() => false)) {
    await close.click();
    await expect(close).toBeHidden({ timeout: 15_000 });
  }
}

/**
 * Espera a que termine la transición de entrada de una página.
 *
 * Durante la navegación del App Router conviven un instante el `<main>` que se
 * va y el que llega —alrededor de un segundo, mientras corre `page-enter`—.
 * Cualquier localizador de `main` resuelve entonces dos elementos y falla por
 * modo estricto; y una captura tomada en ese momento retrata la animación a
 * medias, que es de donde salen las diferencias visuales que nadie sabe
 * reproducir.
 *
 * Esperar a que quede uno solo es la señal de que la página está quieta.
 */
export async function waitForPageSettled(page: Page): Promise<void> {
  await expect(page.locator('main')).toHaveCount(1, { timeout: 15_000 });
}

/**
 * Navega y deja la pantalla lista para interactuar.
 *
 * El tour no es uno solo por sesión: cada pantalla tiene el suyo y vuelve a
 * abrirse al llegar, así que cerrarlo tras el acceso no sirve para lo que pase
 * después. Se cierra donde se va a hacer clic.
 */
export async function openPage(page: Page, path: string): Promise<void> {
  await page.goto(path);
  await dismissTour(page);
}

/**
 * Entra en la aplicación y espera a estar dentro.
 *
 * El formulario de acceso es `method="post"`, así que si el clic llega antes de
 * que React hidrate el navegador hace el envío nativo: el servidor devuelve la
 * misma pantalla, la prueba se queda en `/login` y en el backend no aparece ni
 * un intento de acceso. Se veía como una tanda de fallos de credenciales que no
 * eran de credenciales.
 *
 * De ahí el reintento: si tras el primer envío seguimos en `/login` sin un
 * error visible, se vuelve a intentar —a esas alturas la página ya hidrató—. Un
 * acceso realmente rechazado muestra su mensaje y falla igual, que es lo que
 * debe seguir pasando.
 */
export async function signIn(
  page: Page,
  credentials: { email: string; password: string },
): Promise<void> {
  await page.goto('/login');
  const submit = page.getByRole('button', { name: 'Iniciar sesión' });

  for (const attempt of [0, 1]) {
    await page.getByLabel('Correo electrónico').fill(credentials.email);
    await page.getByLabel('Contraseña', { exact: true }).fill(credentials.password);
    await submit.click();

    try {
      await page.waitForURL((url) => !url.pathname.startsWith('/login'), {
        timeout: attempt === 0 ? 15_000 : 40_000,
      });
      return;
    } catch (error) {
      const rejected = await page
        .getByRole('alert')
        .first()
        .isVisible()
        .catch(() => false);
      if (rejected || attempt === 1) throw error;
    }
  }
}
