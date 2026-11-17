import { mkdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { expect, test, type Page } from '@playwright/test';
import { signInOperatingGym } from './fixtures';

/**
 * Lo añadido al portal para operar un gimnasio: el listado de cuentas y el
 * catálogo de equipamiento. El panel de operación y la activación por pago en
 * efectivo se fueron con la franja 8e (ADR-0026).
 *
 * Corre contra el stack real —backend NestJS y PostgreSQL—, como el resto de
 * esta carpeta. Las aserciones miran el efecto observable en pantalla después
 * de que el backend haya respondido, no el estado interno de React: una prueba
 * que espía el cliente pasa aunque el servidor devuelva otra cosa.
 */
const EVIDENCE_DIR = resolve(process.cwd(), 'e2e-evidence');


/**
 * El nombre sale del contenido, no de un contador: las pruebas pueden correr en
 * otro orden o en paralelo, y un prefijo numérico haría que cada corrida dejara
 * una copia más con distinto nombre en vez de reemplazar la anterior.
 */
async function shot(page: Page, name: string) {
  mkdirSync(EVIDENCE_DIR, { recursive: true });
  await page.screenshot({
    path: resolve(EVIDENCE_DIR, `gym-${name}.png`),
    fullPage: true,
  });
}

/** Franja 7a: gym administration is the platform admin's, operating the seeded gym. */
async function loginAsAdmin(page: Page) {
  await signInOperatingGym(page);
}

/**
 * El tour de bienvenida se abre solo en un perfil nuevo y su capa cubre la
 * página entera. Se cierra antes de interactuar: su presencia no es lo que se
 * está verificando aquí, y dejarlo abierto haría fallar cualquier clic por una
 * razón que no es la del defecto.
 */
async function dismissTutorial(page: Page) {
  const skip = page.getByRole('button', { name: 'Omitir' });
  // Aparece con retardo tras montar la página, así que se espera en vez de
  // consultar el estado una sola vez; su ausencia no es un fallo.
  await skip.waitFor({ state: 'visible', timeout: 6_000 }).catch(() => undefined);
  if (await skip.isVisible().catch(() => false)) {
    await skip.click();
    await expect(skip).toBeHidden({ timeout: 15_000 });
  }
}

/** Navega y deja la página lista para interactuar. */
async function open(page: Page, path: string) {
  await page.goto(path);
  await dismissTutorial(page);
}

test.describe('Operación del gimnasio', () => {

  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page);
    await dismissTutorial(page);
  });

  test('el listado de cuentas resuelve el acceso y filtra', async ({ page }) => {
    await open(page, '/admin/usuarios');

    await expect(page.getByRole('heading', { name: 'Usuarios' })).toBeVisible();
    // La tabla debe traer filas del backend, no un esqueleto de carga.
    await expect(page.locator('tbody tr').first()).toBeVisible({ timeout: 20_000 });

    const buscador = page.getByLabel('Buscar por nombre o correo');
    await buscador.fill('athlete');
    // El filtro ocurre en el servidor: se espera al resultado, no a un re-render.
    await expect(page.getByText('athlete.mock@gymsheet.local')).toBeVisible({
      timeout: 20_000,
    });

    await shot(page, 'usuarios');

    // Una búsqueda sin coincidencias debe decirlo, no dejar la tabla anterior.
    await buscador.fill('zzz-no-existe-zzz');
    await expect(page.getByText('Ninguna cuenta coincide con esa búsqueda.')).toBeVisible({
      timeout: 20_000,
    });
  });

  test('el catálogo de equipamiento permite marcar por zona', async ({ page }) => {
    await open(page, '/admin/equipment');

    await page.getByRole('button', { name: 'Añadir desde catálogo' }).click();
    await expect(page.getByText('Equipamiento habitual')).toBeVisible();
    await expect(page.getByText('Peso libre')).toBeVisible({ timeout: 20_000 });

    // «Añadir» permanece deshabilitado mientras no haya nada marcado: es lo que
    // impide una petición vacía al backend.
    const anadir = page.getByRole('button', { name: 'Añadir', exact: true });
    await expect(anadir).toBeDisabled();

    await page.getByRole('button', { name: 'Marcar zona' }).first().click();
    await expect(anadir).toBeEnabled();
    await expect(page.getByText(/seleccionados$/u)).toBeVisible();

    await shot(page, 'catalogo-equipamiento');
  });

  // Franja 7a: the gym self-setup tour left with the gym staff; REPP's admin has its own.
  test('el tutorial de operación está disponible para la administración de REPP', async ({
    page,
  }) => {
    await open(page, '/tutorials');
    await expect(page.getByText('Operar un gimnasio')).toBeVisible({
      timeout: 20_000,
    });
    await shot(page, 'tutorial-onboarding');
  });
});
