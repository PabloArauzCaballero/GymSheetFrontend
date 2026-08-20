import { mkdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { expect, test, type Page } from '@playwright/test';

/**
 * Lo añadido al portal para operar un gimnasio: el panel de operación, el
 * listado de cuentas, el catálogo de equipamiento y la activación por pago en
 * efectivo.
 *
 * Corre contra el stack real —backend NestJS y PostgreSQL—, como el resto de
 * esta carpeta. Las aserciones miran el efecto observable en pantalla después
 * de que el backend haya respondido, no el estado interno de React: una prueba
 * que espía el cliente pasa aunque el servidor devuelva otra cosa.
 */
const EVIDENCE_DIR = resolve(process.cwd(), 'e2e-evidence');

const admin = {
  email: process.env.E2E_ADMIN_EMAIL ?? 'admin@gymsheet.local',
  password: process.env.E2E_ADMIN_PASSWORD ?? 'GymSheet-Admin_2026!',
};

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

async function loginAsAdmin(page: Page) {
  await page.goto('/login');
  await page.getByLabel('Correo electrónico').fill(admin.email);
  await page.getByLabel('Contraseña', { exact: true }).fill(admin.password);
  await page.getByRole('button', { name: 'Iniciar sesión' }).click();
  await expect(page).toHaveURL(/\/dashboard$/u, { timeout: 30_000 });
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

  test('el panel responde las tres preguntas de operación', async ({ page }) => {
    await open(page, '/admin/operacion');

    await expect(page.getByRole('heading', { name: 'Operación' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Uso de máquinas' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Flujo de personas' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'No han renovado' })).toBeVisible();

    // La ventana temporal gobierna las consultas; cambiarla no debe romper la
    // página aunque el rango no tenga datos.
    await page.getByLabel('Ventana de tiempo').selectOption('7');
    await expect(page.getByRole('heading', { name: 'Operación' })).toBeVisible();

    await shot(page, 'panel-operacion');
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

  test('el enlace de activación exige sesión de personal', async ({ page, browser }) => {
    // Sin sesión: el portal debe pedir acceso y conservar el destino, que es lo
    // que hace inútil reenviar el enlace a un grupo de WhatsApp.
    const anonimo = await browser.newContext();
    const anonPage = await anonimo.newPage();
    await anonPage.goto('/activar/token-de-prueba-que-no-existe-000000');
    await expect(anonPage).toHaveURL(/\/login\?returnTo=%2Factivar/u, { timeout: 20_000 });
    await shot(anonPage, 'activacion-sin-sesion');
    await anonimo.close();

    // Con sesión de administración, un enlace inexistente se rechaza sin
    // filtrar si alguna vez existió.
    await open(page, '/activar/token-de-prueba-que-no-existe-000000');
    await expect(page.getByText('El enlace ya no es válido')).toBeVisible({
      timeout: 20_000,
    });
    await shot(page, 'activacion-enlace-invalido');
  });

  test('el tutorial de puesta en marcha está disponible para administración', async ({
    page,
  }) => {
    await open(page, '/tutorials');
    await expect(page.getByText('Poner en marcha tu gimnasio')).toBeVisible({
      timeout: 20_000,
    });
    await shot(page, 'tutorial-onboarding');
  });
});
