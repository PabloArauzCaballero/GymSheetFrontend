/**
 * Semantic design tokens — the single source of truth for the REPP visual
 * identity. Values mirror the CSS custom properties in the web app
 * (`apps/web/src/app/globals.css`) so the Expo client renders the same REPP
 * theme without duplicating brand hex codes.
 *
 * The dark theme is the default identity (`colors`). A light counterpart
 * (`lightColors`) and semantic status tones (`tones`) are provided so both
 * clients can offer a light mode from one source.
 */
export const colors = {
  background: '#0F172A',
  surfaceLowest: '#121C2D',
  surfaceLow: '#162033',
  surface: '#1A2639',
  surfaceHigh: '#202D42',
  surfaceHighest: '#27364D',
  surfaceSidebar: '#0F172A',
  borderSubtle: '#26364D',
  border: '#40516B',
  text: '#F5F8FA',
  textMuted: '#B2BEC8',
  textDisabled: '#718091',
  /** REPP jade fill; `volt` remains as a compatibility alias for consumers. */
  volt: '#2E8B7B',
  voltDim: '#2E8B7B',
  /** Accessible jade for text and fine icons on dark surfaces. */
  accentInk: '#6BC7B6',
  danger: '#ff6b63',
  warning: '#d7a944',
  success: '#55CF91',
} as const;

/** Light-theme counterpart. Same keys as `colors`. */
export const lightColors: Record<keyof typeof colors, string> = {
  background: '#E9EEF2',
  surfaceLowest: '#FFFFFF',
  surfaceLow: '#F7F9FA',
  surface: '#FFFFFF',
  surfaceHigh: '#F1F4F6',
  surfaceHighest: '#D3DDE4',
  surfaceSidebar: '#E9EEF2',
  borderSubtle: '#D6DEE5',
  border: '#AAB8C4',
  text: '#18212B',
  textMuted: '#53616D',
  textDisabled: '#77838D',
  volt: '#2E8B7B',
  voltDim: '#2E8B7B',
  accentInk: '#22685D',
  danger: '#b23a30',
  warning: '#8a6410',
  success: '#216B46',
};

/** Alias for clarity when both palettes are in scope. */
export const darkColors = colors;

/** Semantic status tones (background / border / text) per theme. */
export const tones = {
  dark: {
    success: { bg: '#10271e', border: '#28664b', text: '#7dd9a7' },
    warning: { bg: '#241c0c', border: '#5b4820', text: '#e0b65f' },
    danger: { bg: '#241211', border: '#63302c', text: '#ffb4ab' },
    info: { bg: '#111b21', border: '#344654', text: '#a8d4ee' },
  },
  light: {
    success: { bg: '#e7f5ec', border: '#92c7a8', text: '#216B46' },
    warning: { bg: '#fbf1d6', border: '#e6cd82', text: '#8a6410' },
    danger: { bg: '#fdeceb', border: '#f0b3ad', text: '#b23a30' },
    info: { bg: '#e9f2fb', border: '#aacdee', text: '#235d88' },
  },
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
  xl: 14,
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

/**
 * Motion — mirror of `--dur-*` / `--ease-*` in `apps/web/src/app/globals.css`.
 * A scale of intent, not of size:
 *   1 touch response (press)     2 hover / colour change
 *   3 short enter/exit           4 panel / dialog
 *   5 section reveal             6 scroll narrative
 * Milliseconds, so React Native `withTiming` and web both consume them raw.
 *
 * The mobile app keeps its own haptic-tuned palette and curve in
 * `apps/mobile/src/components/motion.tsx` (`DURATION`, `PREMIUM_EASING`) —
 * motion responds to the medium the same way the surface ramp does, so this is
 * the web baseline, available to mobile rather than imposed on it.
 * Every consumer must still honour `prefers-reduced-motion` /
 * `AccessibilityInfo.isReduceMotionEnabled`.
 */
export const durations = {
  1: 120,
  2: 180,
  3: 240,
  4: 320,
  5: 480,
  6: 640,
} as const;

/** Bézier control points — `[x1, y1, x2, y2]`, framework-agnostic. */
export const easings = {
  /** House curve (easeOutQuint): fast in, settles without bounce. */
  out: [0.22, 1, 0.36, 1],
  inOut: [0.65, 0, 0.35, 1],
  in: [0.4, 0, 1, 1],
} as const;

export const theme = {
  colors,
  spacing,
  radii,
  fontSizes,
  fontWeights,
  minTouchTarget,
  durations,
  easings,
} as const;

/** Both palettes keyed by mode, for theme-aware clients. */
export const themes = {
  dark: { ...theme, colors: darkColors, tones: tones.dark },
  light: { ...theme, colors: lightColors, tones: tones.light },
} as const;

export type ThemeMode = keyof typeof themes;
export type ColorToken = keyof typeof colors;
export type SpacingToken = keyof typeof spacing;
export type RadiusToken = keyof typeof radii;
export type DurationToken = keyof typeof durations;
export type EasingToken = keyof typeof easings;
export type Theme = typeof theme;
export * from './tenants';
