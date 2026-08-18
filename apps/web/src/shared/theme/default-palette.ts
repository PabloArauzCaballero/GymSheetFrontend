import { defaultBrand } from './brand-contract';
import type { ModePalette, TenantTheme } from './color-contract';

/**
 * Identidad GymSheet: oscuro "volt" de alto contraste y su contrapartida clara.
 *
 * Los valores son los que vivían escritos a mano en `globals.css`, trasladados
 * uno a uno. Es la paleta de referencia y también el respaldo cuando un
 * inquilino sólo redefine una parte de la identidad.
 */
const dark: ModePalette = {
  colorScheme: 'dark',

  background: '#000000',
  surfaceLowest: '#080808',
  surfaceLow: '#0d0d0d',
  surface: '#131313',
  surfaceHigh: '#1f1f1f',
  surfaceHighest: '#2a2a2a',
  surfaceSidebar: '#050505',

  borderSubtle: '#1a1a1a',
  border: '#262626',

  text: '#f5f5f5',
  textMuted: '#8c8c8c',
  textDisabled: '#4d4d4d',

  accent: '#c3f400',
  accentDim: '#abd600',
  accentInk: '#c3f400',
  // Texto e iconos que van encima del relleno de acento.
  accentContrast: '#000000',

  danger: '#ff6b63',
  warning: '#d7a944',
  success: '#c3f400',

  successBg: '#182000',
  successBorder: '#526800',
  successText: '#c3f400',
  warningBg: '#241c0c',
  warningBorder: '#5b4820',
  warningText: '#e0b65f',
  dangerBg: '#241211',
  dangerBorder: '#63302c',
  dangerText: '#ffb4ab',
  dangerSurface: '#160c0b',
  infoBg: '#111b21',
  infoBorder: '#344654',
  infoText: '#a8d4ee',

  headerBg: 'rgb(0 0 0 / 0.9)',
  overlay: 'rgb(0 0 0 / 0.8)',
  focusRing: '#ffffff',
  gridLine: 'rgb(255 255 255 / 0.02)',
  pageGlow: 'rgb(195 244 0 / 0.045)',
  sheen: 'rgb(255 255 255 / 0.45)',
  // Color base del destello; su alfa se compone en cada uso.
  sheenBase: '#ffffff',
  // Velo que oscurece la media bajo el texto de una tarjeta.
  scrim: '#000000',

  aurora1: 'rgb(195 244 0 / 0.14)',
  aurora2: 'rgb(56 189 172 / 0.12)',
  aurora3: 'rgb(120 110 255 / 0.1)',
  auroraSpot: 'rgb(195 244 0 / 0.09)',
  noiseOpacity: 0.028,
  ambientStrength: 1,

  shadowSm: '0 1px 2px rgb(0 0 0 / 0.4)',
  shadowMd: '0 12px 32px -18px rgb(0 0 0 / 0.7)',
  shadowLg: '0 40px 120px -40px rgb(0 0 0 / 0.9)',
  // Los diálogos llevan hoy la misma sombra en claro y en oscuro; se conserva
  // como token propio para no alterar el aspecto al abstraer los colores.
  shadowDialog: '0 40px 120px -40px rgb(0 0 0 / 0.9)',
};

const light: ModePalette = {
  colorScheme: 'light',

  background: '#f3f4f0',
  surfaceLowest: '#ffffff',
  surfaceLow: '#fafbf8',
  surface: '#ffffff',
  surfaceHigh: '#f0f1ec',
  surfaceHighest: '#e6e8e0',
  surfaceSidebar: '#ffffff',

  borderSubtle: '#e8e9e3',
  border: '#d5d7ce',

  text: '#14160e',
  textMuted: '#5c6053',
  textDisabled: '#a6a99d',

  accent: '#c3f400',
  accentDim: '#b4e300',
  accentInk: '#55730a',
  accentContrast: '#000000',

  danger: '#c23b30',
  warning: '#8a6410',
  success: '#4d6b00',

  successBg: '#eef6cf',
  successBorder: '#c0d766',
  successText: '#4d6b00',
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

  headerBg: 'rgb(255 255 255 / 0.82)',
  overlay: 'rgb(20 22 14 / 0.4)',
  focusRing: '#14160e',
  gridLine: 'rgb(20 22 14 / 0.04)',
  pageGlow: 'rgb(195 244 0 / 0.12)',
  sheen: 'rgb(255 255 255 / 0.65)',
  sheenBase: '#ffffff',
  scrim: '#000000',

  // Aurora en modo claro: más pastel y con menor opacidad para no ensuciar el
  // lienzo claro ni comprometer la legibilidad.
  aurora1: 'rgb(154 196 0 / 0.16)',
  aurora2: 'rgb(45 160 148 / 0.1)',
  aurora3: 'rgb(120 110 255 / 0.08)',
  auroraSpot: 'rgb(120 150 0 / 0.08)',
  noiseOpacity: 0.02,
  ambientStrength: 1,

  shadowSm: '0 1px 2px rgb(20 22 14 / 0.08)',
  shadowMd: '0 12px 32px -18px rgb(20 22 14 / 0.18)',
  shadowLg: '0 40px 120px -40px rgb(20 22 14 / 0.26)',
  shadowDialog: '0 40px 120px -40px rgb(0 0 0 / 0.9)',
};

export const defaultTheme: TenantTheme = {
  id: 'gymsheet',
  brand: defaultBrand,
  dark,
  light,
};
