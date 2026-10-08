/**
 * Asistente de creación de rutinas (plan Rutinas REPP · F2): RF-03 a RF-08 en la
 * web, con captura en cada paso en las cuatro combinaciones de 06 (390 y 1440 px,
 * tema claro y oscuro). Corre contra el backend real.
 *
 * Falla ante cualquier `console.error` o respuesta 5xx de la página, y `evidencia`
 * falla si axe encuentra una violación seria. Las capturas van a
 * `docs/evidencias/rutinas/RF-XX/web/`.
 *
 * Variables: `E2E_ATHLETE_EMAIL`/`E2E_ATHLETE_PASSWORD` (cuenta A, con el alta
 * terminada) y `E2E_SECOND_EMAIL`/`E2E_SECOND_PASSWORD` (cuenta B).
 */
import { expect as baseExpect, test, type Page } from '@playwright/test';
import { THEME_COOKIE } from '../src/shared/theme/theme-script';
import { athlete, dismissTour, signIn } from './fixtures';
import { evidencia } from './evidencia';

/** La cuenta B es otro socio sembrado con el alta terminada: sólo mira la ficha. */
/**
 * `next dev` compila cada ruta la primera vez que se visita y, con el equipo
 * cargado, una navegación puede tardar más de los 15 s por omisión.
 */
const expect = baseExpect.configure({ timeout: 60_000 });

const accountB = {
  email: process.env.E2E_SECOND_EMAIL ?? 'expiring.mock@gymsheet.local',
  password: process.env.E2E_SECOND_PASSWORD ?? athlete.password,
};

const combos = [
  { width: 390, height: 844, theme: 'light' },
  { width: 390, height: 844, theme: 'dark' },
  { width: 1440, height: 900, theme: 'light' },
  { width: 1440, height: 900, theme: 'dark' },
] as const;

const BENCH = 'barbell bench press';
const CLOSE_GRIP = 'barbell close-grip bench press';

/**
 * Cierra el tour de la pantalla en cuanto aparece. Cada página lo abre por su
 * cuenta, con retardo, y su capa se come los clics; el manejador de Playwright
 * lo descarta en el momento en que sale, sin tener que adivinar cuándo.
 */
async function autoCloseTour(page: Page) {
  await page.addLocatorHandler(
    page.getByRole('button', { name: /Cerrar tutorial|Omitir/u }).first(),
    async (skip) => {
      await skip.click();
    },
  );
}

/**
 * Registra lo que haría fallar la prueba: un `console.error` o una respuesta 5xx.
 *
 * Un recurso que responde 404 se avisa aparte y sólo si NO es una imagen o un
 * vídeo de ejercicio: la siembra local no sirve los archivos de medios (el
 * backend apunta a un almacenamiento que no está montado), así que las fichas se
 * ven sin foto y el navegador lo registra como «Failed to load resource». Es un
 * hecho del entorno, no del asistente; cualquier otro 404 sí cuenta (salvo
 * `/me/tutorial-progress`, ver abajo).
 */
function watchPage(page: Page, problems: string[]) {
  page.on('console', (message) => {
    if (message.type() !== 'error') return;
    if (message.text().startsWith('Failed to load resource')) return;
    problems.push(`console.error: ${message.text()}`);
  });
  page.on('response', (response) => {
    const status = response.status();
    const isMedia = /\/(media|exercise-media)\//u.test(response.url());
    // El motor de tutoriales pide `/me/tutorial-progress`, que este backend aún no expone (404).
    const isTutorialProgress = response.url().includes('/me/tutorial-progress');
    if (
      status >= 500 ||
      (status >= 400 &&
        !isMedia &&
        !isTutorialProgress &&
        response.request().resourceType() !== 'image')
    ) {
      problems.push(`${status} ${response.url()}`);
    }
  });
}

/** Pulsa «Siguiente» de la barra del asistente y espera a haber cambiado de página. */
async function next(page: Page) {
  const before = page.url();
  await page.getByTestId('wizard-actions').getByRole('button', { name: 'Siguiente' }).click();
  await expect(page).not.toHaveURL(before);
}

async function search(page: Page, text: string) {
  await page.getByRole('searchbox', { name: 'Buscar' }).fill(text);
  await expect(page.getByRole('button', { name: `Añadir ${text}`, exact: true })).toBeVisible({
    timeout: 30_000,
  });
}

for (const combo of combos) {
  const label = `${combo.width} ${combo.theme === 'light' ? 'claro' : 'oscuro'}`;
  test.describe(`asistente de rutinas · ${label}`, () => {
    test.use({ viewport: { width: combo.width, height: combo.height } });
    // `next dev` compila cada ruta nueva la primera vez que se visita y el flujo recorre veinte.
    test.setTimeout(300_000);

    test('RF-03 a RF-08: crear una rutina de punta a punta', async ({ page, context, baseURL }) => {
      const problems: string[] = [];
      watchPage(page, problems);
      // Sin animaciones: axe mide el contraste con los colores finales, no a mitad de una transición.
      await page.emulateMedia({ reducedMotion: 'reduce' });
      await context.addCookies([
        { name: THEME_COOKIE, value: combo.theme, url: baseURL ?? 'http://localhost:3002' },
      ]);
      await signIn(page, athlete);
      await page.goto('/routines');
      await dismissTour(page);
      await autoCloseTour(page);

      // RF-03 · p01: el asistente arranca en el paso 1.
      await page.getByRole('link', { name: 'Nueva rutina' }).click();
      await expect(page).toHaveURL(/\/routines\/new\/nombre/u);
      await expect(page.getByText('Paso 1 de 6 · Nombre')).toBeVisible();
      await expect(page.getByRole('dialog')).toHaveCount(0);
      await evidencia(page, 'RF-03', '01', 'paso1-vacio');

      // RF-03 · p02: sin nombre no avanza y el error sale en el campo.
      await page.getByTestId('wizard-actions').getByRole('button', { name: 'Siguiente' }).click();
      await expect(page.getByText('Escribe un nombre')).toBeVisible();
      await expect(page.getByText('Paso 1 de 6 · Nombre')).toBeVisible();
      await evidencia(page, 'RF-03', '02', 'paso1-error-nombre');

      // RF-03 · p03 y p04: con nombre avanza; volver conserva lo escrito.
      const name = `QA Empuje 4 días ${combo.width}${combo.theme}`;
      await page.getByLabel('Nombre de la rutina').fill(name);
      await next(page);
      await expect(page.getByText('Paso 2 de 6 · Descripción')).toBeVisible();
      await evidencia(page, 'RF-03', '03', 'paso2');
      await page.goBack();
      await expect(page.getByLabel('Nombre de la rutina')).toHaveValue(name);
      await evidencia(page, 'RF-03', '04', 'volver-conserva');

      await next(page);
      await next(page);
      await page.getByRole('button', { name: 'Hipertrofia' }).click();
      await next(page);

      // RF-04 · p01 y p03: tres meses y descarga cada 5.
      await expect(page.getByText('Paso 4 de 6 · Duración')).toBeVisible();
      await page.getByRole('button', { name: '3 meses' }).click();
      await page.getByRole('button', { name: 'Descarga cada 5 semanas' }).click();
      await expect(page.getByText('12 semanas · descarga cada 5')).toBeVisible();
      await evidencia(page, 'RF-04', '03', 'descarga-cada-5');
      await page.getByRole('button', { name: 'Descarga cada 4 semanas' }).click();
      await next(page);

      // RF-04 · p02: sin días, Siguiente está desactivado.
      await expect(page.getByText('Paso 5 de 6 · Días')).toBeVisible();
      await expect(page.getByText('Elige al menos un día')).toBeVisible();
      await expect(
        page.getByTestId('wizard-actions').getByRole('button', { name: 'Siguiente' }),
      ).toBeDisabled();
      await evidencia(page, 'RF-04', '02', 'sin-dias');
      for (const day of ['Lunes', 'Miércoles', 'Jueves', 'Viernes']) {
        await page.getByRole('button', { name: day, exact: true }).click();
      }
      await expect(page.getByText('4 días · 12 semanas')).toBeVisible();
      await evidencia(page, 'RF-04', '01', 'resumen-4-dias-12-semanas');

      // RF-05 (web) · p01: casillas en Lunes y Jueves y barra «Configurar seleccionados».
      await page.getByLabel('Seleccionar Lunes').check();
      await page.getByLabel('Seleccionar Jueves').check();
      await expect(page.getByText('2 días seleccionados')).toBeVisible();
      await evidencia(page, 'RF-05', '01', 'casillas-lunes-jueves');

      // RF-05 · p02: configurar juntos con 3 ejercicios y ver «3 ejercicios» en ambos.
      await page.getByRole('button', { name: 'Configurar seleccionados' }).click();
      await expect(page).toHaveURL(/\/routines\/new\/dia\/grupo$/u);
      await expect(page.getByRole('dialog')).toHaveCount(0);
      for (const exercise of [BENCH, 'barbell incline bench press', 'dumbbell bench press']) {
        await search(page, exercise);
        await page.getByRole('button', { name: `Añadir ${exercise}`, exact: true }).click();
      }
      await expect(page.getByText('3 ejercicios', { exact: true })).toBeVisible();
      await page.getByRole('button', { name: 'Listo' }).click();
      await expect(page.getByTestId('day-row-1')).toContainText('3 ejercicios');
      await expect(page.getByTestId('day-row-4')).toContainText('3 ejercicios');
      await evidencia(page, 'RF-05', '02', 'lunes-jueves-con-3');

      // RF-05 · p03: la semana se maneja solo con teclado (Tab y espacio).
      await page.getByLabel('Seleccionar Lunes').focus();
      await page.keyboard.press('Space');
      await expect(page.getByLabel('Seleccionar Lunes')).toBeChecked();
      await expect(page.getByLabel('Seleccionar Lunes')).toBeFocused();
      await evidencia(page, 'RF-05', '03', 'teclado-espacio');
      await page.keyboard.press('Space');
      await expect(page.getByLabel('Seleccionar Lunes')).not.toBeChecked();

      // RF-06 · p01: el miércoles se edita en una página completa, no en un diálogo.
      await page.getByTestId('day-row-3').click();
      await expect(page).toHaveURL(/\/routines\/new\/dia\/3$/u);
      await expect(page.getByRole('heading', { name: 'Miércoles' })).toBeVisible();
      await expect(page.getByText('Paso 5 de 6 · Días')).toBeVisible();
      await expect(page.getByRole('dialog')).toHaveCount(0);
      await evidencia(page, 'RF-06', '01', 'dia-pantalla-completa');

      // RF-06 · p02 y p03: buscar y añadir con «+».
      await search(page, CLOSE_GRIP);
      await evidencia(page, 'RF-06', '02', 'buscar-press');
      await page.getByRole('button', { name: `Añadir ${CLOSE_GRIP}`, exact: true }).click();
      await expect(page.getByText('1 ejercicio', { exact: true })).toBeVisible();
      await expect(
        page.getByRole('button', { name: `Quitar ${CLOSE_GRIP} de la rutina. Añadido` }),
      ).toBeVisible();
      await evidencia(page, 'RF-06', '03', 'anadido-1-ejercicio');

      // RF-06 · p04: tocar el pectoral mayor en la figura abre su lista, con «+».
      await page.getByRole('searchbox', { name: 'Buscar' }).fill('');
      // Cada músculo es un botón del orden de tabulación; Intro lo abre (el clic cae sobre el lienzo).
      await page.getByRole('button', { name: 'Pectoral mayor: ver ejercicios' }).focus();
      await page.keyboard.press('Enter');
      await expect(page.getByRole('heading', { name: 'Pectoral mayor' })).toBeVisible({
        timeout: 30_000,
      });
      await expect(page.getByTestId('pick-toggle').first()).toBeVisible({ timeout: 30_000 });
      await evidencia(page, 'RF-06', '04', 'mapa-pectoral');
      await page.getByRole('button', { name: 'Todos los músculos' }).click();

      // RF-06 · p05 y p06: la ficha tiene el botón fijo y añadir vuelve con el contador en 2.
      await search(page, BENCH);
      await page.getByRole('button', { name: `${BENCH}. Abrir ficha` }).click();
      await expect(page).toHaveURL(/\/routines\/new\/ejercicio\//u);
      await expect(page.getByRole('button', { name: 'Añadir a la rutina' })).toBeVisible();
      await evidencia(page, 'RF-06', '05', 'ficha-anadir-a-la-rutina');
      await page.getByRole('button', { name: 'Añadir a la rutina' }).click();
      await expect(page).toHaveURL(/\/routines\/new\/dia\/3$/u);
      await expect(page.getByText('2 ejercicios', { exact: true })).toBeVisible();
      await evidencia(page, 'RF-06', '06', 'anadido-desde-ficha-2-ejercicios');

      // RF-06 · p07: ver y ordenar, 4 series de 6 a 8 en el primer ejercicio.
      await page.getByRole('button', { name: 'Ver y ordenar' }).click();
      await expect(page).toHaveURL(/\/ordenar/u);
      await page.getByRole('button', { name: `Bajar ${CLOSE_GRIP}` }).click();
      await page.getByLabel('Series').first().fill('4');
      await page.getByLabel('Reps mín.').first().fill('6');
      await page.getByLabel('Reps máx.').first().fill('8');
      await expect(page.getByLabel('Series').first()).toHaveValue('4');
      await evidencia(page, 'RF-06', '07', 'ver-y-ordenar');
      await page.getByRole('button', { name: 'Listo' }).click();
      await expect(page).toHaveURL(/\/routines\/new\/dia\/3$/u);

      // RF-06 · p08: tras Listo se vuelve a la semana y recargar la página no pierde nada.
      await expect(page.getByText('2 ejercicios', { exact: true })).toBeVisible();
      await page.getByRole('button', { name: 'Listo' }).click();
      await expect(page).toHaveURL(/\/routines\/new\/dias/u);
      await page.reload();
      await expect(page.getByTestId('day-row-3')).toContainText('2 ejercicios');
      await evidencia(page, 'RF-06', '08', 'atras-conserva');

      // RF-08 · p04: Viernes sigue vacío y bloquea el guardado.
      await next(page);
      await expect(page.getByText('Paso 6 de 6 · Revisión')).toBeVisible();
      await expect(page.getByText(/Hay un día sin ejercicios: Viernes/u)).toBeVisible();
      await expect(page.getByRole('button', { name: 'Guardar' })).toBeDisabled();
      await evidencia(page, 'RF-08', '04', 'dia-vacio-bloquea');

      // Se llena el viernes con un grupo distinto para dejar la rutina guardable.
      await page.goto('/routines/new/dia/5');
      await search(page, 'barbell front squat');
      await page.getByRole('button', { name: 'Añadir barbell front squat', exact: true }).click();
      await page.getByRole('button', { name: 'Listo' }).click();
      await next(page);

      // RF-08 · p03: Piernas sólo se entrena el viernes: aviso de frecuencia que no bloquea.
      await expect(page.getByText(/solo se entrena 1 vez por semana/u).first()).toBeVisible();
      await expect(page.getByRole('button', { name: 'Guardar' })).toBeEnabled();
      await evidencia(page, 'RF-08', '03', 'aviso-frecuencia');

      // RF-08 · p01 y p02: vista Mes con descargas; S6 pasa a descarga y S5 sigue normal.
      await expect(page.getByRole('button', { name: /^Semana 4, descarga/u })).toBeVisible();
      await expect(page.getByRole('button', { name: /^Semana 12, descarga/u })).toBeVisible();
      await evidencia(page, 'RF-08', '01', 'vista-mes-descargas');
      await page.getByTestId('week-row-6').getByRole('button').click();
      await page.getByRole('button', { name: 'Descarga', exact: true }).click();
      await expect(page.getByRole('button', { name: /^Semana 6, descarga/u })).toBeVisible();
      await expect(page.getByRole('button', { name: /^Semana 5\./u })).toBeVisible();
      await evidencia(page, 'RF-08', '02', 's6-descarga');

      // RF-03 · p07: guardar crea la rutina y abre su detalle.
      await page.getByRole('button', { name: 'Guardar' }).click();
      await expect(page).toHaveURL(/\/routines\/(?!new)[0-9a-f-]{36}/u, { timeout: 30_000 });
      await expect(page.getByRole('heading', { name })).toBeVisible({ timeout: 30_000 });
      await evidencia(page, 'RF-03', '07', 'rutina-guardada');

      expect(problems, 'consola y red del flujo').toEqual([]);
    });

    test('RF-07: favorito y me gusta en la ficha, y lo que ve otra cuenta', async ({
      page,
      browser,
      context,
      baseURL,
    }) => {
      const problems: string[] = [];
      watchPage(page, problems);
      // Sin animaciones: axe mide el contraste con los colores finales, no a mitad de una transición.
      await page.emulateMedia({ reducedMotion: 'reduce' });
      await context.addCookies([
        { name: THEME_COOKIE, value: combo.theme, url: baseURL ?? 'http://localhost:3002' },
      ]);
      await signIn(page, athlete);
      await page.goto('/exercises');
      await dismissTour(page);
      await autoCloseTour(page);
      await page.getByRole('searchbox', { name: 'Buscar' }).fill(BENCH);
      await page.getByRole('link', { name: BENCH, exact: true }).first().click();
      await expect(page).toHaveURL(/\/exercises\/[0-9a-f-]{36}/u);
      const exerciseUrl = page.url();
      const like = page.getByTestId('exercise-like');
      const favorite = page.getByTestId('exercise-favorite');
      // Se parte de un estado limpio por si una corrida anterior se interrumpió.
      if ((await like.getAttribute('aria-pressed')) === 'true') await like.click();
      if ((await favorite.getAttribute('aria-pressed')) === 'true') await favorite.click();
      await expect(like).toHaveAttribute('aria-pressed', 'false');
      const base = Number((await like.innerText()).match(/\d+/u)?.[0] ?? '0');

      // RF-07 · p01: ☆ favorito.
      await favorite.click();
      await expect(favorite).toHaveAttribute('aria-pressed', 'true');
      await evidencia(page, 'RF-07', '01', 'ficha-favorito');

      // RF-07 · p02: el filtro Favoritos de Ejercicios lo muestra.
      await page.goto('/exercises');
      await page.getByRole('button', { name: 'Favoritos' }).click();
      await expect(page.getByRole('link', { name: BENCH, exact: true }).first()).toBeVisible({
        timeout: 30_000,
      });
      await evidencia(page, 'RF-07', '02', 'filtro-favoritos');

      // RF-07 · p03 y p04: ♥ suma uno y quitarlo resta uno.
      await page.goto(exerciseUrl);
      await like.click();
      await expect(like).toContainText(`Me gusta · ${base + 1}`);
      await evidencia(page, 'RF-07', '03', 'me-gusta-mas-uno');

      // RF-07 · p05: la cuenta B ve el contador público pero no el favorito de A.
      const other = await browser.newContext({
        viewport: { width: combo.width, height: combo.height },
      });
      await other.addCookies([
        { name: THEME_COOKIE, value: combo.theme, url: baseURL ?? 'http://localhost:3002' },
      ]);
      const pageB = await other.newPage();
      await pageB.emulateMedia({ reducedMotion: 'reduce' });
      await signIn(pageB, accountB);
      await pageB.goto(exerciseUrl);
      await expect(pageB.getByTestId('exercise-like')).toContainText(`Me gusta · ${base + 1}`, {
        timeout: 30_000,
      });
      await expect(pageB.getByTestId('exercise-favorite')).toHaveAttribute('aria-pressed', 'false');
      await evidencia(pageB, 'RF-07', '05', 'cuenta-b-ve-contador');
      await other.close();

      await like.click();
      await expect(like).toContainText(`Me gusta · ${base}`);
      await evidencia(page, 'RF-07', '04', 'me-gusta-menos-uno');
      await favorite.click();
      await expect(favorite).toHaveAttribute('aria-pressed', 'false');

      expect(problems, 'consola del flujo').toEqual([]);
    });
  });
}
