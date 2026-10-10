import { Children, Fragment, type ReactNode } from 'react';
import { View } from 'react-native';
import { RestPill } from '@/components/rest-pill';
import { Text } from '@/components/text';
import { colors, radii, shadows, spacing } from '@/theme';

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
  children,
  testID,
}: {
  /** «Superserie A», «Circuito B». */
  label: string;
  rounds: number;
  restSeconds?: number | null;
  /** Filas `ExerciseRow grouped`. */
  children: ReactNode;
  testID?: string;
}) {
  const items = Children.toArray(children).filter(Boolean);
  const roundsLabel = `${rounds} ${rounds === 1 ? 'vuelta' : 'vueltas'}`;
  return (
    <View
      accessibilityLabel={`${label}, ${roundsLabel}`}
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
          <Text strong tabular variant="subhead">
            {roundsLabel}
          </Text>
        </View>
        {items.map((child, index) => (
          <Fragment key={index}>
            {index > 0 ? <View style={{ height: 1, backgroundColor: colors.border }} /> : null}
            {child}
          </Fragment>
        ))}
        {restSeconds ? <RestPill seconds={restSeconds} suffix="tras la vuelta" /> : null}
      </View>
    </View>
  );
}
