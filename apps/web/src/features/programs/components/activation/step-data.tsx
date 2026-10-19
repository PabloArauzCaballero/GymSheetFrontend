import type { ProgramMode } from '@gymsheet/types';
import { Checkbox } from '@/shared/components/ui/checkbox';
import { Field } from '@/shared/components/ui/field';
import { Input } from '@/shared/components/ui/input';
import {
  MAX_GOALS,
  epley,
  isReliableEstimate,
  realisticGoalRange,
  type ActivationDraft,
  type DraftErrors,
  type LiftDraft,
} from '../../activation-model';

const asNumber = (value: string) => Number(value.replace(',', '.'));

function GoalFields({ lift, onChange }: Readonly<{ lift: LiftDraft; onChange: (patch: Partial<LiftDraft>) => void }>) {
  const peso = asNumber(lift.marcaPesoKg);
  const reps = asNumber(lift.marcaReps);
  const ready = lift.marcaPesoKg !== '' && peso > 0 && reps >= 1;
  const e1rm = ready ? epley(peso, reps) : null;
  const range = e1rm ? realisticGoalRange(e1rm) : null;
  return (
    <div className="grid gap-4">
      <div className="grid grid-cols-2 gap-3">
        <Field label="Marca actual (kg)">
          <Input inputMode="decimal" onChange={(event) => onChange({ marcaPesoKg: event.target.value })} value={lift.marcaPesoKg} />
        </Field>
        <Field label="Repeticiones">
          <Input inputMode="numeric" onChange={(event) => onChange({ marcaReps: event.target.value })} value={lift.marcaReps} />
        </Field>
      </div>
      {e1rm ? (
        <p className="text-sm" data-testid="e1rm">
          <strong>1RM estimado: {e1rm.toLocaleString('es')} kg</strong>
          {isReliableEstimate(reps) ? null : (
            <span className="text-[var(--warning-text)]"> · estimación poco fiable con más de 10 repeticiones</span>
          )}
        </p>
      ) : null}
      <div className="grid grid-cols-2 gap-3">
        <Field label="Meta (kg)">
          <Input inputMode="decimal" onChange={(event) => onChange({ metaKg: event.target.value })} value={lift.metaKg} />
        </Field>
        <Field label="Fecha de la meta">
          <Input onChange={(event) => onChange({ metaFecha: event.target.value })} type="date" value={lift.metaFecha} />
        </Field>
      </div>
      {range ? (
        <p className="text-xs text-[var(--text-muted)]" data-testid="goal-hint">
          Una meta realista en 12 semanas: entre {range.min} y {range.max} kg (+5 a +10 %).
        </p>
      ) : null}
    </div>
  );
}

function OverloadFields({ lift, onChange }: Readonly<{ lift: LiftDraft; onChange: (patch: Partial<LiftDraft>) => void }>) {
  return (
    <div className="grid gap-4">
      <Field hint="¿No lo sabes? Hazlo en tu primera sesión y lo calculamos." label="Peso de trabajo (kg)">
        <Input inputMode="decimal" onChange={(event) => onChange({ pesoKg: event.target.value })} value={lift.pesoKg} />
      </Field>
      <div className="grid grid-cols-3 gap-3">
        <Field label="Reps mín.">
          <Input inputMode="numeric" onChange={(event) => onChange({ repsMin: event.target.value })} value={lift.repsMin} />
        </Field>
        <Field label="Reps máx.">
          <Input inputMode="numeric" onChange={(event) => onChange({ repsMax: event.target.value })} value={lift.repsMax} />
        </Field>
        <Field label="RIR">
          <Input inputMode="numeric" onChange={(event) => onChange({ rir: event.target.value })} value={lift.rir} />
        </Field>
      </div>
    </div>
  );
}

/** A4 · por cada ejercicio principal: peso, rango de repeticiones y RIR, o marca actual y meta. */
export function StepData({
  draft,
  errors,
  onLift,
}: Readonly<{
  draft: ActivationDraft;
  errors: DraftErrors;
  onLift: (ejercicioId: string, patch: Partial<LiftDraft>) => void;
}>) {
  const goals = (draft.modo as ProgramMode) === 'STRENGTH_GOALS';
  return (
    <div className="grid gap-5">
      {errors.lifts ? (
        <p className="text-sm text-[var(--danger-text)]" role="alert">
          {errors.lifts}
        </p>
      ) : null}
      {draft.lifts.map((lift) => (
        <section
          aria-label={lift.nombre}
          className="panel grid gap-4 p-5"
          data-testid={`lift-${lift.ejercicioId}`}
          key={lift.ejercicioId}
        >
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-lg font-semibold tracking-[-0.02em]">{lift.nombre}</h2>
            <Checkbox
              checked={lift.incluir}
              label={goals ? `Incluir (máx. ${MAX_GOALS})` : 'Incluir'}
              onChange={(event) => onLift(lift.ejercicioId, { incluir: event.target.checked })}
            />
          </div>
          {lift.incluir ? (
            <>
              {goals ? (
                <GoalFields lift={lift} onChange={(patch) => onLift(lift.ejercicioId, patch)} />
              ) : (
                <OverloadFields lift={lift} onChange={(patch) => onLift(lift.ejercicioId, patch)} />
              )}
              {errors.lift?.[lift.ejercicioId] ? (
                <p className="text-sm text-[var(--danger-text)]" role="alert">
                  {errors.lift[lift.ejercicioId]}
                </p>
              ) : null}
            </>
          ) : null}
        </section>
      ))}
    </div>
  );
}
