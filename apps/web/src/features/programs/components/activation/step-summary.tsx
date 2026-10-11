import { WEEKDAY_NAMES, type Weekday } from '@gymsheet/hooks';
import { modeLabel } from '../../labels';
import { startDateOf, type ActivationDraft } from '../../activation-model';

/** A5 · lo que se va a activar, antes del botón «Activar». */
export function StepSummary({
  routineName,
  draft,
  willReplace,
}: Readonly<{ routineName: string; draft: ActivationDraft; willReplace: boolean }>) {
  const start = new Date(`${startDateOf(draft)}T12:00:00`).toLocaleDateString('es', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  });
  const rows: Array<[string, string]> = [
    ['Rutina', routineName],
    ['Empieza', start],
    ['Duración', `${draft.semanas} semanas`],
    ['Días', draft.dias.map((day) => WEEKDAY_NAMES[day as Weekday]).join(', ')],
    ['Modo', modeLabel(draft.modo)],
  ];
  const lifts = draft.lifts.filter((lift) => lift.incluir);
  if (draft.modo !== 'NONE' && lifts.length) {
    rows.push([
      draft.modo === 'STRENGTH_GOALS' ? 'Metas' : 'Levantamientos',
      lifts
        .map((lift) =>
          draft.modo === 'STRENGTH_GOALS' ? `${lift.nombre} → ${lift.metaKg} kg` : `${lift.nombre}${lift.pesoKg ? ` · ${lift.pesoKg} kg` : ''}`,
        )
        .join('; '),
    ]);
  }
  return (
    <section aria-labelledby="summary-title" className="panel grid gap-4 p-6" data-testid="step-summary">
      <h2 className="text-lg font-semibold tracking-[-0.02em]" id="summary-title">
        Esto es lo que vamos a activar
      </h2>
      <dl className="grid gap-3 text-sm">
        {rows.map(([term, value]) => (
          <div className="grid gap-0.5 sm:grid-cols-[8rem_1fr] sm:gap-4" key={term}>
            <dt className="text-[var(--text-muted)]">{term}</dt>
            <dd className="font-semibold">{value}</dd>
          </div>
        ))}
      </dl>
      {willReplace ? (
        <p className="text-sm text-[var(--warning-text)]">Se apagará tu programa de pesas actual.</p>
      ) : null}
      {draft.conCardio ? (
        <p className="text-sm text-[var(--text-muted)]">Después te llevamos a crear tu plan de cardio.</p>
      ) : null}
    </section>
  );
}
