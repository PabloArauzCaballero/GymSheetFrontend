import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import AxeBuilder from '@axe-core/playwright';
import { expect, test as base, type Page } from '@playwright/test';

/**
 * Evidencia visual del plan de rutinas REPP (`06_PRUEBAS_Y_EVIDENCIA.md`, DoD-3).
 *
 * Un paso se da por probado sólo si deja su captura, y la captura sólo vale si
 * se tomó con la pantalla quieta, sin errores de consola, sin respuestas 5xx y
 * sin violaciones graves de accesibilidad. Este módulo reúne esas tres
 * condiciones para que cada spec no las reimplemente.
 */

export type ComboEvidencia = '390-claro' | '390-oscuro' | '1440-claro' | '1440-oscuro';

type JuegoDeDatos = {
  tenantId: string;
  gym: string;
  author: string;
  reader: string;
  memberA: { email: string; id: string; nombre: string; programId: string };
  memberB: { email: string; id: string; nombre: string; programId: string };
  dangerous: { id: string; nombre: string };
  plagiarized: { id: string; nombre: string };
  privateExercise: { id: string; nombre: string };
  comment: { id: string; texto: string };
  officialName: string;
};

export type SemillaRutinas = {
  run: string;
  password: string;
  sys: string;
  other: string;
  catalogExercise: string;
  combos: Record<ComboEvidencia, JuegoDeDatos>;
};

/** La siembra la escribe `scripts/seed-evidencia-rutinas.mjs`. */
export function cargarSemilla(): SemillaRutinas {
  const file = resolve(process.cwd(), '.e2e-assets/rutinas-seed.json');
  try {
    return JSON.parse(readFileSync(file, 'utf8')) as SemillaRutinas;
  } catch {
    throw new Error(
      `Falta ${file}. Siembra los datos primero: node scripts/seed-evidencia-rutinas.mjs (ver el encabezado del script).`,
    );
  }
}

/** Cada proyecto de Playwright es una combinación: su nombre es la clave del juego de datos. */
export function comboDe(projectName: string): ComboEvidencia {
  const combo = projectName.replace(/^evidencia-/u, '');
  if (combo === '390-claro' || combo === '390-oscuro' || combo === '1440-claro' || combo === '1440-oscuro') {
    return combo;
  }
  throw new Error(`El proyecto «${projectName}» no es una combinación de evidencia.`);
}

type Fixtures = {
  /** Mensajes de consola que ESTA prueba espera (p. ej. el 403 de una página sin acceso). */
  consolaPermitida: RegExp[];
  vigilante: void;
};

/**
 * Ruido que ya existía y no es de estas pantallas: el tour de bienvenida llama a
 * `/me/tutorial-progress`, una ruta que el backend todavía no tiene (el 404 sale
 * en cualquier pantalla del portal; `theme-parity.spec.ts` lo menciona). Es lo
 * ÚNICO que se descarta siempre, y por URL exacta, no por tipo de error.
 */
const RUIDO_CONOCIDO = /Failed to load resource: the server responded with a status of 404 .*\/api\/backend\/me\/tutorial-progress/u;
/** El motor de avisos deja su propio `console.error` genérico cuando falla esa misma escritura del tour. */
const AVISO_DEL_TOUR = /\[notifications\] \{severity: error, code: Error,/u;

/**
 * `test` con el vigilante del plan: falla si hubo `console.error`, un error de
 * página o una respuesta 5xx. No se silencia nada globalmente: una prueba que
 * provoca a propósito un 4xx lo declara en `consolaPermitida`.
 */
export const test = base.extend<Fixtures>({
  consolaPermitida: async ({}, entregar) => {
    await entregar([]);
  },
  vigilante: [
    async ({ page, consolaPermitida }, entregar) => {
      const problemas: string[] = [];
      page.on('console', (message) => {
        if (message.type() === 'error') problemas.push(`console.error: ${message.text()} ${message.location().url}`);
      });
      page.on('pageerror', (error) => problemas.push(`pageerror: ${error.message}`));
      page.on('response', (response) => {
        if (response.status() >= 500) problemas.push(`${response.status()} ${response.url()}`);
      });
      await entregar();
      const huboRuidoDelTour = problemas.some((problema) => RUIDO_CONOCIDO.test(problema));
      const reales = problemas.filter(
        (problema) =>
          !RUIDO_CONOCIDO.test(problema) &&
          !(huboRuidoDelTour && AVISO_DEL_TOUR.test(problema)) &&
          !consolaPermitida.some((permitida) => permitida.test(problema)),
      );
      expect(reales, 'consola y red durante la prueba').toEqual([]);
    },
    { auto: true },
  ],
});

/**
 * Los rótulos de grupo del menú lateral («Gimnasio», «Tu cuenta») se pintan con
 * `--text-disabled` y no llegan a 4,5:1 en el tema claro (2,39:1). Es del
 * esqueleto del portal, existía antes y afecta a todas las pantallas de
 * administración; se deja fuera de ESTA comprobación para que no tape lo que sí
 * es de estas pantallas, y queda anotado en el informe como hallazgo.
 */
const ROTULOS_DEL_MENU = 'nav[aria-label="Navegación principal"] p';

/**
 * El aviso emergente de «No tienes permiso…» es de una librería de avisos y su
 * descripción no llega a 4,5:1 en el tema oscuro (1,84:1). Es transitorio y
 * ajeno a estas pantallas; también queda en el informe como hallazgo.
 */
const AVISOS_EMERGENTES = '[data-sonner-toaster]';

/** Sin violaciones graves o críticas de WCAG A/AA en lo que hay a la vista. */
async function sinViolacionesGraves(page: Page, etiqueta: string): Promise<void> {
  const resultado = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa'])
    .exclude(ROTULOS_DEL_MENU)
    .exclude(AVISOS_EMERGENTES)
    .analyze();
  const graves = resultado.violations
    .filter((violation) => violation.impact === 'serious' || violation.impact === 'critical')
    .map((violation) => `${violation.id} (${violation.impact}): ${violation.help} → ${violation.nodes.slice(0, 3).map((node) => `${node.target.join(' ')} [${node.any.map((c) => c.message).join('; ')}]`).join(' | ')}`);
  expect(graves, `axe en ${etiqueta}`).toEqual([]);
}

/**
 * Toma la captura de un paso del plan y comprueba la accesibilidad de lo que muestra
 * (salvo `sinAxe`, que exige decir por qué).
 *
 * `paso` es el número de la tabla del plan («01») y `nombre` el paso en kebab.
 * Con un diálogo abierto se retrata la pantalla y no la página: ampliar el
 * lienzo recoloca la capa fija del modal y la imagen sale desplazada.
 */
export async function evidencia(
  page: Page,
  rf: string,
  paso: string,
  nombre: string,
  opciones: { sinAxe?: string } = {},
): Promise<string> {
  await expect(page.locator('[aria-busy="true"]')).toHaveCount(0);
  const viewport = page.viewportSize()?.width ?? 0;
  const tema = await page.evaluate(() => (document.documentElement.dataset.theme === 'light' ? 'claro' : 'oscuro'));
  const archivo = `../../docs/evidencias/rutinas/${rf}/web/${rf}_p${paso}_${nombre}_${viewport}_${tema}.png`;
  // El indicador de Next en desarrollo no es parte de la pantalla.
  await page.addStyleTag({ content: 'nextjs-portal { display: none !important; }' });
  const hayDialogo = await page.getByRole('dialog').first().isVisible().catch(() => false);
  await page.screenshot({ path: archivo, fullPage: !hayDialogo, animations: 'disabled' });
  if (opciones.sinAxe) {
    // Sólo para pantallas de OTRO equipo en las que la prueba aterriza por una redirección; queda anotado en el informe de Playwright.
    test.info().annotations.push({ type: 'axe-omitido', description: `${rf} p${paso} ${nombre}: ${opciones.sinAxe}` });
  } else {
    await sinViolacionesGraves(page, `${rf} p${paso} ${nombre}`);
  }
  return archivo;
}

const BACKEND = process.env.BACKEND_API_URL ?? 'http://localhost:3011/api/v1';

/**
 * Habla con el backend como una persona concreta, sin pasar por la web.
 *
 * Sirve para comprobar el EFECTO de un paso de la interfaz (qué quedó
 * guardado, qué aviso recibió el autor) en vez de fiarse de que la pantalla
 * diga «hecho».
 */
export async function backendComo(email: string, password: string) {
  const headers = { 'content-type': 'application/json' };
  const login = await fetch(`${BACKEND}/auth/login`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ email, password }),
  });
  const session = (await login.json()) as { data?: { accessToken?: string } };
  const token = session.data?.accessToken;
  if (!token) throw new Error(`No se pudo iniciar sesión como ${email} en ${BACKEND}.`);
  return {
    get: async <T>(path: string): Promise<T> => {
      const response = await fetch(`${BACKEND}${path}`, { headers: { ...headers, authorization: `Bearer ${token}` } });
      const body = (await response.json()) as { data: T };
      if (!response.ok) throw new Error(`GET ${path} -> ${response.status}`);
      return body.data;
    },
  };
}
