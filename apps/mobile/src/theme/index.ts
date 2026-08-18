import {
  colors as sharedColors,
  fontSizes as sharedFontSizes,
  theme,
  tones as sharedTones,
} from '@gymsheet/design-tokens';
import { getActiveTenant } from './tenant';

/**
 * Re-exports the shared design tokens so the whole app imports the visual
 * identity from one place. The values match the web app's CSS variables.
 */
export { spacing, radii, fontWeights, minTouchTarget } from '@gymsheet/design-tokens';
export { getActiveTenant, setActiveTenant, useActiveTenant } from './tenant';
export type { TenantDefinition } from './tenant';

/**
 * Tonos semánticos con la confirmación tomada de la marca.
 *
 * Solo se reemplaza el verde de éxito: el resto (aviso, error, información) es
 * deliberadamente ajeno a la marca, porque son señales que el usuario debe
 * reconocer igual en cualquier gimnasio.
 */
export const tones = {
  get dark() {
    const success = { ...sharedTones.dark.success, text: getActiveTenant().colors.successOnDark };
    return { ...sharedTones.dark, success };
  },
  get light() {
    const success = { ...sharedTones.light.success, text: getActiveTenant().colors.successOnLight };
    return { ...sharedTones.light, success };
  },
};

/**
 * Mobile type scale.
 *
 * The shared scale steps 16 → 18 → 24 → 32. Two points between body and
 * subtitle is not a step the eye reads as hierarchy; it reads as an accident,
 * and the screens end up carrying their structure entirely in colour. Widening
 * the top of the scale lets typography do that work instead, which is the
 * difference between a page that looks loud and one that looks composed.
 *
 * Only the large end moves. Body sizes stay where they are because they are
 * already at the comfortable reading size for the language.
 */
export const fontSizes = {
  ...sharedFontSizes,
  lg: 20,
  xl: 26,
  '2xl': 34,
  /** Screen titles only. Nothing else in the app is allowed to be this big. */
  display: 40,
} as const;

/**
 * Accent policy.
 *
 * `volt` was being used 36 times across 18 files — on tab icons, every stat
 * number, every badge, breadcrumbs, grid glyphs and the background at once.
 * An accent applied to everything accents nothing, and that saturation is what
 * reads as cheap rather than premium.
 *
 * The rule from here: `volt` is for the primary action and for the single
 * number a screen exists to show. Everything decorative — navigation glyphs,
 * secondary labels, ornament — uses these quieter tones instead.
 */
export const accentPolicy = {
  /** Navegación y glifos decorativos: presentes, sin gritar. */
  get glyph(): string {
    return getActiveTenant().id === 'gymsheet' ? '#cfd8c4' : '#d6d6d6';
  },
  /** Texto interactivo secundario (migas, enlaces en línea). */
  get quietLink(): string {
    // Para el resto de marcas son neutros en vez de un derivado del acento: son
    // ornamento, y teñirlos devolvería la saturación que esta política evita.
    return getActiveTenant().id === 'gymsheet' ? '#a9b69a' : '#a8a8a8';
  },
};

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
  // Lo único que cambia entre gimnasios, y lo único que se lee como propiedad
  // calculada: la marca se resuelve al iniciar sesión, así que estos valores
  // tienen que consultarse en cada render y no congelarse al importar el módulo.
  // Con la identidad de referencia devuelven exactamente lo de antes.
  get volt(): string {
    return getActiveTenant().colors.accent;
  },
  get voltDim(): string {
    return getActiveTenant().colors.accentDim;
  },
  get accentInk(): string {
    return getActiveTenant().colors.accentInkOnDark;
  },
  get success(): string {
    return getActiveTenant().colors.successOnDark;
  },
};

/** Texto e iconos que van encima del relleno de acento. */
export function accentContrast(): string {
  return getActiveTenant().colors.accentContrast;
}

/** Degradado del relleno primario, según la marca activa. */
export function accentGradient(): readonly [string, string] {
  return getActiveTenant().colors.accentGradient;
}
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
