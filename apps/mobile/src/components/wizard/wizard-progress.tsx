import { Ionicons } from '@expo/vector-icons';
import { Text, View } from 'react-native';
import { PressableScale } from '@/components/motion';
import {
  accentContrast,
  alpha,
  colors,
  fontSizes,
  iconSizes,
  minTouchTarget,
  semibold,
  spacing,
} from '@/theme';

export type WizardProgressStep = {
  readonly id: string;
  readonly titulo: string;
};

type IconName = keyof typeof Ionicons.glyphMap;

/**
 * Un icono por paso, con el significado de lo que se pide en él: lápiz para el
 * nombre, calendario para los días, doble marca para revisar. Cubre el asistente
 * de rutinas y el de activación; un paso desconocido cae en un punto.
 */
const STEP_ICON: Record<string, IconName> = {
  nombre: 'pencil',
  descripcion: 'document-text',
  objetivo: 'flag',
  duracion: 'hourglass',
  dias: 'calendar',
  revision: 'checkmark-done',
  replace: 'swap-horizontal',
  dates: 'calendar',
  mode: 'options',
  data: 'create',
  summary: 'checkmark-done',
};

const NODE = 36;
const LINE = 3;

/**
 * Riel de progreso del asistente: «Paso 2 de 6 · Descripción» y, debajo, un
 * nodo por paso unidos por una línea que se va llenando.
 *
 * - **Hecho**: relleno de acento con el icono del paso; la línea que lo sigue
 *   también va rellena, así el riel se lee como «hasta aquí he llegado».
 * - **Actual**: aro de acento sobre fondo tenue; es donde estás.
 * - **Pendiente**: apagado; se ve qué viene sin que compita.
 *
 * Los pasos ya recorridos se pueden tocar para volver a ellos; los que faltan
 * no, porque llegar a ellos sin pasar por los anteriores saltaría sus
 * validaciones. El nodo mide 36 pt pero el área táctil mide `minTouchTarget`.
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
        style={{
          color: colors.textMuted,
          fontSize: fontSizes.sm,
          fontWeight: semibold,
        }}
      >
        {`Paso ${actual + 1} de ${pasos.length}`}
        {current ? ` · ${current.titulo}` : ''}
      </Text>
      <View
        accessibilityRole="progressbar"
        accessibilityValue={{ min: 1, max: pasos.length, now: actual + 1 }}
        style={{ flexDirection: 'row', alignItems: 'center' }}
      >
        {pasos.map((paso, index) => {
          const done = index < actual;
          const isCurrent = index === actual;
          const canGo = done;
          return (
            <View
              key={paso.id}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                // Todos los nodos reparten el ancho; el último no lleva línea.
                flex: index === pasos.length - 1 ? 0 : 1,
              }}
            >
              <PressableScale
                accessibilityLabel={`Paso ${index + 1}: ${paso.titulo}${isCurrent ? ', actual' : done ? ', completado' : ''}`}
                accessibilityState={{ disabled: !canGo, selected: isCurrent }}
                disabled={!canGo}
                haptic="selection"
                onPress={() => onIr(index)}
                scaleTo={0.92}
                style={{
                  width: NODE,
                  minHeight: minTouchTarget,
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <View
                  style={{
                    width: NODE,
                    height: NODE,
                    borderRadius: NODE / 2,
                    alignItems: 'center',
                    justifyContent: 'center',
                    borderWidth: isCurrent ? 2 : 0,
                    borderColor: colors.volt,
                    backgroundColor: done
                      ? colors.volt
                      : isCurrent
                        ? alpha(colors.volt, 0.16)
                        : colors.surfaceHigh,
                  }}
                >
                  <Ionicons
                    color={done ? accentContrast() : isCurrent ? colors.volt : colors.textDisabled}
                    name={STEP_ICON[paso.id] ?? 'ellipse'}
                    size={iconSizes.sm}
                  />
                </View>
              </PressableScale>
              {index < pasos.length - 1 ? (
                <View
                  style={{
                    flex: 1,
                    height: LINE,
                    borderRadius: LINE,
                    backgroundColor: done ? colors.volt : colors.borderControl,
                  }}
                />
              ) : null}
            </View>
          );
        })}
      </View>
    </View>
  );
}
