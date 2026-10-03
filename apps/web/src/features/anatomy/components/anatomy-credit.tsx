/**
 * Crédito obligatorio de las láminas: son una adaptación de modelos con
 * licencia CC BY-SA 4.0, que exige citar autoría, licencia y que hubo cambios.
 * Va junto a la figura (y en Ajustes), que es donde se ve la obra.
 */
export function AnatomyCredit({ className }: Readonly<{ className?: string }>) {
  return (
    <p className={'text-xs leading-5 text-[var(--text-disabled)] ' + (className ?? '')}>
      Anatomía: adaptación (render, selección de capas y color) de{' '}
      <a
        className="underline decoration-dotted underline-offset-2 hover:text-[var(--text-muted)]"
        href="https://github.com/LluisV/Z-Anatomy"
        rel="noreferrer"
        target="_blank"
      >
        Z-Anatomy
      </a>
      , de Lluís Vinent Juanico, bajo licencia{' '}
      <a
        className="underline decoration-dotted underline-offset-2 hover:text-[var(--text-muted)]"
        href="https://creativecommons.org/licenses/by-sa/4.0/"
        rel="noreferrer license"
        target="_blank"
      >
        CC BY-SA 4.0
      </a>
      .
    </p>
  );
}
