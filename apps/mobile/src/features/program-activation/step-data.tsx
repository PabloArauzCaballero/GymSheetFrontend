import { Text, View } from 'react-native';
import {
  EPLEY_RELIABLE_MAX_REPS,
  MAX_GOALS,
  estimateFromForm,
  formatKg,
  realisticGoalRange,
  type LiftErrors,
  type LiftForm,
} from '@gymsheet/hooks';
import type { ProgramMode } from '@gymsheet/schemas';
import { Checkbox } from '@/components/checkbox';
import { Input } from '@/components/ui';
import { ChoiceChip } from '@/components/wizard/choice-chip';
import { toIsoDate, type Activation } from '@/features/program-activation/use-activation';
import { colors, fontSizes, radii, semibold, spacing } from '@/theme';

const afterWeeks = (weeks: number): string => {
  const date = new Date();
  date.setDate(date.getDate() + weeks * 7);
  return toIsoDate(date);
};

function Row({ children }: { children: React.ReactNode }) {
  return <View style={{ flexDirection: 'row', gap: spacing.sm }}>{children}</View>;
}

function Field({ flex = 1, ...props }: React.ComponentProps<typeof Input> & { flex?: number }) {
  return (
    <View style={{ flex }}>
      <Input {...props} />
    </View>
  );
}

function OverloadFields({ form, errors, onChange }: { form: LiftForm; errors: LiftErrors; onChange: (patch: Partial<LiftForm>) => void }) {
  return (
    <View style={{ gap: spacing.sm }}>
      <Field
        error={errors.pesoTrabajo}
        keyboardType="decimal-pad"
        label="Peso de trabajo (kg)"
        onChangeText={(pesoTrabajo) => onChange({ pesoTrabajo })}
        placeholder="Opcional"
        testID={`work-${form.ejercicioId}`}
        value={form.pesoTrabajo}
      />
      <Row>
        <Field keyboardType="number-pad" label="Reps mín" onChangeText={(repsMin) => onChange({ repsMin })} value={form.repsMin} />
        <Field keyboardType="number-pad" label="Reps máx" onChangeText={(repsMax) => onChange({ repsMax })} value={form.repsMax} />
        <Field keyboardType="number-pad" label="RIR" onChangeText={(rir) => onChange({ rir })} value={form.rir} />
      </Row>
      <Text style={{ color: colors.textMuted, fontSize: fontSizes.sm, lineHeight: 20 }}>
        ¿No lo sabes? Hazlo en tu primera sesión y lo calculamos.
      </Text>
    </View>
  );
}

function GoalFields({ form, errors, onChange }: { form: LiftForm; errors: LiftErrors; onChange: (patch: Partial<LiftForm>) => void }) {
  const e1rm = estimateFromForm(form);
  const range = e1rm ? realisticGoalRange(e1rm) : null;
  const unreliable = Number(form.marcaReps) > EPLEY_RELIABLE_MAX_REPS;
  return (
    <View style={{ gap: spacing.sm }}>
      <Text style={{ color: colors.textMuted, fontSize: fontSizes.sm }}>Marca actual (peso × repeticiones)</Text>
      <Row>
        <Field keyboardType="decimal-pad" label="Peso (kg)" onChangeText={(marcaPeso) => onChange({ marcaPeso })} testID={`mark-w-${form.ejercicioId}`} value={form.marcaPeso} />
        <Field keyboardType="number-pad" label="Reps" onChangeText={(marcaReps) => onChange({ marcaReps })} testID={`mark-r-${form.ejercicioId}`} value={form.marcaReps} />
      </Row>
      {errors.marca ? <Text style={{ color: colors.danger, fontSize: fontSizes.sm }}>{errors.marca}</Text> : null}
      {e1rm ? (
        <Text accessibilityLiveRegion="polite" style={{ color: colors.text, fontSize: fontSizes.md, fontWeight: semibold }} testID={`e1rm-${form.ejercicioId}`}>
          1RM estimado: {formatKg(e1rm)}
        </Text>
      ) : null}
      {unreliable ? (
        <Text style={{ color: colors.warning, fontSize: fontSizes.sm }}>Con más de 10 repeticiones la estimación es poco fiable.</Text>
      ) : null}
      <Field
        error={errors.meta}
        keyboardType="decimal-pad"
        label="Meta (kg)"
        onChangeText={(meta) => onChange({ meta })}
        testID={`goal-${form.ejercicioId}`}
        value={form.meta}
      />
      {range ? (
        <Text style={{ color: colors.textMuted, fontSize: fontSizes.sm }} testID={`realistic-${form.ejercicioId}`}>
          Realista: +5 a 10 % en 12 semanas ({formatKg(range.minKg)} a {formatKg(range.maxKg)}).
        </Text>
      ) : null}
      <Field
        autoCapitalize="none"
        error={errors.fechaMeta}
        label="Fecha de la meta (AAAA-MM-DD)"
        onChangeText={(fechaMeta) => onChange({ fechaMeta })}
        testID={`goal-date-${form.ejercicioId}`}
        value={form.fechaMeta}
      />
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm }}>
        {[8, 12, 16].map((weeks) => (
          <ChoiceChip
            accessibilityLabel={`Meta en ${weeks} semanas`}
            key={weeks}
            label={`En ${weeks} sem`}
            onSelect={() => onChange({ fechaMeta: afterWeeks(weeks) })}
            selected={form.fechaMeta === afterWeeks(weeks)}
            testID={`goal-in-${weeks}-${form.ejercicioId}`}
          />
        ))}
      </View>
    </View>
  );
}

/** A4 · Datos del modo: sobrecarga (peso, reps, RIR) o metas (marca → 1RM → meta y fecha). */
export function DataStep({ state, mode }: { state: Activation; mode: ProgramMode }) {
  const goals = mode === 'STRENGTH_GOALS';
  return (
    <View style={{ gap: spacing.lg }}>
      {goals ? (
        <Text style={{ color: colors.textMuted, fontSize: fontSizes.sm }}>
          Elige de 1 a {MAX_GOALS} levantamientos y escribe tu marca y tu meta.
        </Text>
      ) : null}
      {state.forms.map((form) => {
        const included = !goals || state.chosen.includes(form.ejercicioId);
        const errors = state.errors[state.visibleForms.findIndex((f) => f.ejercicioId === form.ejercicioId)] ?? {};
        return (
          <View
            key={form.ejercicioId}
            style={{ gap: spacing.sm, borderRadius: radii.lg, borderWidth: 1, borderColor: colors.borderSubtle, backgroundColor: colors.surfaceLow, padding: spacing.md }}
          >
            <Text style={{ color: colors.text, fontSize: fontSizes.md, fontWeight: semibold }}>{form.nombre}</Text>
            {goals ? (
              <Checkbox checked={included} label="Incluir como meta" onChange={() => state.toggleChosen(form.ejercicioId)} />
            ) : null}
            {included ? (
              goals ? (
                <GoalFields errors={errors} form={form} onChange={(patch) => state.updateForm(form.ejercicioId, patch)} />
              ) : (
                <OverloadFields errors={errors} form={form} onChange={(patch) => state.updateForm(form.ejercicioId, patch)} />
              )
            ) : null}
          </View>
        );
      })}
    </View>
  );
}
