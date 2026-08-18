import { FONT_VARIABLE, fontVariableByKey } from './brand-contract';
import {
  cssVariableByScalar,
  cssVariableByToken,
  colorTokens,
  type ModePalette,
  type TenantTheme,
} from './color-contract';

/**
 * Traduce una paleta a la hoja de variables que se inyecta en el documento.
 *
 * El CSS de la aplicación no contiene ningún color: declara la estructura y
 * consume `var(--…)`. Este generador es el único punto donde una identidad
 * concreta se convierte en valores, de modo que cambiar de inquilino es cambiar
 * de paleta y nada más.
 */

/**
 * Los valores vienen de configuración, no de código, así que podrían cerrar el
 * bloque `<style>` y colar marcado. Se rechaza cualquier carácter con
 * significado estructural en CSS o HTML en lugar de escaparlo: una paleta
 * legítima nunca los necesita, y fallar es preferible a emitir algo dudoso.
 */
const forbiddenInValue = /[<>{};]/u;

function assertSafeValue(token: string, value: string): string {
  if (forbiddenInValue.test(value)) {
    throw new Error(
      `Valor de tema inválido en «${token}»: no puede contener < > { } ni punto y coma.`,
    );
  }
  return value;
}

const shortHex = /^#([0-9a-f])([0-9a-f])([0-9a-f])$/iu;
const longHex = /^#([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/iu;

/**
 * Descompone un color en sus canales para poder componer alfas arbitrarias
 * (`rgb(var(--accent-channels) / 0.55)`). Sin esto, cada opacidad distinta del
 * acento obligaría a declarar su propia variable.
 */
function toChannels(token: string, value: string): string {
  const long = longHex.exec(value);
  if (long) {
    return long.slice(1, 4).map((part) => Number.parseInt(part, 16)).join(' ');
  }
  const short = shortHex.exec(value);
  if (short) {
    return short
      .slice(1, 4)
      .map((part) => Number.parseInt(`${part}${part}`, 16))
      .join(' ');
  }
  throw new Error(
    `El token «${token}» debe ser un color hexadecimal (#rgb o #rrggbb) porque se descompone en canales; se recibió «${value}».`,
  );
}

/** Tokens de los que se derivan variables de canales. */
const channelSources = {
  accent: '--accent-channels',
  scrim: '--scrim-channels',
  sheenBase: '--sheen-channels',
} as const;

function declarationsFor(palette: ModePalette): string[] {
  const declarations = [`color-scheme: ${palette.colorScheme}`];

  for (const token of colorTokens) {
    const value = assertSafeValue(token, palette[token]);
    declarations.push(`${cssVariableByToken[token]}: ${value}`);
  }

  for (const [token, variable] of Object.entries(channelSources)) {
    declarations.push(`${variable}: ${toChannels(token, palette[token as keyof ModePalette] as string)}`);
  }

  for (const [scalar, variable] of Object.entries(cssVariableByScalar)) {
    const value = palette[scalar as keyof typeof cssVariableByScalar];
    if (!Number.isFinite(value)) {
      throw new Error(`El escalar de tema «${scalar}» debe ser numérico.`);
    }
    declarations.push(`${variable}: ${value}`);
  }

  return declarations;
}

function block(selector: string, palette: ModePalette): string {
  return `${selector}{${declarationsFor(palette).join(';')}}`;
}

/**
 * Hoja completa del inquilino. El selector duplicado (`:root:root`) sube la
 * especificidad lo justo para ganar siempre a la hoja de la aplicación, sin
 * depender del orden en que Next inserte los estilos.
 */
export function buildThemeCss(theme: TenantTheme): string {
  // La tipografía no depende del modo claro/oscuro, así que se declara una vez.
  const typography = `:root:root{${FONT_VARIABLE}: ${fontVariableByKey[theme.brand.font]}}`;
  return [
    block(':root:root', theme.dark),
    block(":root:root[data-theme='light']", theme.light),
    typography,
  ].join('');
}
