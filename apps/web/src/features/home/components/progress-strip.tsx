import { Minus, TrendingDown, TrendingUp } from 'lucide-react';

export type ProgressFigure = {
  key: string;
  value: string;
  label: string;
  delta?: { label: string; direction: 'up' | 'down' | 'flat' } | null;
};

/**
 * Cifras de apoyo en fila (`ProgressStrip` del móvil): separadas por una raya
 * vertical, cifra `numeric` y etiqueta `footnote`. La subida se dice en verde
 * de confirmación; la bajada, en tono apagado (no es un error).
 */
export function ProgressStrip({ figures }: Readonly<{ figures: readonly ProgressFigure[] }>) {
  return (
    <div className="flex">
      {figures.map((figure, index) => {
        const up = figure.delta?.direction === 'up';
        const Icon =
          figure.delta?.direction === 'up' ? TrendingUp : figure.delta?.direction === 'down' ? TrendingDown : Minus;
        return (
          <div
            className={
              index === 0
                ? 'grid flex-1 content-start gap-0.5 pr-2'
                : 'grid flex-1 content-start gap-0.5 border-l border-[var(--border)] pl-4 pr-2'
            }
            key={figure.key}
          >
            <span className="t-numeric truncate">{figure.value}</span>
            <span className="t-footnote line-clamp-2 text-[var(--text-muted)]">{figure.label}</span>
            {figure.delta ? (
              <span
                className={`t-caption inline-flex items-center gap-0.5 font-semibold tabular-nums ${up ? 'text-[var(--success-text)]' : 'text-[var(--text-muted)]'}`}
              >
                <Icon aria-hidden className="size-3" />
                {figure.delta.label}
                <span className="sr-only"> frente a la semana pasada</span>
              </span>
            ) : null}
          </div>
        );
      })}
    </div>
  );
}
