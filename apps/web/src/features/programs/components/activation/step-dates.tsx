import { WEEKDAYS, WEEKDAY_INITIALS, WEEKDAY_NAMES } from '@gymsheet/hooks';
import { ChoiceChip } from '@/shared/components/ui/choice-chip';
import { Field } from '@/shared/components/ui/field';
import { Input } from '@/shared/components/ui/input';
import { nextMondayIso, todayIso, type ActivationDraft, type DraftErrors } from '../../activation-model';

const longDate = (iso: string) =>
  new Date(`${iso}T12:00:00`).toLocaleDateString('es', { weekday: 'long', day: 'numeric', month: 'long' });

/** A2 · Inicio (hoy o el próximo lunes), duración y días de la semana. */
export function StepDates({
  draft,
  errors,
  onChange,
}: Readonly<{
  draft: ActivationDraft;
  errors: DraftErrors;
  onChange: (patch: Partial<ActivationDraft>) => void;
}>) {
  const toggleDay = (day: number) =>
    onChange({
      dias: draft.dias.includes(day) ? draft.dias.filter((value) => value !== day) : [...draft.dias, day].sort((a, b) => a - b),
    });
  return (
    <div className="grid gap-8">
      <fieldset className="grid gap-3">
        <legend className="data-label mb-1">¿Cuándo empiezas?</legend>
        <div className="grid gap-2 sm:grid-cols-2">
          {(
            [
              ['hoy', 'Hoy', longDate(todayIso())],
              ['lunes', 'El próximo lunes', longDate(nextMondayIso())],
            ] as const
          ).map(([value, label, detail]) => (
            <label
              className="flex min-h-14 cursor-pointer items-center gap-3 rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--surface-low)] px-4 py-3 has-[:checked]:border-[var(--volt)] has-[:checked]:bg-[rgb(var(--accent-channels)/0.1)] has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-[var(--volt)]"
              key={value}
            >
              <input
                checked={draft.inicio === value}
                className="size-4 accent-[var(--volt)]"
                name="inicio"
                onChange={() => onChange({ inicio: value })}
                type="radio"
              />
              <span className="grid">
                <span className="font-semibold">{label}</span>
                <span className="text-xs capitalize text-[var(--text-muted)]">{detail}</span>
              </span>
            </label>
          ))}
        </div>
      </fieldset>

      <Field error={errors.semanas} hint="La duración de la rutina, que puedes cambiar." label="Duración en semanas">
        <Input
          className="max-w-40"
          inputMode="numeric"
          max={52}
          min={1}
          onChange={(event) => onChange({ semanas: event.target.value })}
          type="number"
          value={draft.semanas}
        />
      </Field>

      <fieldset className="grid gap-3">
        <legend className="data-label mb-1">Días que entrenas</legend>
        <div className="flex flex-wrap gap-2">
          {WEEKDAYS.map((day) => (
            <ChoiceChip
              aria-label={WEEKDAY_NAMES[day]}
              key={day}
              onClick={() => toggleDay(day)}
              selected={draft.dias.includes(day)}
            >
              {WEEKDAY_INITIALS[day]}
            </ChoiceChip>
          ))}
        </div>
        {errors.dias ? (
          <p className="text-sm text-[var(--danger-text)]" role="alert">
            {errors.dias}
          </p>
        ) : (
          <p className="text-xs text-[var(--text-muted)]">Los de la rutina, que puedes cambiar.</p>
        )}
      </fieldset>
    </div>
  );
}
