import type { TenantBrand } from './brand-contract';

/**
 * Contrato de color de la aplicación web.
 *
 * Enumera todas las variables CSS de color que el estilo consume y las asocia a
 * una clave tipada. Es la pieza que permite que un inquilino redefina la
 * identidad visual sin tocar CSS: la hoja de estilos declara la estructura y
 * consume `var(--…)`, mientras los valores llegan desde una paleta.
 *
 * Los valores se guardan como cadenas CSS finales (no como componentes sueltos)
 * para que una paleta pueda expresar cualquier notación válida —hex, `rgb()`
 * con alfa, sombras compuestas— sin que el generador tenga que interpretarlas.
 */

/** Tokens que aceptan cualquier color CSS. */
export type ColorToken =
  // Superficies, de fondo a más elevada
  | 'background'
  | 'surfaceLowest'
  | 'surfaceLow'
  | 'surface'
  | 'surfaceHigh'
  | 'surfaceHighest'
  | 'surfaceSidebar'
  // Bordes
  | 'borderSubtle'
  | 'border'
  // Texto
  | 'text'
  | 'textMuted'
  | 'textDisabled'
  // Acento de marca
  | 'accent'
  | 'accentDim'
  | 'accentInk'
  | 'accentContrast'
  // Estados planos
  | 'danger'
  | 'warning'
  | 'success'
  // Tonos semánticos (fondo / borde / texto)
  | 'successBg'
  | 'successBorder'
  | 'successText'
  | 'warningBg'
  | 'warningBorder'
  | 'warningText'
  | 'dangerBg'
  | 'dangerBorder'
  | 'dangerText'
  | 'dangerSurface'
  | 'infoBg'
  | 'infoBorder'
  | 'infoText'
  // Cromo de la aplicación
  | 'headerBg'
  | 'overlay'
  | 'focusRing'
  | 'gridLine'
  | 'pageGlow'
  | 'sheen'
  | 'sheenBase'
  | 'scrim'
  // Fondos ambientales
  | 'aurora1'
  | 'aurora2'
  | 'aurora3'
  | 'auroraSpot'
  // Elevación (sombras completas, no sólo su color)
  | 'shadowSm'
  | 'shadowMd'
  | 'shadowLg'
  | 'shadowDialog';

/** Nombre de la variable CSS que publica cada token. */
export const cssVariableByToken: Record<ColorToken, string> = {
  background: '--background',
  surfaceLowest: '--surface-lowest',
  surfaceLow: '--surface-low',
  surface: '--surface',
  surfaceHigh: '--surface-high',
  surfaceHighest: '--surface-highest',
  surfaceSidebar: '--surface-sidebar',
  borderSubtle: '--border-subtle',
  border: '--border',
  text: '--text',
  textMuted: '--text-muted',
  textDisabled: '--text-disabled',
  accent: '--volt',
  accentDim: '--volt-dim',
  accentInk: '--accent-ink',
  accentContrast: '--accent-contrast',
  danger: '--danger',
  warning: '--warning',
  success: '--success',
  successBg: '--success-bg',
  successBorder: '--success-border',
  successText: '--success-text',
  warningBg: '--warning-bg',
  warningBorder: '--warning-border',
  warningText: '--warning-text',
  dangerBg: '--danger-bg',
  dangerBorder: '--danger-border',
  dangerText: '--danger-text',
  dangerSurface: '--danger-surface',
  infoBg: '--info-bg',
  infoBorder: '--info-border',
  infoText: '--info-text',
  headerBg: '--header-bg',
  overlay: '--overlay',
  focusRing: '--focus-ring',
  gridLine: '--grid-line',
  pageGlow: '--page-glow',
  sheen: '--sheen',
  sheenBase: '--sheen-base',
  scrim: '--scrim',
  aurora1: '--aurora-1',
  aurora2: '--aurora-2',
  aurora3: '--aurora-3',
  auroraSpot: '--aurora-spot',
  shadowSm: '--shadow-sm',
  shadowMd: '--shadow-md',
  shadowLg: '--shadow-lg',
  shadowDialog: '--shadow-dialog',
};

/**
 * Escalares del modo que no son colores pero se calibran junto a ellos: una
 * paleta clara necesita menos grano y menos intensidad ambiental que una
 * oscura para no ensuciar el lienzo.
 */
export type ModeScalars = {
  /** Opacidad de la textura de grano del fondo. */
  readonly noiseOpacity: number;
  /** Multiplicador global de las luces ambientales. */
  readonly ambientStrength: number;
};

export const cssVariableByScalar: Record<keyof ModeScalars, string> = {
  noiseOpacity: '--noise-opacity',
  ambientStrength: '--ambient-strength',
};

/** Paleta completa de un modo (claro u oscuro). */
export type ModePalette = Readonly<Record<ColorToken, string>> &
  ModeScalars & {
    /** Alimenta `color-scheme`, que define el aspecto nativo de los controles. */
    readonly colorScheme: 'light' | 'dark';
  };

/** Identidad completa de un inquilino: marca y ambas paletas. */
export type TenantTheme = {
  /** Identificador estable, usado en trazas y en el atributo del `<html>`. */
  readonly id: string;
  readonly brand: TenantBrand;
  readonly dark: ModePalette;
  readonly light: ModePalette;
};

/** Modo con el que se sirve la primera pintura cuando no hay preferencia. */
export type PaletteMode = 'dark' | 'light';

export const colorTokens = Object.keys(cssVariableByToken) as ColorToken[];
