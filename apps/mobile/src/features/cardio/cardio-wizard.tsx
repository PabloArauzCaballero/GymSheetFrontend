import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { Text, View } from 'react-native';
import {
  WEEKDAYS,
  WEEKDAY_INITIALS,
  WEEKDAY_NAMES,
  buildCardioPlan,
  defaultCardioForm,
  maxHeartRate,
  validateCardio,
  zoneBounds,
  zoneLabel,
  type CardioForm,
} from '@gymsheet/hooks';
import { cardioModalities, cardioModalityLabels } from '@gymsheet/schemas';
import { ApiError } from '@gymsheet/api-client';
import { confirm } from '@gymsheet/notifications';
import { programService } from '@/api/services';
import { numericInputProps } from '@/components/keyboard';
import { ScreenHeader, ScrollScreen } from '@/components/layout';
import { BackLink } from '@/components/nav';
import { Button, Input } from '@/components/ui';
import { ChoiceChip } from '@/components/wizard/choice-chip';
import { notify } from '@/notifications';
import { colors, fontSizes, radii, semibold, spacing } from '@/theme';

function Group({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={{ gap: spacing.sm }}>
      <Text style={{ color: colors.textMuted, fontSize: fontSizes.sm, fontWeight: semibold }}>{title}</Text>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm }}>{children}</View>
    </View>
  );
}

/**
 * Asistente corto de cardio (RF-17): modalidad → días → minutos → intensidad (zonas de pulso
 * con Karvonen, o sensación 1–10) → progresión. Crea el plan y lo activa en el carril de cardio,
 * que convive con el de pesas.
 */
export function CardioWizardScreen() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [form, setForm] = useState<CardioForm>({ ...defaultCardioForm, dias: [1, 3, 5] });
  const [submitted, setSubmitted] = useState(false);
  const errors = validateCardio(form);
  const set = (patch: Partial<CardioForm>) => setForm((current) => ({ ...current, ...patch }));

  const hrMax = Number(form.fcMax) || maxHeartRate(30);
  const hrRest = Number(form.fcReposo) || null;
  const bounds = useMemo(() => zoneBounds(form.zona, hrMax, hrRest), [form.zona, hrMax, hrRest]);

  const activate = useMutation({
    mutationFn: (replace: boolean) =>
      programService.activateCardio({ cardioPlan: buildCardioPlan(form), duracionSemanas: 4, ...(replace ? { replace: true } : {}) }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['programs'] });
      notify.success('Plan de cardio activado.');
      router.replace('/routines');
    },
    onError: async (error: Error) => {
      if (error instanceof ApiError && error.code === 'PROGRAM_ACTIVE_CONFLICT') {
        const choice = await confirm({
          title: '¿Reemplazar tu plan de cardio?',
          message: 'Ya tienes un plan de cardio activo. Tus pesas no se tocan.',
          confirmLabel: 'Reemplazar',
          cancelLabel: 'Cancelar',
        });
        if (choice.confirmed) activate.mutate(true);
        return;
      }
      notify.error(error);
    },
  });

  return (
    <ScrollScreen>
      <BackLink />
      <ScreenHeader detail subtitle="Convive con tu programa de pesas." title="Plan de cardio" />

      <Group title="Modalidad">
        {cardioModalities.map((modality) => (
          <ChoiceChip
            key={modality}
            label={cardioModalityLabels[modality]}
            onSelect={() => set({ modalidad: modality })}
            selected={form.modalidad === modality}
            testID={`modality-${modality}`}
          />
        ))}
      </Group>

      <Group title="Días">
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
      </Group>
      {submitted && errors.dias ? <Text style={{ color: colors.danger, fontSize: fontSizes.sm }}>{errors.dias}</Text> : null}

      <Input
        {...numericInputProps}
        error={submitted ? errors.minutos : undefined}
        keyboardType="number-pad"
        label="Minutos por sesión"
        onChangeText={(minutos) => set({ minutos })}
        testID="cardio-target-minutes"
        value={form.minutos}
      />

      <Group title="Intensidad">
        <ChoiceChip label="Por zonas de pulso" onSelect={() => set({ modoIntensidad: 'ZONA_FC' })} selected={form.modoIntensidad === 'ZONA_FC'} testID="intensity-zones" />
        <ChoiceChip label="Por sensación 1–10" onSelect={() => set({ modoIntensidad: 'RPE' })} selected={form.modoIntensidad === 'RPE'} testID="intensity-rpe" />
      </Group>

      {form.modoIntensidad === 'ZONA_FC' ? (
        <View style={{ gap: spacing.md, borderRadius: radii.lg, backgroundColor: colors.surfaceLow, padding: spacing.md }}>
          <View style={{ flexDirection: 'row', gap: spacing.sm }}>
            <View style={{ flex: 1 }}>
              <Input {...numericInputProps} error={submitted ? errors.fcReposo : undefined} keyboardType="number-pad" label="FC en reposo" onChangeText={(fcReposo) => set({ fcReposo })} testID="hr-rest" value={form.fcReposo} />
            </View>
            <View style={{ flex: 1 }}>
              <Input {...numericInputProps} error={submitted ? errors.fcMax : undefined} keyboardType="number-pad" label="FC máxima" onChangeText={(fcMax) => set({ fcMax })} placeholder={String(maxHeartRate(30))} testID="hr-max" value={form.fcMax} />
            </View>
          </View>
          <Text style={{ color: colors.textMuted, fontSize: fontSizes.xs }}>
            La FC máxima por defecto es 208 − 0,7 × edad (para 30 años: {maxHeartRate(30)}). Puedes cambiarla.
          </Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm }}>
            {[1, 2, 3, 4, 5].map((zone) => (
              <ChoiceChip accessibilityLabel={zoneLabel(zone)} key={zone} label={`Z${zone}`} onSelect={() => set({ zona: zone })} selected={form.zona === zone} testID={`zone-${zone}`} />
            ))}
          </View>
          <Text accessibilityLiveRegion="polite" style={{ color: colors.text, fontSize: fontSizes.md, fontWeight: semibold }} testID="zone-bounds">
            {zoneLabel(form.zona)}: {bounds.minBpm}–{bounds.maxBpm} lpm
          </Text>
        </View>
      ) : (
        <Group title="Esfuerzo objetivo (1 muy suave · 10 máximo)">
          {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((rpe) => (
            <ChoiceChip accessibilityLabel={`Esfuerzo ${rpe}`} key={rpe} label={String(rpe)} minWidth={44} onSelect={() => set({ rpe })} selected={form.rpe === rpe} testID={`rpe-${rpe}`} />
          ))}
        </Group>
      )}

      <Group title="Progresión semanal">
        {[0, 5, 10].map((pct) => (
          <ChoiceChip accessibilityLabel={`${pct} por ciento por semana`} key={pct} label={`${pct} %`} onSelect={() => set({ progresion: pct })} selected={form.progresion === pct} testID={`progression-${pct}`} />
        ))}
      </Group>

      <Button
        label="Activar plan de cardio"
        loading={activate.isPending}
        onPress={() => {
          setSubmitted(true);
          if (Object.keys(errors).length === 0) activate.mutate(false);
        }}
      />
    </ScrollScreen>
  );
}
