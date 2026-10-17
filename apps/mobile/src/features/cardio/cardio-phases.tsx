import { Text, View } from 'react-native';
import {
  WEEKDAYS,
  WEEKDAY_INITIALS,
  WEEKDAY_NAMES,
  cardioModalityLabels,
  maxHeartRate,
  zoneBounds,
  zoneLabel,
  type CardioForm,
} from '@gymsheet/hooks';
import { cardioModalities } from '@gymsheet/types';
import { numericInputProps } from '@/components/keyboard';
import { Input } from '@/components/ui';
import { ChoiceChip } from '@/components/wizard/choice-chip';
import { ModalityCard } from '@/features/cardio/cardio-modality-card';
import { colors, fontSizes, radii, semibold, spacing } from '@/theme';

type Errors = Partial<Record<keyof CardioForm, string>>;
type PhaseProps = { form: CardioForm; set: (patch: Partial<CardioForm>) => void; errors: Errors; showErrors: boolean };

const wrap = { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm } as const;

export function Question({ title, hint }: { title: string; hint?: string }) {
  return (
    <View style={{ gap: spacing.xs }}>
      <Text accessibilityRole="header" style={{ color: colors.text, fontSize: fontSizes.xl, fontWeight: semibold }}>{title}</Text>
      {hint ? <Text style={{ color: colors.textMuted, fontSize: fontSizes.sm }}>{hint}</Text> : null}
    </View>
  );
}

export function ModalityPhase({ form, set }: PhaseProps) {
  return (
    <View style={{ gap: spacing.lg }}>
      <Question hint="Elige la que más vas a hacer." title="¿Qué cardio quieres hacer?" />
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, justifyContent: 'space-between' }}>
        {cardioModalities.map((modality, index) => (
          <ModalityCard index={index} key={modality} modality={modality} onSelect={() => set({ modalidad: modality })} selected={form.modalidad === modality} />
        ))}
      </View>
    </View>
  );
}

export function DaysPhase({ form, set, errors, showErrors }: PhaseProps) {
  return (
    <View style={{ gap: spacing.lg }}>
      <Question hint="Toca los días de la semana en que entrenarás cardio." title="¿Qué días?" />
      <View style={wrap}>
        {WEEKDAYS.map((day) => (
          <ChoiceChip
            accessibilityLabel={WEEKDAY_NAMES[day]}
            key={day}
            label={WEEKDAY_INITIALS[day]}
            onSelect={() => set({ dias: form.dias.includes(day) ? form.dias.filter((d) => d !== day) : [...form.dias, day] })}
            selected={form.dias.includes(day)}
            testID={`cardio-day-${day}`}
          />
        ))}
      </View>
      {showErrors && errors.dias ? <Text style={{ color: colors.danger, fontSize: fontSizes.sm }}>{errors.dias}</Text> : null}
    </View>
  );
}

export function MinutesPhase({ form, set, errors, showErrors }: PhaseProps) {
  return (
    <View style={{ gap: spacing.lg }}>
      <Question hint="Sesiones cortas y constantes ganan a las heroicas." title="¿Cuánto dura cada sesión?" />
      <Input
        {...numericInputProps}
        error={showErrors ? errors.minutos : undefined}
        keyboardType="number-pad"
        label="Minutos por sesión"
        onChangeText={(minutos) => set({ minutos })}
        testID="cardio-target-minutes"
        value={form.minutos}
      />
      <View style={wrap}>
        {[20, 30, 45, 60].map((m) => (
          <ChoiceChip key={m} label={`${m} min`} onSelect={() => set({ minutos: String(m) })} selected={form.minutos === String(m)} />
        ))}
      </View>
    </View>
  );
}

export function IntensityPhase({ form, set, errors, showErrors }: PhaseProps) {
  const hrMax = Number(form.fcMax) || maxHeartRate(30);
  const hrRest = Number(form.fcReposo) || null;
  const bounds = zoneBounds(form.zona, hrMax, hrRest);
  return (
    <View style={{ gap: spacing.lg }}>
      <Question hint="Por pulso es más preciso; por sensación no necesita reloj." title="¿Cómo medirás el esfuerzo?" />
      <View style={wrap}>
        <ChoiceChip label="Por zonas de pulso" onSelect={() => set({ modoIntensidad: 'ZONA_FC' })} selected={form.modoIntensidad === 'ZONA_FC'} testID="intensity-zones" />
        <ChoiceChip label="Por sensación 1–10" onSelect={() => set({ modoIntensidad: 'RPE' })} selected={form.modoIntensidad === 'RPE'} testID="intensity-rpe" />
      </View>
      {form.modoIntensidad === 'ZONA_FC' ? (
        <View style={{ gap: spacing.md, borderRadius: radii.lg, backgroundColor: colors.surfaceLow, padding: spacing.md }}>
          <View style={{ flexDirection: 'row', gap: spacing.sm }}>
            <View style={{ flex: 1 }}>
              <Input {...numericInputProps} error={showErrors ? errors.fcReposo : undefined} keyboardType="number-pad" label="FC en reposo" onChangeText={(fcReposo) => set({ fcReposo })} testID="hr-rest" value={form.fcReposo} />
            </View>
            <View style={{ flex: 1 }}>
              <Input {...numericInputProps} error={showErrors ? errors.fcMax : undefined} keyboardType="number-pad" label="FC máxima" onChangeText={(fcMax) => set({ fcMax })} placeholder={String(maxHeartRate(30))} testID="hr-max" value={form.fcMax} />
            </View>
          </View>
          <Text style={{ color: colors.textMuted, fontSize: fontSizes.xs }}>
            La FC máxima por defecto es 208 − 0,7 × edad (para 30 años: {maxHeartRate(30)}). Puedes cambiarla.
          </Text>
          <View style={wrap}>
            {[1, 2, 3, 4, 5].map((zone) => (
              <ChoiceChip accessibilityLabel={zoneLabel(zone)} key={zone} label={`Z${zone}`} onSelect={() => set({ zona: zone })} selected={form.zona === zone} testID={`zone-${zone}`} />
            ))}
          </View>
          <Text accessibilityLiveRegion="polite" style={{ color: colors.text, fontSize: fontSizes.md, fontWeight: semibold }} testID="zone-bounds">
            {zoneLabel(form.zona)}: {bounds.minBpm}–{bounds.maxBpm} lpm
          </Text>
        </View>
      ) : (
        <View style={{ gap: spacing.sm }}>
          <Text style={{ color: colors.textMuted, fontSize: fontSizes.sm }}>Esfuerzo objetivo (1 muy suave · 10 máximo)</Text>
          <View style={wrap}>
            {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((rpe) => (
              <ChoiceChip accessibilityLabel={`Esfuerzo ${rpe}`} key={rpe} label={String(rpe)} minWidth={44} onSelect={() => set({ rpe })} selected={form.rpe === rpe} testID={`rpe-${rpe}`} />
            ))}
          </View>
        </View>
      )}
    </View>
  );
}

export function ProgressionPhase({ form, set }: PhaseProps) {
  return (
    <View style={{ gap: spacing.lg }}>
      <Question hint="Cuánto subes la carga de una semana a la siguiente." title="¿Cómo progresas?" />
      <View style={wrap}>
        {[0, 5, 10].map((pct) => (
          <ChoiceChip accessibilityLabel={`${pct} por ciento por semana`} key={pct} label={`${pct} %`} onSelect={() => set({ progresion: pct })} selected={form.progresion === pct} testID={`progression-${pct}`} />
        ))}
      </View>
    </View>
  );
}

export function SummaryPhase({ form }: PhaseProps) {
  const rows: [string, string][] = [
    ['Modalidad', cardioModalityLabels[form.modalidad]],
    ['Días', form.dias.map((d) => WEEKDAY_NAMES[d as keyof typeof WEEKDAY_NAMES]).join(', ')],
    ['Duración', `${form.minutos} min por sesión`],
    ['Intensidad', form.modoIntensidad === 'ZONA_FC' ? zoneLabel(form.zona) : `Esfuerzo ${form.rpe}/10`],
    ['Progresión', `${form.progresion} % por semana`],
  ];
  return (
    <View style={{ gap: spacing.lg }}>
      <Question hint="Convive con tu programa de pesas." title="Tu plan de cardio" />
      <View style={{ borderRadius: radii.lg, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border }}>
        {rows.map(([label, value], i) => (
          <View key={label} style={{ padding: spacing.md, gap: 2, borderTopWidth: i ? 1 : 0, borderColor: colors.border }}>
            <Text style={{ color: colors.textMuted, fontSize: fontSizes.xs }}>{label}</Text>
            <Text style={{ color: colors.text, fontSize: fontSizes.md, fontWeight: semibold }}>{value}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}
