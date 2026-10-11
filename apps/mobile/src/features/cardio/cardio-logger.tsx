import { useState } from 'react';
import { Text, View } from 'react-native';
import { buildCardioSet, formatClock } from '@gymsheet/hooks';
import { numericInputProps } from '@/components/keyboard';
import { Input, Button } from '@/components/ui';
import { ChoiceChip } from '@/components/wizard/choice-chip';
import { useStopwatch } from '@/features/cardio/use-stopwatch';
import { colors, fontSizes, heroNumberFontSize, semibold, spacing } from '@/theme';

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
      <Text
        accessibilityLabel={`Tiempo ${formatClock(seconds)}`}
        accessibilityLiveRegion="polite"
        style={{ color: colors.text, fontSize: heroNumberFontSize, fontWeight: semibold, fontVariant: ['tabular-nums'], textAlign: 'center' }}
        testID="cardio-clock"
      >
        {formatClock(seconds)}
      </Text>
      <View style={{ flexDirection: 'row', gap: spacing.sm }}>
        <Button
          label={clock.running ? 'Pausar' : clock.seconds > 0 ? 'Reanudar' : 'Iniciar'}
          onPress={clock.running ? clock.pause : clock.start}
          style={{ flex: 1 }}
        />
        <Button
          disabled={clock.seconds === 0 && !minutes}
          label="Reiniciar"
          onPress={() => {
            clock.reset();
            setMinutes('');
          }}
          style={{ flex: 1 }}
          variant="ghost"
        />
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
      <Text style={{ color: colors.textMuted, fontSize: fontSizes.sm }}>Esfuerzo (1 muy suave · 10 máximo)</Text>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs }}>
        {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((value) => (
          <ChoiceChip
            accessibilityLabel={`Esfuerzo ${value}`}
            key={value}
            label={String(value)}
            minWidth={44}
            onSelect={() => setEffort(effort === value ? null : value)}
            selected={effort === value}
            testID={`effort-${value}`}
          />
        ))}
      </View>
      <Button
        disabled={seconds <= 0}
        label="Guardar sesión de cardio"
        loading={pending}
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
