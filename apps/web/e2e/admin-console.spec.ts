import { mkdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { expect, test, type BrowserContext, type Page } from '@playwright/test';
import { signInOperatingGym } from './fixtures';

/**
 * Evidencia end-to-end de la consola de administración contra el stack real
 * (backend NestJS + PostgreSQL). Cada aserción comprueba el efecto observable
 * en la interfaz después de que el backend haya persistido el cambio, y cada
 * paso deja una captura en `e2e-evidence/`.
 *
 * Franja 8e retired the gym-operated plans, staff accounts and face
 * enrollment (backend ADR-0026), and with them their steps here.
 */
const EVIDENCE_DIR = resolve(process.cwd(), 'e2e-evidence');


/** Sufijo único por corrida: los códigos de plan y correos son irrepetibles. */
const run = Date.now().toString(36).toUpperCase().slice(-6);

let step = 0;
/**
 * Captura de evidencia.
 *
 * Con un diálogo abierto se retrata la pantalla, no la página entera. Una
 * captura de página completa obliga al navegador a extender el lienzo, y la
 * capa fija del modal se recoloca con él: el resultado era una imagen con el
 * diálogo desplazado y, peor, los botones movidos de sitio justo antes del
 * clic siguiente. Además un modal ocupa la pantalla por definición; fotografiar
 * lo que hay debajo no añade nada a la evidencia.
 */
async function shot(page: Page, name: string) {
  step += 1;
  const file = resolve(EVIDENCE_DIR, `${String(step).padStart(2, '0')}-${name}.png`);
  const dialogOpen = await page
    .getByRole('dialog')
    .first()
    .isVisible()
    .catch(() => false);
  await page.screenshot({ path: file, fullPage: !dialogOpen });
}

test.beforeAll(() => {
  mkdirSync(EVIDENCE_DIR, { recursive: true });
});

/** Franja 7a: gym administration is the platform admin's, operating the seeded gym. */
async function loginAsAdmin(page: Page) {
  await signInOperatingGym(page);
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
  /*
   * Este recorrido funcional se ejercita en escritorio.
   *
   * Bajo emulación de dispositivo táctil la comprobación de accionabilidad de
   * Playwright discrepa del navegador: sobre el botón «Guardar» del diálogo de
   * sede da por interceptado el punto —unas veces por «Cancelar», otras por un
   * campo del formulario— mientras `document.elementFromPoint` en esas mismas
   * coordenadas devuelve el propio botón, y despachar el evento completa el
   * alta sin problemas. Es un desajuste de coordenadas de la emulación, no algo
   * que le pase a un dedo de verdad; forzar el clic sólo serviría para que la
   * prueba dejara de comprobar si el botón es alcanzable.
   *
   * La cobertura móvil de estas pantallas vive donde corresponde: `theme-parity`
   * las fotografía en ambos temas y `responsive-overflow` verifica que ninguna
   * se desborde en la matriz de anchuras.
   */
  test.skip(
    ({ hasTouch }) => Boolean(hasTouch),
    'Recorrido funcional cubierto en escritorio; ver comentario.',
  );

  let context: BrowserContext;
  let page: Page;

  test.beforeAll(async ({ browser, baseURL }, testInfo) => {
    // El contexto se crea a mano para compartir la sesión entre los pasos, así
    // que las opciones de `test.use` no se aplican solas: la URL base debe
    // declararse aquí.
    //
    // Y con ellas hay que traerse las del proyecto. Sin esto, correr la suite
    // con `--project=mobile` abría igualmente una ventana de escritorio: se
    // creía estar probando un teléfono y se estaba repitiendo el recorrido de
    // siempre, que es la peor clase de prueba —la que da confianza sin mirar
    // nada—.
    const projectUse = testInfo.project.use;
    context = await browser.newContext({
      ...projectUse,
      ...(baseURL ? { baseURL } : {}),
    });
    page = await context.newPage();
    await loginAsAdmin(page);
  });

  test.afterAll(async () => {
    await context.close();
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

  test('alta de sede con su ubicación', async () => {
    await open(page, '/admin/facilities');
    await expect(page.getByRole('heading', { name: 'Sedes', exact: true })).toBeVisible({
      timeout: 30_000,
    });
    await shot(page, 'sedes-lista');

    // La base de desarrollo arranca sin sedes: la sede es parte del recorrido,
    // no del montaje del test.
    await page.getByRole('button', { name: 'Nueva sede' }).click();
    const dialog = page.getByRole('dialog');
    await expect(dialog).toBeVisible({ timeout: 15_000 });
    await dialog.locator('input[name="codigo"]').fill(`SEDE-${run}`);
    await dialog.locator('input[name="nombre"]').fill(`Sede E2E ${run}`);
    await shot(page, 'sedes-alta-dialogo');
    await dialog.getByRole('button', { name: /Siguiente/u }).click();

    // Paso de ubicación: sin punto no se puede avanzar; se marca con un clic
    // en el mapa del propio diálogo.
    await dialog.getByRole('button', { name: /Siguiente/u }).click();
    await expect(dialog.getByRole('alert')).toContainText('Marca la ubicación');
    const map = dialog.locator('.leaflet-container');
    await expect(map).toBeVisible({ timeout: 15_000 });
    await map.click({ position: { x: 200, y: 140 } });
    await expect(dialog.getByLabel('Latitud')).not.toHaveValue('');
    await shot(page, 'sedes-alta-ubicacion');
    await dialog.getByRole('button', { name: /Siguiente/u }).click();
    await dialog.getByRole('button', { name: /Siguiente/u }).click();
    await dialog.getByRole('button', { name: 'Registrar sede' }).click();

    const row = page.getByRole('row').filter({ hasText: `Sede E2E ${run}` });
    await expect(row).toBeVisible({ timeout: 20_000 });
    // La sede creada con ubicación queda en el mapa y no como «Sin ubicar».
    await expect(row).not.toContainText('Sin ubicar');
    await expect(row.getByRole('button', { name: /^Ver / })).toBeVisible();
    await shot(page, 'sedes-creada');
  });
});
