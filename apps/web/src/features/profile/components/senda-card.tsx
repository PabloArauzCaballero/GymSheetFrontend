'use client';

import { ChevronRight } from 'lucide-react';
import Link from 'next/link';
import type { Progression } from '@/shared/api/schemas';
import { ErrorPanel } from '@/shared/components/feedback/error-panel';
import { Skeleton } from '@/shared/components/feedback/skeleton';
import { Section } from '@/shared/components/mobile/section';

/**
 * La senda en el perfil: el camino al siguiente rango y las insignias. Las
 * cifras, el rango y «Compartir» viven en el héroe; aquí no se repiten.
 */
export function SendaCard({
  progress,
  pending,
  failed,
  onRetry,
}: Readonly<{ progress: Progression | undefined; pending: boolean; failed: boolean; onRetry: () => void }>) {
  if (pending) return <Skeleton className="h-28" />;
  if (failed || !progress) return <ErrorPanel message="No se pudo cargar tu senda." onRetry={onRetry} />;
  const earned = progress.badges.filter((badge) => badge.earned).length;
  const next =
    progress.nextLevel && progress.pointsToNextLevel !== null
      ? `Faltan ${progress.pointsToNextLevel.toLocaleString('es-ES')} puntos para ${progress.nextLevel.name}`
      : 'Senda completa';

  return (
    <Section title="Tu senda">
      <Link className="panel grid gap-3 p-5 transition-colors duration-[var(--dur-2)] hover:bg-[var(--surface)]" href="/trayectoria">
        <span className="flex items-center gap-1">
          <span className="grid flex-1 gap-0.5">
            <span className="t-headline">{next}</span>
            <span className="t-footnote text-[var(--text-muted)]">{earned === 1 ? '1 insignia ganada' : `${earned} insignias ganadas`}</span>
          </span>
          <ChevronRight aria-hidden className="size-4 text-[var(--text-muted)]" />
        </span>
        <span aria-hidden className="block h-1.5 overflow-hidden rounded-full bg-[var(--surface-highest)]">
          <span className="block h-full rounded-full bg-[var(--text-muted)]" style={{ width: `${Math.round(progress.levelProgress * 100)}%` }} />
        </span>
      </Link>
    </Section>
  );
}
