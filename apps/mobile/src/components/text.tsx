import { Text as RNText, type TextProps as RNTextProps } from 'react-native';
import { accentContrast, colors, semibold, tabularNums, textVariants, type TextVariant } from '@/theme';

/**
 * Tono del texto. El color nunca se escribe en la pantalla: se elige un rol.
 * - `default` texto principal · `secondary` apoyo · `muted` metadatos (AA en
 *   todas las superficies) · `accent` el acento como texto (tinta legible por
 *   marca, no el relleno) · `onAccent` encima del relleno de acento ·
 *   `plate` encima de la placa de imagen · `group` superseries · `danger`.
 */
export type TextTone =
  | 'default'
  | 'secondary'
  | 'muted'
  | 'accent'
  | 'onAccent'
  | 'plate'
  | 'group'
  | 'danger'
  | 'warning'
  | 'disabled';

function toneColor(tone: TextTone): string {
  switch (tone) {
    case 'secondary':
      return colors.textSecondary;
    case 'muted':
      return colors.textMuted;
    case 'accent':
      return colors.accentInk;
    case 'onAccent':
      return accentContrast();
    case 'plate':
      return colors.plateInk;
    case 'group':
      return colors.group;
    case 'danger':
      return colors.danger;
    case 'warning':
      return colors.warning;
    case 'disabled':
      return colors.textDisabled;
    default:
      return colors.text;
  }
}

export type TextProps = RNTextProps & {
  /** Paso de la rampa: display/title/headline/body/subhead/footnote/caption/numeric. */
  variant?: TextVariant;
  tone?: TextTone;
  /** Sube el peso a semibold sin cambiar de paso (cuerpo con énfasis). */
  strong?: boolean;
  /** Cifras tabulares: series, reps, kg, tiempos. */
  tabular?: boolean;
};

/**
 * Primitiva de texto. Las pantallas no escriben `fontSize` ni colores: eligen
 * `variant` y `tone`. `style` se aplica al final solo para layout (márgenes,
 * `flex`, alineación).
 */
export function Text({
  variant = 'body',
  tone = 'default',
  strong = false,
  tabular = false,
  style,
  ...props
}: TextProps) {
  return (
    <RNText
      {...props}
      style={[
        textVariants[variant],
        { color: toneColor(tone) },
        strong ? { fontWeight: semibold } : null,
        tabular ? tabularNums : null,
        style,
      ]}
    />
  );
}
