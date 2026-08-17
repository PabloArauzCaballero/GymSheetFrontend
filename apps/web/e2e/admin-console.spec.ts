import { mkdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { expect, test, type Page } from '@playwright/test';

/**
 * Evidencia end-to-end de la consola de administración contra el stack real
 * (backend NestJS + PostgreSQL). Cada aserción comprueba el efecto observable
 * en la interfaz después de que el backend haya persistido el cambio, y cada
 * paso deja una captura en `e2e-evidence/`.
 *
 * La cámara se ejercita de verdad: Chromium arranca con un dispositivo de vídeo
 * falso alimentado por un Y4M sintético que contiene un óvalo de tono piel, de
 * modo que el detector de rostros recorre su camino real en vez de un mock.
 */
const FAKE_FACE_VIDEO = resolve(process.cwd(), '.e2e-assets/fake-face.y4m');
const FAKE_QR_IMAGE = resolve(process.cwd(), '.e2e-assets/fake-qr.png');
const EVIDENCE_DIR = resolve(process.cwd(), 'e2e-evidence');

const admin = {
  email: process.env.E2E_ADMIN_EMAIL ?? 'admin.dev@gymsheet.local',
  password: process.env.E2E_ADMIN_PASSWORD ?? 'GymSheet-Admin_2026!',
};

/** Sufijo único por corrida: los códigos de plan y correos son irrepetibles. */
const run = Date.now().toString(36).toUpperCase().slice(-6);

let step = 0;
async function shot(page: Page, name: string) {
  step += 1;
  const file = resolve(EVIDENCE_DIR, `${String(step).padStart(2, '0')}-${name}.png`);
  await page.screenshot({ path: file, fullPage: true });
}

test.use({
  permissions: ['camera'],
  launchOptions: {
    args: [
      '--use-fake-ui-for-media-stream',
      '--use-fake-device-for-media-stream',
      `--use-file-for-fake-video-capture=${FAKE_FACE_VIDEO}`,
    ],
  },
});

test.beforeAll(() => {
  mkdirSync(EVIDENCE_DIR, { recursive: true });
});

async function loginAsAdmin(page: Page) {
  await page.goto('/login');
  await page.getByLabel('Correo electrónico').fill(admin.email);
  await page.getByLabel('Contraseña').fill(admin.password);
  await page.getByRole('button', { name: 'Iniciar sesión' }).click();
  await expect(page).toHaveURL(/\/dashboard$/u, { timeout: 20_000 });
}

/**
 * El tour de bienvenida se abre solo en un perfil nuevo y su capa cubre la
 * página entera. Se omite antes de interactuar; su presencia no forma parte de
 * lo que se está verificando aquí.
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

test.describe.configure({ mode: 'serial' });

test.describe('consola de administración', () => {
  let page: Page;

  test.beforeAll(async ({ browser }) => {
    page = await browser.newPage();
    await loginAsAdmin(page);
  });

  test.afterAll(async () => {
    await page.close();
  });

  test('panel de operaciones', async () => {
    await open(page, '/admin');
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible({ timeout: 30_000 });
    await shot(page, 'admin-overview');
  });

  test('alta y edición de maquinaria', async () => {
    const name = `Prensa 45 E2E ${run}`;
    await open(page, '/admin/equipment');
    await expect(page.getByRole('heading', { name: 'Equipamiento' })).toBeVisible({
      timeout: 30_000,
    });
    await shot(page, 'equipos-lista');

    await page.getByRole('button', { name: 'Nuevo equipo' }).click();
    await expect(page.getByRole('dialog')).toBeVisible({ timeout: 15_000 });
    await page.locator('#equipment-name').fill(name);
    await page.locator('#equipment-type').selectOption('MAQUINA');
    await page.locator('#equipment-description').fill('Registrada por la verificación E2E.');
    await shot(page, 'equipos-alta-dialogo');
    await page.getByRole('button', { name: 'Guardar' }).click();

    // El equipo sólo aparece si el backend lo persistió y la lista se revalidó.
    const row = page.getByRole('row').filter({ hasText: name });
    await expect(row).toBeVisible({ timeout: 15_000 });
    await shot(page, 'equipos-creado');

    await row.getByRole('button', { name: `Editar ${name}` }).click();
    await expect(page.getByRole('dialog')).toBeVisible({ timeout: 15_000 });
    await page.locator('#equipment-edit-description').fill('Descripción corregida en E2E.');
    await shot(page, 'equipos-edicion-dialogo');
    await page.getByRole('button', { name: 'Guardar' }).click();
    await expect(page.getByRole('dialog')).toBeHidden({ timeout: 15_000 });
    // Se comprueba sobre la fila de esta corrida: corridas anteriores dejan
    // equipos con la misma descripción y la aserción global sería ambigua.
    await expect(row).toContainText('Descripción corregida en E2E.', { timeout: 15_000 });
    await shot(page, 'equipos-editado');
  });

  test('alta de sede (prerrequisito de todo plan)', async () => {
    await open(page, '/admin/facilities');
    await expect(page.getByRole('heading', { name: 'Sedes' })).toBeVisible({ timeout: 30_000 });
    await shot(page, 'sedes-lista');

    // La base de desarrollo arranca sin sedes y un plan exige al menos un
    // alcance, así que la sede es parte del recorrido, no del montaje del test.
    await page.getByRole('button', { name: 'Nueva sede' }).click();
    const dialog = page.getByRole('dialog');
    await expect(dialog).toBeVisible({ timeout: 15_000 });
    await dialog.locator('input[name="codigo"]').fill(`SEDE-${run}`);
    await dialog.locator('input[name="nombre"]').fill(`Sede E2E ${run}`);
    await shot(page, 'sedes-alta-dialogo');
    await dialog.getByRole('button', { name: 'Guardar' }).click();

    await expect(page.getByRole('row').filter({ hasText: `Sede E2E ${run}` })).toBeVisible({
      timeout: 20_000,
    });
    await shot(page, 'sedes-creada');
  });

  test('alta de plan con precio, beneficios y disponibilidad', async () => {
    const code = `E2E${run}`;
    await open(page, '/admin/membership');
    await page.getByRole('tab', { name: 'Planes' }).click();
    await expect(page.getByRole('heading', { name: 'Planes' })).toBeVisible({ timeout: 30_000 });
    await shot(page, 'planes-lista');

    await page.getByRole('button', { name: 'Nuevo plan' }).click();
    const dialog = page.getByRole('dialog');
    await expect(dialog).toBeVisible({ timeout: 15_000 });
    await dialog.locator('input[name="codigo"]').fill(code);
    await dialog.locator('input[name="nombre"]').fill(`Plan E2E ${run}`);
    await dialog.locator('select[name="tipo"]').selectOption('MONTHLY');
    await dialog.locator('input[name="duracionDias"]').fill('30');
    await dialog.locator('input[name="precio"]').fill('45000');
    await dialog.locator('select[name="moneda"]').selectOption('CLP');
    await dialog.locator('input[name="orden"]').fill('7');
    await dialog.locator('select[name="sedeId"]').selectOption({ label: `Sede E2E ${run}` });
    await dialog
      .locator('textarea[name="beneficios"]')
      .fill('Acceso libre a sala\nEvaluación inicial');
    await dialog.locator('textarea[name="descripcion"]').fill('Plan creado por la verificación E2E.');
    await shot(page, 'planes-alta-dialogo');
    await dialog.getByRole('button', { name: 'Guardar' }).click();

    // El precio formateado y los beneficios sólo pueden venir del backend: son
    // los campos que antes ningún contrato de escritura aceptaba.
    const row = page.getByRole('row').filter({ hasText: `Plan E2E ${run}` });
    await expect(row).toBeVisible({ timeout: 15_000 });
    await expect(row).toContainText('45.000');
    await expect(row).toContainText('Acceso libre a sala');
    await expect(row).toContainText('orden 7');
    await shot(page, 'planes-creado-con-precio');
  });

  test('carga de la imagen QR del plan', async () => {
    await open(page, '/admin/membership');
    await page.getByRole('tab', { name: 'Planes' }).click();
    const row = page.getByRole('row').filter({ hasText: `Plan E2E ${run}` });
    await expect(row).toBeVisible({ timeout: 15_000 });

    await row.getByRole('button', { name: `Imagen QR de Plan E2E ${run}` }).click();
    const dialog = page.getByRole('dialog');
    await expect(dialog).toBeVisible({ timeout: 15_000 });
    await expect(dialog.getByText('Sin imagen')).toBeVisible({ timeout: 15_000 });
    await shot(page, 'qr-dialogo-vacio');

    await dialog.getByRole('tab', { name: 'Cámara' }).click();
    await shot(page, 'qr-pestana-camara');
    await dialog.getByRole('tab', { name: 'Repositorio' }).click();
    await shot(page, 'qr-pestana-repositorio');
    await dialog.getByRole('tab', { name: 'Archivo' }).click();

    await dialog.locator('input[type="file"]').setInputFiles(FAKE_QR_IMAGE);
    await expect(dialog.getByText('232 × 232 px')).toBeVisible({ timeout: 10_000 });
    await shot(page, 'qr-vista-previa');

    await dialog.getByRole('button', { name: 'Guardar QR' }).click();
    await expect(dialog).toBeHidden({ timeout: 30_000 });

    // La miniatura de la fila prueba el ciclo completo: carga a `media.files`,
    // enlace del plan por `imagenId` y lectura de vuelta en el listado.
    const thumbnail = page
      .getByRole('row')
      .filter({ hasText: `Plan E2E ${run}` })
      .locator('img');
    await expect(thumbnail).toBeVisible({ timeout: 20_000 });
    await expect(thumbnail).toHaveJSProperty('naturalWidth', 232);
    await shot(page, 'qr-asignado-al-plan');
  });

  test('alta de entrenador con cuenta de acceso', async () => {
    const email = `coach.e2e.${run.toLowerCase()}@gymsheet.local`;
    await open(page, '/admin/membership');
    await page.getByRole('tab', { name: 'Personal' }).click();
    await expect(page.getByRole('heading', { name: 'Personal' })).toBeVisible({ timeout: 30_000 });
    await shot(page, 'personal-lista');

    await page.getByRole('button', { name: 'Nuevo entrenador' }).click();
    const dialog = page.getByRole('dialog');
    await expect(dialog).toBeVisible({ timeout: 15_000 });
    await dialog.locator('input[name="nombreCompleto"]').fill(`Entrenador E2E ${run}`);
    await dialog.locator('input[name="email"]').fill(email);
    await dialog.locator('input[name="password"]').fill('GymSheet-Coach_2026!');
    await dialog.locator('select[name="cargo"]').selectOption('COACH');
    await dialog.locator('input[name="pinAcceso"]').fill('482913');
    await shot(page, 'personal-alta-dialogo');
    await dialog.getByRole('button', { name: 'Crear' }).click();

    // El correo en la fila viene de la cuenta creada por el backend en la misma
    // transacción que el perfil laboral.
    const row = page.getByRole('row').filter({ hasText: `Entrenador E2E ${run}` });
    await expect(row).toBeVisible({ timeout: 20_000 });
    await expect(row).toContainText(email);
    await expect(row).toContainText('Entrenador');
    await shot(page, 'personal-entrenador-creado');
  });

  test('registro de persona con detección facial desde la cámara', async () => {
    const email = `persona.e2e.${run.toLowerCase()}@gymsheet.local`;
    await open(page, '/admin/people');
    await expect(page.getByRole('heading', { name: 'Registrar persona' })).toBeVisible({
      timeout: 30_000,
    });
    await shot(page, 'personas-inicial');

    await page.locator('input[name="nombreCompleto"]').fill(`Persona E2E ${run}`);
    await page.locator('input[name="email"]').fill(email);
    await page.locator('input[name="password"]').fill('GymSheet-Persona_2026!');
    await page.locator('input[name="numeroCliente"]').fill(`E2E${run}`);
    await page.locator('input[name="pinAcceso"]').fill('771204');
    await page.locator('input[name="telefono"]').fill('+56911112222');
    await shot(page, 'personas-datos');

    await page.getByRole('button', { name: 'Registrar persona' }).click();
    await expect(page.getByText(`Cliente E2E${run}`)).toBeVisible({ timeout: 20_000 });
    await shot(page, 'personas-registrada');

    await page.getByRole('button', { name: 'Encender cámara' }).click();
    // El óvalo de tono piel del vídeo falso debe producir exactamente un rostro.
    await expect(page.getByText('Rostro encuadrado.')).toBeVisible({ timeout: 20_000 });
    await shot(page, 'personas-camara-detectando');

    await page.getByRole('button', { name: 'Capturar rostro' }).click();
    await expect(page.getByText(/1 rostro\(s\)/u)).toBeVisible({ timeout: 15_000 });
    await shot(page, 'personas-captura');

    await page.getByRole('checkbox').last().check();
    await page.getByRole('button', { name: 'Registrar credencial facial' }).click();
    await expect(page.getByText('Credencial facial registrada.')).toBeVisible({ timeout: 20_000 });
    await shot(page, 'personas-credencial-registrada');

    // Confirmación independiente de la interfaz: la credencial FACE existe en el
    // backend para ese usuario.
    const userId = (await page.getByText(/Cliente E2E/u).innerText()).split('·').pop()?.trim();
    expect(userId).toBeTruthy();
    const credentials = await page.request.get(
      `/api/backend/admin/access/credentials/user/${userId}`,
    );
    expect(credentials.ok()).toBe(true);
    const payload = (await credentials.json()) as {
      data: { tipo: string; proveedor: string; estado: string }[];
    };
    expect(payload.data).toContainEqual(
      expect.objectContaining({ tipo: 'FACE', proveedor: 'WEBCAM_RECEPCION', estado: 'ACTIVE' }),
    );
  });
});
