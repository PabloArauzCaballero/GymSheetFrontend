import { Ionicons } from '@expo/vector-icons';
import { Text, View } from 'react-native';
import { PressableScale } from '@/components/motion';
import { colors, fontSizes, iconSizes, minTouchTarget, radii, semibold, spacing, tabularNums } from '@/theme';
import { DAY_PERIODS, HOUR_RANGE, MINUTE_STEPS, isTimeAvailable, timeValue } from './invite-slots';

function StepButton({ icon, label, disabled, onPress }: { icon: keyof typeof Ionicons.glyphMap; label: string; disabled: boolean; onPress: () => void }) {
  return (
    <PressableScale accessibilityLabel={label} accessibilityState={{ disabled }} disabled={disabled} haptic="selection" onPress={onPress} scaleTo={0.94}>
      <View style={{ width: minTouchTarget, height: minTouchTarget, borderRadius: radii.full, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.surfaceHighest, opacity: disabled ? 0.35 : 1 }}>
        <Ionicons color={colors.text} name={icon} size={iconSizes.md} />
      </View>
    </PressableScale>
  );
}

/**
 * Hora a mano: horas con − / +, minutos de 15 en 15 y franjas rápidas
 * (mañana, mediodía, tarde, noche). Lo que ya pasó hoy no se puede elegir.
 */
export function InviteTimePicker({
  date,
  now,
  value,
  onChange,
}: {
  date: string;
  now: Date;
  value: string;
  onChange: (time: string) => void;
}) {
  const [hour = 7, minute = 0] = value.split(':').map(Number);
  const tryHour = (next: number) => {
    // Al cruzar a una hora ocupada se busca el primer cuarto libre de esa hora.
    const options = MINUTE_STEPS.map((step) => timeValue(next, step)).filter((slot) => isTimeAvailable(date, slot, now));
    const same = timeValue(next, minute);
    return options.includes(same) ? same : options[0] ?? null;
  };
  const previous = hour > HOUR_RANGE.first ? tryHour(hour - 1) : null;
  const following = hour < HOUR_RANGE.last ? tryHour(hour + 1) : null;

  return (
    <View style={{ gap: spacing.md }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.lg, paddingVertical: spacing.md, borderRadius: radii.lg, backgroundColor: colors.surfaceHigh }}>
        <StepButton disabled={!previous} icon="remove" label="Una hora antes" onPress={() => previous && onChange(previous)} />
        <View accessibilityLabel={`Hora elegida ${value}`} accessible style={{ alignItems: 'center', minWidth: 132 }}>
          <Text style={{ color: colors.text, fontSize: fontSizes.display, fontWeight: semibold, ...tabularNums, letterSpacing: fontSizes.display * -0.02 }}>{value}</Text>
          <Text style={{ color: colors.textMuted, fontSize: fontSizes.xs }}>hora de inicio</Text>
        </View>
        <StepButton disabled={!following} icon="add" label="Una hora después" onPress={() => following && onChange(following)} />
      </View>

      <View accessibilityRole="radiogroup" style={{ flexDirection: 'row', gap: spacing.xs }}>
        {MINUTE_STEPS.map((step) => {
          const slot = timeValue(hour, step);
          const enabled = isTimeAvailable(date, slot, now);
          const selected = step === minute;
          return (
            <PressableScale accessibilityLabel={`Minuto ${String(step).padStart(2, '0')}`} accessibilityRole="radio" accessibilityState={{ selected, disabled: !enabled }} disabled={!enabled} haptic="selection" key={step} onPress={() => onChange(slot)} scaleTo={0.96} style={{ flex: 1 }}>
              <View style={{ minHeight: minTouchTarget, alignItems: 'center', justifyContent: 'center', borderRadius: radii.md, backgroundColor: selected ? colors.text : colors.surfaceHigh, opacity: enabled ? 1 : 0.35 }}>
                <Text style={{ color: selected ? colors.background : colors.text, fontSize: fontSizes.md, fontWeight: semibold, ...tabularNums }}>:{String(step).padStart(2, '0')}</Text>
              </View>
            </PressableScale>
          );
        })}
      </View>

      <View style={{ flexDirection: 'row', gap: spacing.xs }}>
        {DAY_PERIODS.map((period) => {
          const enabled = isTimeAvailable(date, period.time, now);
          const selected = value === period.time;
          return (
            <PressableScale accessibilityLabel={`${period.label}, ${period.time}`} accessibilityState={{ selected, disabled: !enabled }} disabled={!enabled} haptic="selection" key={period.key} onPress={() => onChange(period.time)} scaleTo={0.96} style={{ flex: 1 }}>
              <View style={{ minHeight: 64, alignItems: 'center', justifyContent: 'center', gap: 2, borderRadius: radii.md, borderWidth: 1, borderColor: selected ? colors.text : colors.border, backgroundColor: colors.surface, opacity: enabled ? 1 : 0.35 }}>
                <Ionicons color={selected ? colors.text : colors.textSecondary} name={period.icon} size={iconSizes.md} />
                <Text numberOfLines={1} style={{ color: colors.text, fontSize: fontSizes.xs, fontWeight: semibold }}>{period.label}</Text>
              </View>
            </PressableScale>
          );
        })}
      </View>
    </View>
  );
}
