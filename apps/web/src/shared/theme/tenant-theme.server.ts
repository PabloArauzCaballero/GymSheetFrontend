import 'server-only';
import { cookies, headers } from 'next/headers';
import { buildThemeCss } from './build-theme-css';
import type { TenantTheme } from './color-contract';
import { defaultTheme } from './default-palette';
import { TENANT_COOKIE } from './tenant-cookie';
import { themeForTenantId } from './tenant-catalog';
import { parseRegistry, resolveTheme } from './tenant-palette';

/**
 * Punto de entrada del servidor para la identidad del inquilino.
 *
 * El registro se interpreta una sola vez por proceso: es configuración estable
 * y volver a validarlo en cada petición sólo añadiría trabajo. Si el JSON está
 * mal, el fallo aparece en el primer render y no en algunas peticiones.
 */
let cachedRegistry: Record<string, TenantTheme> | null = null;

function registry(): Record<string, TenantTheme> {
  cachedRegistry ??= parseRegistry(process.env.TENANT_THEMES);
  return cachedRegistry;
}

/**
 * Identidad fija del despliegue, si la hay.
 *
 * `TENANT_ID` cubre el caso habitual: un gimnasio con su propio despliegue y su
 * propio dominio. El registro por host (`TENANT_THEMES`) sigue existiendo para
 * el despliegue compartido, y tiene prioridad porque es más específico.
 */
function deploymentTheme(): TenantTheme | null {
  const id = process.env.TENANT_ID?.trim();
  return id ? themeForTenantId(id) : null;
}

/**
 * Identidad de la petición en curso.
 *
 * Se consulta de lo más específico a lo más general: la cookie que dejó la URL
 * de acceso, el host (despliegue compartido con varios dominios), la variable
 * del despliegue y, por último, la marca de referencia. El orden importa: la
 * elección explícita del usuario al entrar por su URL debe pesar más que
 * cualquier valor de configuración.
 */
export async function currentTheme(): Promise<TenantTheme> {
  const fromCookie = (await cookies()).get(TENANT_COOKIE)?.value;
  if (fromCookie) {
    const theme = themeForTenantId(fromCookie);
    if (theme.id !== defaultTheme.id) return theme;
  }

  const requestHeaders = await headers();
  const byHost = resolveTheme(requestHeaders.get('host'), registry());
  if (byHost.id !== defaultTheme.id) return byHost;

  return deploymentTheme() ?? byHost;
}

/** Sólo la marca, para superficies que no necesitan la paleta. */
export async function currentBrand() {
  return (await currentTheme()).brand;
}

/**
 * Hoja de variables lista para incrustar en `<head>`. Al renderizarse en el
 * servidor llega con el documento, así que no hay ventana en la que la página
 * se pinte con la identidad equivocada.
 */
export async function currentThemeStyle(): Promise<{ theme: TenantTheme; css: string }> {
  const theme = await currentTheme();
  return { theme, css: buildThemeCss(theme) };
}

/** Identidad de referencia, para superficies que se rendericen sin petición. */
export { defaultTheme };
