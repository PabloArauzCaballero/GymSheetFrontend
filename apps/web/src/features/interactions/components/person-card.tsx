'use client';

import { MapPin, Target } from 'lucide-react';
import type { ReactNode } from 'react';
import { trainingGoalLabels } from '@/features/social/components/directory-labels';
import { Badge } from '@/shared/components/ui/badge';
import { Card } from '@/shared/components/ui/card';
import { PersonAvatar } from '@/shared/components/media/person-avatar';
import { formatRelativeTime } from '@/shared/lib/relative-time';

/** Lo mínimo que las cuatro listas comparten: la ficha del directorio. */
export type PersonCardEntry = {
  userId: string;
  displayName: string;
  photoUrl: string | null;
  objetivo: string | null;
  branchName: string | null;
  age?: number | null;
};

/**
 * Una persona en una lista de interacciones.
 *
 * Las cuatro listas —likes recibidos, likes enviados, descartes recibidos,
 * descartes propios— devuelven la misma ficha, así que se pintan con esta misma
 * tarjeta. Cuatro variantes parecidas es como empiezan a divergir cuatro
 * pantallas que deberían sentirse la misma.
 */
export function PersonCard({
  actions,
  entry,
  highlight = false,
  meta,
  onSelect,
  timestamp,
}: Readonly<{
  actions?: ReactNode;
  entry: PersonCardEntry;
  /** Marca de «nuevo»: un punto de acento, no un color de fondo distinto. */
  highlight?: boolean;
  meta?: ReactNode;
  /** Abre la ficha completa. Sin él, el nombre es texto y no un control muerto. */
  onSelect?: () => void;
  timestamp: string;
}>) {
  const objetivo = entry.objetivo
    ? (trainingGoalLabels[entry.objetivo] ?? entry.objetivo)
    : null;

  return (
    <Card className="flex flex-wrap items-center gap-4 p-4">
      <div className="relative">
        <PersonAvatar name={entry.displayName} photoUrl={entry.photoUrl} size="md" />
        {highlight ? (
          <span
            aria-hidden
            className="absolute -right-0.5 -top-0.5 size-3 rounded-full border-2 border-[var(--surface-lowest)] bg-[var(--volt)]"
          />
        ) : null}
      </div>
      <div className="grid min-w-0 flex-1 gap-1">
        <div className="flex flex-wrap items-center gap-2">
          {onSelect ? (
            <button
              className="truncate rounded-[var(--radius-sm)] text-left font-semibold hover:underline"
              onClick={onSelect}
              type="button"
            >
              <PersonName entry={entry} />
            </button>
          ) : (
            <p className="truncate font-semibold">
              <PersonName entry={entry} />
            </p>
          )}
          {highlight ? <Badge tone="info">Nuevo</Badge> : null}
        </div>
        <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-[var(--text-muted)]">
          {objetivo ? (
            <span className="inline-flex items-center gap-1.5">
              <Target aria-hidden className="size-3.5" />
              {objetivo}
            </span>
          ) : null}
          {entry.branchName ? (
            <span className="inline-flex items-center gap-1.5">
              <MapPin aria-hidden className="size-3.5" />
              {entry.branchName}
            </span>
          ) : null}
        </div>
        <p className="text-xs text-[var(--text-muted)]">
          {formatRelativeTime(timestamp)}
          {meta ? <span className="ml-2">{meta}</span> : null}
        </p>
      </div>
      {actions ? <div className="flex shrink-0 flex-wrap gap-2">{actions}</div> : null}
    </Card>
  );
}

function PersonName({ entry }: Readonly<{ entry: PersonCardEntry }>) {
  return (
    <>
      {entry.displayName}
      {entry.age ? (
        <span className="ml-1.5 font-normal text-[var(--text-muted)]">{entry.age}</span>
      ) : null}
    </>
  );
}
