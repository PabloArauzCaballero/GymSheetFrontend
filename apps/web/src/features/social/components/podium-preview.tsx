'use client';

import { useQuery } from '@tanstack/react-query';
import { ChevronRight, Trophy } from 'lucide-react';
import Link from 'next/link';
import { progressionService } from '@/features/progression/services/progression-service';
import { Skeleton } from '@/shared/components/feedback/skeleton';
import { cn } from '@/shared/lib/cn';

/**
 * Vista previa del podio.
 *
 * Quien no entra a «Tu senda» nunca sabría que existe una clasificación. Tres
 * filas, el mismo idioma visual que la tabla completa, y un enlace que lleva
 * allí — no una copia del ranking, sólo su puerta de entrada.
 *
 * Si la consulta falla o el gimnasio todavía no tiene a nadie con puntos, no se
 * pinta nada: es un avance, no contenido de la página, y un panel de error por
 * un adorno sería ruido sobre algo que el usuario no vino a buscar.
 */
export function PodiumPreview() {
  const leaderboard = useQuery({
    queryKey: ['progression', 'leaderboard', 'points', 'preview'],
    queryFn: () => progressionService.leaderboard(3, 'points'),
    staleTime: 60_000,
  });

  if (leaderboard.isLoading) return <Skeleton className="h-36 w-full rounded-[var(--radius-lg)]" />;
  if (leaderboard.isError || !leaderboard.data?.length) return null;

  return (
    <Link
      className="panel group/podium grid gap-4 p-5 transition-colors duration-[var(--dur-2)] hover:border-[var(--border)]"
      href="/trayectoria"
    >
      <div className="flex items-center justify-between gap-3">
        <h2 className="inline-flex items-center gap-2 text-base font-semibold tracking-[-0.02em]">
          <Trophy aria-hidden className="size-4 text-[var(--accent-ink)]" />
          Podio del gimnasio
        </h2>
        <ChevronRight
          aria-hidden
          className="size-4 text-[var(--text-muted)] transition-transform duration-[var(--dur-2)] group-hover/podium:translate-x-0.5"
        />
      </div>
      <ol className="grid gap-3">
        {leaderboard.data.map((entry) => (
          <li className="flex items-center gap-4" key={`${entry.position}-${entry.displayName}`}>
            <span
              className={cn(
                'grid size-7 shrink-0 place-items-center rounded-full text-xs font-semibold',
                entry.isMe
                  ? 'bg-[var(--volt)] text-[var(--accent-contrast)]'
                  : 'bg-[var(--surface-high)] text-[var(--text-muted)]',
              )}
            >
              {entry.position}
            </span>
            <span
              className={cn(
                'min-w-0 flex-1 truncate text-sm',
                entry.isMe ? 'font-semibold text-[var(--text)]' : 'text-[var(--text-muted)]',
              )}
            >
              {entry.displayName}
              {entry.isMe ? ' · tú' : ''}
            </span>
            <span className="shrink-0 text-sm tabular-nums text-[var(--text-muted)]">
              {entry.points.toLocaleString('es-ES')} pts
            </span>
          </li>
        ))}
      </ol>
    </Link>
  );
}
