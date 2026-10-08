import { Text, View } from 'react-native';
import { PressableScale } from '@/components/motion';
import { colors, fontSizes, minTouchTarget, radii, semibold, spacing } from '@/theme';

export type WizardProgressStep = { readonly id: string; readonly titulo: string };

/**
 * Barra de progreso del asistente: «Paso 2 de 6 · Descripción» y un segmento
 * por paso. Los segmentos ya recorridos se pueden tocar para volver a ese paso;
 * los que faltan no, porque llegar a ellos sin pasar por los anteriores saltaría
 * sus validaciones.
 *
 * El segmento dibujado mide 6 pt, pero el área táctil mide `minTouchTarget`:
 * una barra de 6 pt no se acierta con el pulgar.
 */
export function WizardProgress({
  pasos,
  actual,
  onIr,
}: {
  pasos: readonly WizardProgressStep[];
  actual: number;
  onIr: (index: number) => void;
}) {
  const current = pasos[actual];
  return (
    <View style={{ gap: spacing.xs }}>
      <Text
        accessibilityLiveRegion="polite"
        style={{ color: colors.textMuted, fontSize: fontSizes.sm, fontWeight: semibold }}
      >
        {`Paso ${actual + 1} de ${pasos.length}`}
        {current ? ` · ${current.titulo}` : ''}
      </Text>
      <View accessibilityRole="progressbar" style={{ flexDirection: 'row', gap: spacing.xs }}>
        {pasos.map((paso, index) => {
          const reached = index <= actual;
          const canGo = index < actual;
          return (
            <PressableScale
              accessibilityLabel={`Paso ${index + 1}: ${paso.titulo}${index === actual ? ', actual' : reached ? ', completado' : ''}`}
              accessibilityState={{ disabled: !canGo, selected: index === actual }}
              disabled={!canGo}
              haptic="selection"
              key={paso.id}
              onPress={() => onIr(index)}
              scaleTo={0.96}
              style={{ flex: 1, minHeight: minTouchTarget, justifyContent: 'center' }}
            >
              <View
                style={{
                  height: 6,
                  borderRadius: radii.full,
                  backgroundColor: reached ? colors.volt : colors.surfaceHigh,
                  opacity: index === actual || !reached ? 1 : 0.55,
                }}
              />
            </PressableScale>
          );
        })}
      </View>
    </View>
  );
}
