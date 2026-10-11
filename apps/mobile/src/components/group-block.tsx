import { Ionicons } from '@expo/vector-icons';
import { Children, Fragment, type ReactNode } from 'react';
import { View } from 'react-native';
import { RestPill } from '@/components/rest-pill';
import { Text } from '@/components/text';
import { colors, iconSizes, radii, shadows, spacing, thumbSizes } from '@/theme';

/**
 * Superserie o circuito (C8.2). **La forma lleva la información y el color la
 * refuerza**: raíl lateral de 3 pt, etiqueta «Superserie A · 3 vueltas»,
 * insignias A1/A2 en las filas (las pone quien llama con `ExerciseRow badge`)
 * y el descanso **una sola vez**, tras la vuelta.
 */
export function GroupBlock({
  label,
  rounds,
  restSeconds,
  transition,
  status,
  headerAction,
  footer,
  children,
  testID,
}: {
  /** «Superserie A», «Circuito B». */
  label: string;
  rounds: number;
  restSeconds?: number | null;
  /** Conector entre ejercicios: «sin descanso», «15 s». */
  transition?: string | null;
  /** Sustituye a «3 vueltas» a la derecha de la etiqueta (p. ej. «Vuelta 2/3» al entrenar). */
  status?: string;
  /** Acción en la cabecera (el editor pone «Separar»). */
  headerAction?: ReactNode;
  /** Contenido tras las filas (el editor pone «Descanso entre ejercicios»). */
  footer?: ReactNode;
  /** Filas `ExerciseRow grouped`. */
  children: ReactNode;
  testID?: string;
}) {
  const items = Children.toArray(children).filter(Boolean);
  const roundsLabel = `${rounds} ${rounds === 1 ? 'vuelta' : 'vueltas'}`;
  return (
    <View
      accessibilityLabel={`${label}, ${status ?? roundsLabel}`}
      style={{
        flexDirection: 'row',
        borderRadius: radii.xl,
        borderCurve: 'continuous',
        backgroundColor: colors.surfaceHigh,
        boxShadow: shadows.e2,
        overflow: 'hidden',
      }}
      testID={testID}
    >
      <View style={{ width: 3, backgroundColor: colors.group }} />
      <View style={{ flex: 1, paddingHorizontal: spacing.smd, paddingVertical: spacing.smd, gap: spacing.xs }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.sm }}>
          <View
            style={{
              paddingHorizontal: spacing.sm,
              paddingVertical: spacing.xxs,
              borderRadius: radii.full,
              backgroundColor: colors.groupTint,
            }}
          >
            <Text strong tone="group" variant="footnote">
              {label}
            </Text>
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
            <Text strong tabular testID={testID ? `${testID}-status` : undefined} variant="subhead">
              {status ?? roundsLabel}
            </Text>
            {headerAction}
          </View>
        </View>
        {items.map((child, index) => (
          <Fragment key={index}>
            {index > 0 ? (
              transition ? (
                <View
                  accessibilityLabel={`Después, ${transition}`}
                  accessible
                  style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}
                >
                  <View style={{ width: thumbSizes.row, alignItems: 'center' }}>
                    <Ionicons
                      accessibilityElementsHidden
                      color={colors.group}
                      importantForAccessibility="no-hide-descendants"
                      name="arrow-down"
                      size={iconSizes.sm}
                    />
                  </View>
                  <Text tabular tone="muted" variant="footnote">
                    {transition}
                  </Text>
                  <View style={{ flex: 1, height: 1, backgroundColor: colors.border }} />
                </View>
              ) : (
                <View style={{ height: 1, backgroundColor: colors.border }} />
              )
            ) : null}
            {child}
          </Fragment>
        ))}
        {footer}
        {restSeconds ? <RestPill seconds={restSeconds} suffix="tras la vuelta" /> : null}
      </View>
    </View>
  );
}
