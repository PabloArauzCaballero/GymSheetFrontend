import { Platform, type TextStyle } from 'react-native';
import { fontWeights as sharedFontWeights } from '@gymsheet/design-tokens';

export const fontWeights = sharedFontWeights;

/**
 * Rampa tipográfica (C8.1): 34 / 28 / 22 / 17 / 15 / 13 / 12. Se prohíben 9,
 * 10 y 11 pt. Los nombres de siempre se mantienen y caen en la rampa:
 * `xs` 12 · `footnote` 13 · `sm` 15 · `md` 17 · `lg` 22 · `xl` 28 ·
 * `2xl` 34 · `display` 34.
 */
export const fontSizes = {
  xs: 12,
  footnote: 13,
  sm: 15,
  md: 17,
  lg: 22,
  xl: 28,
  '2xl': 34,
  /** Títulos de pantalla. */
  display: 34,
} as const;

/**
 * Familias. La display (Bricolage Grotesque) se carga en `app/_layout.tsx` con
 * `expo-font`; el cuerpo es la del sistema para que Dynamic Type funcione.
 * Con archivos estáticos el peso va en la familia, no en `fontWeight`.
 */
export const fontFamilies = {
  display: 'BricolageGrotesque_700Bold',
  displaySemibold: 'BricolageGrotesque_600SemiBold',
} as const;

/**
 * El peso «semibold», resuelto por plataforma: Android < 28 no trae Roboto
 * SemiBold y un 600 cae a normal; ahí se sube a 700.
 */
export const semibold: '600' | '700' =
  Platform.OS === 'android' && Number(Platform.Version) < 28 ? '700' : '600';

/** Cifras de ancho fijo para series, reps, kg y tiempos. */
export const tabularNums: TextStyle = { fontVariant: ['tabular-nums'] };

/**
 * Variantes de `Text` (`components/text.tsx`). El color por defecto lo pone la
 * primitiva según `tone`; aquí solo tamaño, familia, peso, interlineado y
 * tracking.
 */
export const textVariants = {
  display: {
    fontFamily: fontFamilies.display,
    fontSize: fontSizes.display,
    lineHeight: Math.round(fontSizes.display * 1.12),
    letterSpacing: fontSizes.display * -0.02,
  },
  title: {
    fontFamily: fontFamilies.display,
    fontSize: fontSizes.lg,
    lineHeight: Math.round(fontSizes.lg * 1.2),
    letterSpacing: fontSizes.lg * -0.015,
  },
  headline: { fontSize: fontSizes.md, fontWeight: semibold, lineHeight: 22 },
  body: { fontSize: fontSizes.md, lineHeight: 24 },
  subhead: { fontSize: fontSizes.sm, lineHeight: 20 },
  footnote: { fontSize: fontSizes.footnote, lineHeight: 18 },
  caption: { fontSize: fontSizes.xs, lineHeight: 16 },
  numeric: {
    fontFamily: fontFamilies.displaySemibold,
    fontSize: fontSizes.lg,
    lineHeight: Math.round(fontSizes.lg * 1.2),
    fontVariant: ['tabular-nums'],
  },
} as const satisfies Record<string, TextStyle>;

export type TextVariant = keyof typeof textVariants;
