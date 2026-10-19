import type { ActiveProgramSummary } from '@gymsheet/types';

/** A1 · «Ya tienes "X" activa (semana 5 de 12). ¿Apagarla y activar "Y"?» (RF-14). */
export function StepReplace({
  active,
  routineName,
  keepsCardio,
}: Readonly<{ active: ActiveProgramSummary; routineName: string; keepsCardio: boolean }>) {
  return (
    <section aria-labelledby="replace-title" className="panel grid gap-4 p-6" data-testid="step-replace">
      <h2 className="text-lg font-semibold tracking-[-0.02em]" id="replace-title">
        Solo puedes tener un programa de pesas a la vez
      </h2>
      <p className="text-sm leading-6 text-[var(--text-muted)]">
        Ya tienes «<strong className="text-[var(--text)]">{active.rutinaNombre ?? 'un programa'}</strong>» activo
        {active.semanaActual ? ` (semana ${active.semanaActual} de ${active.semanasTotales})` : ''}. Si sigues, lo
        apagamos y activamos «<strong className="text-[var(--text)]">{routineName}</strong>». Lo que ya entrenaste no se
        borra.
      </p>
      {keepsCardio ? (
        <p className="rounded-[var(--radius-md)] border border-[var(--info-border)] bg-[var(--info-bg)] px-4 py-3 text-sm text-[var(--info-text)]">
          Tu plan de cardio sigue activo.
        </p>
      ) : null}
    </section>
  );
}
