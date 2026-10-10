import { Text, View } from 'react-native';
import { MODE_COPY, WEEKDAY_NAMES, formatKg, type Weekday } from '@gymsheet/hooks';
import type { Routine } from '@gymsheet/types';
import { Card } from '@/components/layout';
import type { Activation } from '@/features/program-activation/use-activation';
import { colors, fontSizes, semibold, spacing } from '@/theme';

function Line({ label, value }: { label: string; value: string }) {
  return (
    <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: spacing.md }}>
      <Text style={{ color: colors.textMuted, fontSize: fontSizes.sm }}>{label}</Text>
      <Text style={{ flex: 1, textAlign: 'right', color: colors.text, fontSize: fontSizes.sm, fontWeight: semibold }}>{value}</Text>
    </View>
  );
}

/** A5 · Resumen antes de activar. */
export function SummaryStep({ state, routine }: { state: Activation; routine: Routine }) {
  const days = [...state.days].sort((a, b) => a - b).map((d) => WEEKDAY_NAMES[d as Weekday].slice(0, 3)).join(', ');
  return (
    <Card>
      <View style={{ gap: spacing.sm }} testID="activation-summary">
        <Line label="Rutina" value={routine.nombre} />
        <Line label="Modo" value={MODE_COPY[state.mode].title} />
        <Line label="Inicio" value={state.start === 'today' ? `Hoy (${state.startIso})` : `Próximo lunes (${state.startIso})`} />
        <Line label="Duración" value={`${state.weeks} semanas`} />
        <Line label="Días" value={days || '—'} />
        {state.visibleForms.length > 0 && state.mode !== 'NONE'
          ? state.visibleForms.map((form) => (
              <Line
                key={form.ejercicioId}
                label={form.nombre}
                value={
                  state.mode === 'STRENGTH_GOALS'
                    ? `${form.marcaPeso} × ${form.marcaReps} → ${formatKg(Number(form.meta.replace(',', '.')))}`
                    : form.pesoTrabajo
                      ? `${form.pesoTrabajo} kg · ${form.repsMin}-${form.repsMax} reps`
                      : 'Peso por calcular'
                }
              />
            ))
          : null}
        {state.withCardio ? <Line label="Cardio" value="Lo configuras al terminar" /> : null}
      </View>
    </Card>
  );
}
