import { Ionicons } from '@expo/vector-icons';
import { View } from 'react-native';
import { PressableScale } from '@/components/motion';
import { Text } from '@/components/text';
import { accentContrast, colors, iconSizes, minTouchTarget, radii, spacing } from '@/theme';

export type WeekDotState = 'done' | 'training' | 'rest';

export type WeekDot = {
  key: string;
  /** Inicial del día («L»). */
  initial: string;
  /** Nombre completo para el lector de pantalla («Lunes, Pecho y tríceps»). */
  label: string;
  state: WeekDotState;
  today?: boolean;
};

/**
 * La semana en 7 círculos (C8.2): hecho = acento con ✓, entreno = relleno de
 * control, descanso = solo la inicial en gris AA (sin `opacity`), hoy = anillo.
 * El estado nunca depende solo del color: ✓ y relleno frente a vacío.
 */
export function WeekDots({
  days,
  onPress,
}: {
  days: readonly WeekDot[];
  /** Si llega, los días con entreno se pueden tocar (háptico `selection`). */
  onPress?: (key: string) => void;
}) {
  return (
    <View accessibilityRole="list" style={{ flexDirection: 'row', justifyContent: 'space-between', gap: spacing.xs }}>
      {days.map((day) => {
        const done = day.state === 'done';
        const training = day.state === 'training';
        const dot = (
          <View
            style={{
              width: minTouchTarget,
              height: minTouchTarget,
              borderRadius: radii.full,
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: done ? colors.volt : training ? colors.surfaceHighest : 'transparent',
              borderWidth: day.today ? 2 : 0,
              borderColor: day.today ? colors.text : 'transparent',
            }}
          >
            {done ? (
              <Ionicons color={accentContrast()} name="checkmark" size={iconSizes.md} />
            ) : (
              <Text strong={training} tone={training ? 'default' : 'muted'} variant="subhead">
                {day.initial}
              </Text>
            )}
          </View>
        );
        const a11y = `${day.label}${day.today ? ', hoy' : ''}${done ? ', hecho' : ''}`;
        if (onPress && day.state !== 'rest') {
          return (
            <PressableScale
              accessibilityLabel={a11y}
              haptic="selection"
              key={day.key}
              onPress={() => onPress(day.key)}
              scaleTo={0.94}
              testID={`week-dot-${day.key}`}
            >
              {dot}
            </PressableScale>
          );
        }
        return (
          <View accessibilityLabel={a11y} accessible key={day.key} testID={`week-dot-${day.key}`}>
            {dot}
          </View>
        );
      })}
    </View>
  );
}
