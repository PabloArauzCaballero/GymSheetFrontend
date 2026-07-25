/**
 * Semantic design tokens — the single source of truth for the GymSheet visual
 * identity. Values mirror the CSS custom properties in the web app
 * (`apps/web/src/app/globals.css`) so the Expo client renders the same dark,
 * high-contrast "volt" theme without duplicating hex codes.
 */
export const colors = {
  background: '#000000',
  surfaceLowest: '#080808',
  surfaceLow: '#0d0d0d',
  surface: '#131313',
  surfaceHigh: '#1f1f1f',
  surfaceHighest: '#2a2a2a',
  borderSubtle: '#1a1a1a',
  border: '#262626',
  text: '#f5f5f5',
  textMuted: '#8c8c8c',
  textDisabled: '#4d4d4d',
  volt: '#c3f400',
  voltDim: '#abd600',
  danger: '#ff6b63',
  warning: '#d7a944',
  success: '#c3f400',
} as const;

export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  '2xl': 48,
} as const;

export const radii = {
  sm: 4,
  md: 6,
  lg: 8,
  full: 9999,
} as const;

export const fontSizes = {
  xs: 12,
  sm: 14,
  md: 16,
  lg: 18,
  xl: 24,
  '2xl': 32,
} as const;

export const fontWeights = {
  regular: '400',
  medium: '500',
  semibold: '600',
  bold: '700',
} as const;

/** Minimum touch target (px) for interactive mobile elements. */
export const minTouchTarget = 44;

export const theme = { colors, spacing, radii, fontSizes, fontWeights, minTouchTarget } as const;

export type ColorToken = keyof typeof colors;
export type SpacingToken = keyof typeof spacing;
export type RadiusToken = keyof typeof radii;
export type Theme = typeof theme;
