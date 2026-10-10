import { useRouter } from 'expo-router';
import { Text, View } from 'react-native';
import { setsLabel, type DayExerciseView, type DayView } from '@gymsheet/hooks';
import { BottomSheet } from '@/components/bottom-sheet';
import { Badge } from '@/components/layout';
import { PressableScale } from '@/components/motion';
import { Button } from '@/components/ui';
import { colors, fontSizes, minTouchTarget, radii, semibold, spacing } from '@/theme';

/**
 * La hoja de un día (RF-02): sus ejercicios con series × repeticiones de la semana
 * elegida y acceso a la ficha de cada uno. «Entrenar este día» inicia la sesión
 * con ese día de la rutina.
 */
export function DaySheet({
  visible,
  onClose,
  day,
  weekNumber,
  isDeload,
  onTrain,
  training,
  onReportExercise,
}: {
  visible: boolean;
  onClose: () => void;
  day: DayView | null;
  weekNumber: number;
  isDeload: boolean;
  onTrain?: () => void;
  training?: boolean;
  /** Denunciar un ejercicio privado de otra persona. */
  onReportExercise?: (exercise: DayExerciseView) => void;
}) {
  const router = useRouter();
  return (
    <BottomSheet
      onClose={onClose}
      subtitle={`Semana ${weekNumber}${isDeload ? ' · Descarga' : ''}`}
      testID="day-sheet"
      title={day?.titulo ?? 'Día'}
      visible={visible}
    >
      {day?.ejercicios.length === 0 ? (
        <Text style={{ color: colors.textMuted, fontSize: fontSizes.sm }}>Este día no tiene ejercicios.</Text>
      ) : null}
      {day?.ejercicios.map((item) => (
        <PressableScale
          accessibilityHint="Abre la ficha del ejercicio"
          accessibilityLabel={`${item.nombre}. ${setsLabel(item)}${item.pesoObjetivoKg ? `, ${item.pesoObjetivoKg} kilos` : ''}`}
          disabled={!item.ejercicioId}
          haptic="selection"
          key={item.routineExerciseId}
          onPress={() => {
            onClose();
            router.push({ pathname: '/routines/ejercicio/[id]', params: { id: item.ejercicioId } });
          }}
          style={{
            gap: 4,
            minHeight: minTouchTarget,
            borderRadius: radii.md,
            backgroundColor: colors.surfaceLow,
            padding: spacing.md,
          }}
          testID={`day-exercise-${item.routineExerciseId}`}
        >
          <Text numberOfLines={2} style={{ color: colors.text, fontSize: fontSizes.md, fontWeight: semibold }}>
            {item.nombre}
          </Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
            <Text style={{ color: colors.text, fontSize: fontSizes.sm, fontVariant: ['tabular-nums'] }}>
              {setsLabel(item)}
            </Text>
            {item.pesoObjetivoKg ? (
              <Text style={{ color: colors.textMuted, fontSize: fontSizes.sm }}>{item.pesoObjetivoKg} kg</Text>
            ) : null}
            {item.ajustado ? <Badge label="Ajustado" tone="warning" /> : null}
            {item.grupoMuscular ? (
              <Text style={{ color: colors.textMuted, fontSize: fontSizes.xs }}>{item.grupoMuscular}</Text>
            ) : null}
          </View>
        </PressableScale>
      ))}
      {onReportExercise && day?.ejercicios.some((item) => item.esPrivado) ? (
        <View style={{ gap: spacing.xs }}>
          {day.ejercicios
            .filter((item) => item.esPrivado)
            .map((item) => (
              <Button
                key={item.routineExerciseId}
                label={`Denunciar «${item.nombre}»`}
                onPress={() => onReportExercise(item)}
                variant="ghost"
              />
            ))}
        </View>
      ) : null}
      {onTrain && day && day.ejercicios.length > 0 ? (
        <Button label="Entrenar este día" loading={training} onPress={onTrain} />
      ) : null}
    </BottomSheet>
  );
}
