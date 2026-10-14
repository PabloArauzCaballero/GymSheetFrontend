import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useState } from 'react';
import { Pressable, View } from 'react-native';
import { buildCardioSet, formatClock } from '@gymsheet/hooks';
import { numericInputProps } from '@/components/keyboard';
import { PressableScale } from '@/components/motion';
import { Text } from '@/components/text';
import { Input, Button } from '@/components/ui';
import { useStopwatch } from '@/features/cardio/use-stopwatch';
import { colors, fontFamilies, heroNumberFontSize, iconSizes, metricColors, minTouchTarget, radii, spacing, tabularNums } from '@/theme';

type CardioSetPayload = ReturnType<typeof buildCardioSet>;

/**
 * Registro de una serie de cardio (RF-17): cronómetro, o minutos a mano, más distancia, FC
 * media y esfuerzo 1–10. Lo único obligatorio es cuánto duró; sin pulsómetro se usa el
 * esfuerzo y funciona igual.
 */
export function CardioLogger({
  setNumber,
  pending,
  onSubmit,
}: {
  setNumber: number;
  pending: boolean;
  onSubmit: (set: CardioSetPayload) => void;
}) {
  const clock = useStopwatch();
  const [minutes, setMinutes] = useState('');
  const [distance, setDistance] = useState('');
  const [heartRate, setHeartRate] = useState('');
  const [effort, setEffort] = useState<number | null>(null);

  const typed = Number(minutes.replace(',', '.'));
  const seconds = clock.seconds > 0 ? clock.seconds : Number.isFinite(typed) && typed > 0 ? Math.round(typed * 60) : 0;

  return (
    <View style={{ gap: spacing.md }} testID="cardio-logger">
      <View style={{ gap: spacing.smd, padding: spacing.md, borderRadius: radii.xxl, borderCurve: 'continuous', backgroundColor: colors.surfaceLow }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.xs }}>
          <Ionicons color={metricColors.time.ink} name="stopwatch-outline" size={iconSizes.sm} />
          <Text tone="muted" variant="caption">
            TIEMPO
          </Text>
        </View>
        <Text
          accessibilityLabel={`Tiempo ${formatClock(seconds)}`}
          accessibilityLiveRegion="polite"
          style={[
            { color: colors.text, fontFamily: fontFamilies.display, fontSize: heroNumberFontSize, lineHeight: heroNumberFontSize + spacing.smd, textAlign: 'center' },
            tabularNums,
          ]}
          testID="cardio-clock"
        >
          {formatClock(seconds)}
        </Text>
        <View style={{ flexDirection: 'row', gap: spacing.sm }}>
          <PressableScale
            accessibilityLabel={clock.running ? 'Pausar el cronómetro' : clock.seconds > 0 ? 'Reanudar el cronómetro' : 'Iniciar el cronómetro'}
            haptic="selection"
            onPress={clock.running ? clock.pause : clock.start}
            style={{
              flex: 1,
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'center',
              gap: spacing.sm,
              height: 56,
              borderRadius: radii.xl,
              borderCurve: 'continuous',
              backgroundColor: metricColors.time.tint,
            }}
            testID="cardio-toggle"
          >
            <Ionicons color={metricColors.time.ink} name={clock.running ? 'pause' : 'play'} size={iconSizes.md} />
            <Text strong variant="headline">
              {clock.running ? 'Pausar' : clock.seconds > 0 ? 'Reanudar' : 'Iniciar'}
            </Text>
          </PressableScale>
          <PressableScale
            accessibilityLabel="Reiniciar el cronómetro"
            disabled={clock.seconds === 0 && !minutes}
            haptic="none"
            onPress={() => {
              clock.reset();
              setMinutes('');
            }}
            scaleTo={0.94}
            style={{
              width: 56,
              height: 56,
              alignItems: 'center',
              justifyContent: 'center',
              borderRadius: radii.xl,
              borderCurve: 'continuous',
              backgroundColor: colors.surfaceHighest,
              opacity: clock.seconds === 0 && !minutes ? 0.4 : 1,
            }}
            testID="cardio-reset"
          >
            <Ionicons color={colors.textSecondary} name="refresh" size={iconSizes.md} />
          </PressableScale>
        </View>
      </View>
      <Input
        {...numericInputProps}
        keyboardType="decimal-pad"
        label="O escribe los minutos"
        onChangeText={(text) => {
          setMinutes(text);
          clock.reset();
        }}
        placeholder="Ej. 32"
        testID="cardio-minutes"
        value={minutes}
      />
      <View style={{ flexDirection: 'row', gap: spacing.sm }}>
        <View style={{ flex: 1 }}>
          <Input {...numericInputProps} keyboardType="decimal-pad" label="Distancia (km)" onChangeText={setDistance} testID="cardio-distance" value={distance} />
        </View>
        <View style={{ flex: 1 }}>
          <Input {...numericInputProps} keyboardType="number-pad" label="FC media (lpm)" onChangeText={setHeartRate} testID="cardio-hr" value={heartRate} />
        </View>
      </View>
      <View style={{ gap: spacing.sm }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.xs }}>
          <Ionicons color={metricColors.effort.ink} name="flame-outline" size={iconSizes.sm} />
          <Text tone="secondary" variant="footnote">
            Esfuerzo · 1 muy suave, 10 máximo
          </Text>
        </View>
        <View style={{ flexDirection: 'row', gap: spacing.xs }}>
          {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((value) => {
            const selected = effort === value;
            return (
              <Pressable
                accessibilityLabel={`Esfuerzo ${value}`}
                accessibilityRole="button"
                accessibilityState={{ selected }}
                hitSlop={{ top: spacing.sm, bottom: spacing.sm }}
                key={value}
                onPress={() => {
                  void Haptics.selectionAsync();
                  setEffort(selected ? null : value);
                }}
                style={{
                  flex: 1,
                  height: minTouchTarget,
                  alignItems: 'center',
                  justifyContent: 'center',
                  borderRadius: radii.md,
                  borderCurve: 'continuous',
                  borderWidth: 1.5,
                  borderColor: selected ? metricColors.effort.ink : 'transparent',
                  backgroundColor: selected ? metricColors.effort.tint : colors.surfaceHighest,
                }}
                testID={`effort-${value}`}
              >
                <Text strong style={{ color: selected ? metricColors.effort.ink : colors.textSecondary }} tabular variant="footnote">
                  {String(value)}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </View>
      <Button
        disabled={seconds <= 0}
        icon="checkmark"
        label="Guardar sesión de cardio"
        loading={pending}
        size="lg"
        testID="cardio-save"
        onPress={() => {
          if (clock.running) clock.pause();
          onSubmit(buildCardioSet({ numeroSerie: setNumber, segundos: seconds, distanciaKm: distance, fcMedia: heartRate, esfuerzo: effort }));
          clock.reset();
          setMinutes('');
          setDistance('');
          setHeartRate('');
          setEffort(null);
        }}
      />
    </View>
  );
}
