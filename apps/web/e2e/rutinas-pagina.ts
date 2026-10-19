/**
 * Piezas comunes de los specs de rutinas REPP (F3 a F6): las cuatro combinaciones
 * de la evidencia, el vigilante de errores de la página y el inicio de sesión
 * rápido por el BFF.
 *
 * Una página que registra `console.error` o una respuesta 5xx no pasa la prueba;
 * un 4xx tampoco, salvo que el flujo lo espere (`permitir`), como el 409 de una
 * publicación duplicada o el 403 de una invitación sin aceptar.
 */
import { expect as baseExpect, type Browser, type BrowserContext, type Page } from '@playwright/test';
import { THEME_COOKIE } from '../src/shared/theme/theme-script';
import type { Cuenta } from './rutinas-datos';

/** `next dev` compila cada ruta la primera vez y con el equipo cargado puede tardar. */
export const expect = baseExpect.configure({ timeout: 60_000 });

export const combos = [
  { width: 390, height: 844, theme: 'light' },
  { width: 390, height: 844, theme: 'dark' },
  { width: 1440, height: 900, theme: 'light' },
  { width: 1440, height: 900, theme: 'dark' },
] as const;
export type Combo = (typeof combos)[number];

export const comboLabel = (combo: Combo) => `${combo.width} ${combo.theme === 'light' ? 'claro' : 'oscuro'}`;

export type Permiso = { status: number; url: RegExp };

export type Vigilante = {
  problemas: string[];
  /** Declara que un 4xx concreto es parte del flujo y no un defecto. */
  permitir: (permiso: Permiso) => void;
  /** Declara que un `console.error` es la consecuencia esperada de un fallo provocado a propósito. */
  permitirConsola: (texto: RegExp) => void;
};

/** Cierra el tour de bienvenida en cuanto aparece: su capa se come los clics. */
export async function cerrarTour(page: Page) {
  const boton = page.getByRole('button', { name: /Cerrar tutorial|Omitir/u }).first();
  await page.addLocatorHandler(boton, async (skip) => {
    await skip.click();
  });
  tours.set(page, boton);
}

const tours = new WeakMap<Page, ReturnType<Page['locator']>>();

/**
 * Deja de cerrar el tour automáticamente. Para pantallas que abren a la vez un modal propio (la
 * celebración de una insignia): con el manejador puesto, el clic sobre el tour choca con ese modal
 * y la prueba se atasca. Quien la llama cierra los dos con `Escape`.
 */
export async function dejarElTour(page: Page) {
  const boton = tours.get(page);
  if (boton) await page.removeLocatorHandler(boton);
}

export function vigilar(page: Page): Vigilante {
  const problemas: string[] = [];
  const permitidos: Permiso[] = [];
  const consolaPermitida: RegExp[] = [];
  page.on('console', (message) => {
    if (message.type() !== 'error') return;
    if (consolaPermitida.some((texto) => texto.test(message.text()))) return;
    // El navegador registra así cada recurso con 4xx: el detalle lo decide la regla de respuestas.
    if (message.text().startsWith('Failed to load resource')) return;
    problemas.push(`console.error: ${message.text()}`);
  });
  page.on('response', (response) => {
    const status = response.status();
    const url = response.url();
    const esMedia = /\/(media|exercise-media)\//u.test(url) || response.request().resourceType() === 'image';
    // El motor de tutoriales pide `/me/tutorial-progress`, que este backend aún no expone.
    const esTutorial = url.includes('/me/tutorial-progress');
    if (status < 400 || esMedia || esTutorial) return;
    if (permitidos.some((permiso) => permiso.status === status && permiso.url.test(url))) return;
    problemas.push(`${status} ${url}`);
  });
  return {
    problemas,
    permitir: (permiso) => permitidos.push(permiso),
    permitirConsola: (texto) => consolaPermitida.push(texto),
  };
}

/**
 * Prepara la página para una combinación: tema por cookie (la lee el script
 * anti-FOUC), sin animaciones y con la sesión de `cuenta` ya iniciada.
 */
export async function abrirComo(
  page: Page,
  context: BrowserContext,
  baseURL: string | undefined,
  combo: Combo,
  cuenta: Cuenta,
): Promise<Vigilante> {
  const vigilante = vigilar(page);
  const origen = baseURL ?? 'http://localhost:3002';
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await context.addCookies([{ name: THEME_COOKIE, value: combo.theme, url: origen }]);
  await iniciarSesion(page, cuenta);
  await cerrarTour(page);
  return vigilante;
}

/** Inicio de sesión directo contra el BFF: deja la cookie de sesión en el contexto sin recorrer la pantalla. */
export async function iniciarSesion(page: Page, cuenta: Pick<Cuenta, 'email' | 'password'>) {
  const respuesta = await page.request.post('/api/auth/login', {
    data: { email: cuenta.email, password: cuenta.password },
  });
  if (!respuesta.ok()) throw new Error(`No se pudo iniciar sesión (${respuesta.status()}).`);
}

export async function cerrarSesion(page: Page) {
  await page.context().clearCookies({ name: 'gymsheet_session' }).catch(() => undefined);
}

/**
 * Una segunda persona en su propio contexto de navegador (cookies aparte), con la
 * misma combinación de tamaño y tema. Para los flujos de dos cuentas.
 */
export async function abrirSegundo(
  browser: Browser,
  baseURL: string | undefined,
  combo: Combo,
  cuenta: Cuenta,
): Promise<{ page: Page; context: BrowserContext; vigilante: Vigilante }> {
  const context = await browser.newContext({
    viewport: { width: combo.width, height: combo.height },
    colorScheme: combo.theme,
    ...(baseURL ? { baseURL } : {}),
  });
  const page = await context.newPage();
  const vigilante = await abrirComo(page, context, baseURL, combo, cuenta);
  return { page, context, vigilante };
}

/** Espera a que terminen las animaciones de entrada del resumen de sesión (cifras que cuentan y filas que aparecen). */
export async function esperarResumen(page: Page) {
  await page.getByTestId('program-session').waitFor();
  await page.waitForFunction(
    () =>
      [...document.querySelectorAll('ul[aria-label="De dónde salen tus puntos"] > li')].every(
        (item) => getComputedStyle(item).opacity === '1',
      ),
  );
  await page.waitForTimeout(1_500);
}
