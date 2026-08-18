import 'server-only';
import { headers } from 'next/headers';
import { buildThemeCss } from './build-theme-css';
import type { TenantTheme } from './color-contract';
import { defaultTheme } from './default-palette';
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

/** Identidad correspondiente al host de la petición en curso. */
export async function currentTheme(): Promise<TenantTheme> {
  const requestHeaders = await headers();
  return resolveTheme(requestHeaders.get('host'), registry());
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
