import { defaultBrand } from './brand-contract';
import type { ModePalette, TenantTheme } from './color-contract';

/**
 * Identidad REPP: la misma superficie navy y el mismo jade que la app móvil.
 *
 * Los valores son los que vivían escritos a mano en `globals.css`, trasladados
 * uno a uno. Es la paleta de referencia y también el respaldo cuando un
 * inquilino sólo redefine una parte de la identidad.
 */
const dark: ModePalette = {
  colorScheme: 'dark',

  // Rampa navy del móvil (`apps/mobile/src/theme/palette.ts` → `neutral`).
  // La web y el móvil pintan la misma superficie: `mobile-parity.test.ts`
  // falla si una de las dos cambia sin la otra.
  background: '#0F172A',
  surfaceLowest: '#141E31',
  surfaceLow: '#172235',
  surface: '#1A253A',
  surfaceHigh: '#1D283D',
  surfaceHighest: '#243247',
  surfaceSidebar: '#0F172A',

  borderSubtle: '#202C42',
  border: '#2C3A52',

  text: '#F5F8FA',
  textMuted: '#A9B6C2',
  textDisabled: '#718091',

  // Jade REPP (`gymsheetTenant.colors` en `@gymsheet/design-tokens`).
  accent: '#2E8B7B',
  accentDim: '#2E8B7B',
  accentInk: '#74CFBE',
  accentContrast: '#000000',

  danger: '#ff8577',
  warning: '#f2b85b',
  success: '#62D99C',

  // Chips de estado: los tonos `dark` compartidos; el éxito se deriva del
  // verde de la marca como en `apps/mobile/src/theme/colors.ts`.
  successBg: 'rgb(98 217 156 / 0.12)',
  successBorder: 'rgb(98 217 156 / 0.35)',
  successText: '#62D99C',
  warningBg: '#241c0c',
  warningBorder: '#5b4820',
  warningText: '#e0b65f',
  dangerBg: '#241211',
  dangerBorder: '#63302c',
  dangerText: '#ffb4ab',
  dangerSurface: '#1c1416',
  infoBg: '#111b21',
  infoBorder: '#344654',
  infoText: '#a8d4ee',

  // Cromo translúcido como la barra de pestañas del móvil (BlurView oscuro).
  headerBg: 'rgb(15 23 42 / 0.72)',
  overlay: 'rgb(0 0 0 / 0.72)',
  focusRing: '#74CFBE',
  // Sin trama: el lienzo del móvil es liso.
  gridLine: 'rgb(255 255 255 / 0)',
  pageGlow: 'rgb(46 139 123 / 0.08)',
  sheen: 'rgb(255 255 255 / 0.28)',
  sheenBase: '#ffffff',
  scrim: '#000000',

  aurora1: 'rgb(46 139 123 / 0.08)',
  aurora2: 'rgb(56 189 172 / 0.04)',
  aurora3: 'rgb(132 150 170 / 0.04)',
  auroraSpot: 'rgb(46 139 123 / 0.05)',
  noiseOpacity: 0.015,
  ambientStrength: 1,

  // Elevación del móvil (`apps/mobile/src/theme/shadow.ts`): las tarjetas se
  // separan por tono y sombra, no por bordes. sm = e1, md = e2, lg = card.
  shadowSm: 'inset 0 1px 0 rgb(255 255 255 / 0.04), 0 1px 2px rgb(0 0 0 / 0.4)',
  shadowMd: 'inset 0 1px 0 rgb(255 255 255 / 0.05), 0 12px 32px rgb(0 0 0 / 0.45)',
  shadowLg: 'inset 0 1px 0 rgb(255 255 255 / 0.07), 0 18px 40px -12px rgb(0 0 0 / 0.7)',
  shadowDialog: 'inset 0 1px 0 rgb(255 255 255 / 0.06), 0 -8px 24px rgb(0 0 0 / 0.5), 0 40px 120px -40px rgb(0 0 0 / 0.9)',
};

const light: ModePalette = {
  colorScheme: 'light',

  // Contrapartida clara de `@gymsheet/design-tokens` (`lightColors`). El móvil
  // solo es oscuro; la web la ofrece con el mismo jade y la misma geometría.
  background: '#E9EEF2',
  surfaceLowest: '#FFFFFF',
  surfaceLow: '#FFFFFF',
  surface: '#FFFFFF',
  surfaceHigh: '#F1F4F6',
  surfaceHighest: '#E3E9EE',
  surfaceSidebar: '#E9EEF2',

  borderSubtle: '#D6DEE5',
  border: '#AAB8C4',

  text: '#18212B',
  textMuted: '#53616D',
  textDisabled: '#77838D',

  accent: '#2E8B7B',
  accentDim: '#2E8B7B',
  accentInk: '#22685D',
  accentContrast: '#000000',

  danger: '#b23a30',
  warning: '#8a6410',
  success: '#216B46',

  successBg: '#e7f5ec',
  successBorder: '#92c7a8',
  successText: '#216B46',
  warningBg: '#fbf1d6',
  warningBorder: '#e6cd82',
  warningText: '#8a6410',
  dangerBg: '#fdeceb',
  dangerBorder: '#f0b3ad',
  dangerText: '#b23a30',
  dangerSurface: '#fdf3f2',
  infoBg: '#e9f2fb',
  infoBorder: '#aacdee',
  infoText: '#235d88',

  headerBg: 'rgb(233 238 242 / 0.8)',
  overlay: 'rgb(15 23 42 / 0.4)',
  focusRing: '#22685D',
  gridLine: 'rgb(24 33 43 / 0)',
  pageGlow: 'rgb(46 139 123 / 0.1)',
  sheen: 'rgb(255 255 255 / 0.65)',
  sheenBase: '#ffffff',
  scrim: '#000000',

  aurora1: 'rgb(46 139 123 / 0.12)',
  aurora2: 'rgb(45 160 148 / 0.08)',
  aurora3: 'rgb(132 150 170 / 0.08)',
  auroraSpot: 'rgb(46 139 123 / 0.06)',
  noiseOpacity: 0.015,
  ambientStrength: 1,

  shadowSm: '0 1px 2px rgb(15 23 42 / 0.06), 0 4px 12px -6px rgb(15 23 42 / 0.1)',
  shadowMd: '0 12px 32px -12px rgb(15 23 42 / 0.18)',
  shadowLg: '0 18px 40px -12px rgb(15 23 42 / 0.22)',
  shadowDialog: '0 40px 120px -40px rgb(15 23 42 / 0.45)',
};

export const defaultTheme: TenantTheme = {
  id: 'gymsheet',
  brand: defaultBrand,
  dark,
  light,
};
