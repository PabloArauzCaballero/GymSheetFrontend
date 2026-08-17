import { colors as sharedColors, theme } from '@gymsheet/design-tokens';

/**
 * Re-exports the shared design tokens so the whole app imports the visual
 * identity from one place. The values match the web app's CSS variables.
 */
export { tones, spacing, radii, fontSizes, fontWeights, minTouchTarget } from '@gymsheet/design-tokens';

/**
 * Mobile surface ramp, overriding the shared one.
 *
 * The web palette puts every surface within 0x13 of pure black, which on a
 * desktop monitor in a lit room still separates. On a phone held at arm's
 * length — and especially on an OLED panel, where true black is genuinely off
 * pixels — those steps collapse and cards stop reading as objects sitting on a
 * background. That flatness is what gets described as "static", not the absence
 * of colour.
 *
 * Only the neutral ramp moves, and only upward. Brand hues, status tones and
 * text stay exactly as the shared tokens define them, so this is a legibility
 * correction for one medium, not a second visual identity. It lives here rather
 * than in `packages/design-tokens` because that package is shared with the web
 * app, and nothing about this problem applies there.
 */
export const colors = {
  ...sharedColors,
  surfaceLowest: '#0d0d0d',
  surfaceLow: '#141414',
  surface: '#1a1a1a',
  surfaceHigh: '#242424',
  surfaceHighest: '#303030',
  borderSubtle: '#242424',
  border: '#333333',
} as const;
export { theme };
export type { Theme } from '@gymsheet/design-tokens';

/**
 * Icon sizes as tokens. Mixing arbitrary values (18/22/28) across screens is
 * what makes an interface feel unresolved, so every icon picks one of these.
 */
export const iconSizes = {
  sm: 16,
  md: 20,
  lg: 24,
  xl: 32,
} as const;

/**
 * Motion durations chosen per distance and complexity, not one value reused
 * everywhere. Exits are faster than entrances: leaving should feel immediate.
 */
export const motion = {
  /** Press feedback, colour shifts. */
  instant: 120,
  /** Toast/card entrance, small travel. */
  enter: 220,
  /** Leaving the screen. */
  exit: 160,
} as const;

/** Widest comfortable text column; beyond it, gutters absorb the extra width. */
export const maxContentWidth = 560;

/**
 * Width at which a single phone column starts wasting the screen. Below it the
 * layout stays one column; at or above it, content may split in two.
 */
export const tabletBreakpoint = 700;

/**
 * Cap once the layout is two columns wide. Still bounded — a card stretched
 * edge to edge on a 13" tablet reads as a spreadsheet, not an app — but wide
 * enough that the page is filled instead of framed by black.
 */
export const maxWideContentWidth = 1040;
