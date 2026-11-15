'use client';

import { proudStat } from '@gymsheet/domain';
import { ChevronRight, Share2 } from 'lucide-react';
import Link from 'next/link';
import type { Progression } from '@/shared/api/schemas';
import { ErrorPanel } from '@/shared/components/feedback/error-panel';
import { Skeleton } from '@/shared/components/feedback/skeleton';
import { Section } from '@/shared/components/mobile/section';
import { Button } from '@/shared/components/ui/button';
import { HeroStats, plural } from './profile-hero';
import { shareProfile } from './profile-rows';

/** La senda en el perfil: cifras reales, barra al siguiente rango y «Compartir». */
export function SendaCard({
  progress,
  pending,
  failed,
  onRetry,
  userId,
}: Readonly<{ progress: Progression | undefined; pending: boolean; failed: boolean; onRetry: () => void; userId: string | null }>) {
  if (pending) return <Skeleton className="h-36" />;
  if (failed || !progress) return <ErrorPanel message="No se pudo cargar tu senda." onRetry={onRetry} />;
  const rank = progress.level?.name ?? null;
  const earned = progress.badges.filter((badge) => badge.earned).length;
  const streak = progress.streak?.current ?? progress.stats.currentStreakDays;
  const sessions = progress.stats.totalSessions;
  const points = progress.points;

  return (
    <Section title="Tu senda">
      <div className="panel grid gap-4 p-5">
        <Link className="grid gap-3" href="/trayectoria">
          <HeroStats
            stats={[
              { key: 'points', value: points, label: 'puntos' },
              { key: 'streak', value: streak, label: plural(streak, 'día de racha', 'días de racha') },
              { key: 'sessions', value: sessions, label: plural(sessions, 'sesión', 'sesiones') },
            ]}
          />
          <span aria-hidden className="block h-1.5 overflow-hidden rounded-full bg-[var(--surface-highest)]">
            <span className="block h-full rounded-full bg-[var(--text-muted)]" style={{ width: `${Math.round(progress.levelProgress * 100)}%` }} />
          </span>
          <span className="t-footnote flex items-center gap-1 text-[var(--text-muted)]">
            <span className="flex-1">
              {[
                progress.nextLevel && progress.pointsToNextLevel !== null
                  ? `Faltan ${progress.pointsToNextLevel.toLocaleString('es-ES')} para ${progress.nextLevel.name}`
                  : 'Senda completa',
                earned === 1 ? '1 insignia' : `${earned} insignias`,
              ].join(' · ')}
            </span>
            <ChevronRight aria-hidden className="size-4" />
          </span>
        </Link>
        {rank && userId ? (
          <Button className="justify-self-start" onClick={() => void shareProfile(userId, rank, proudStat({ streak, sessions, points }))} size="sm" variant="ghost">
            <Share2 aria-hidden className="size-4" />
            Compartir mi perfil
          </Button>
        ) : null}
      </div>
    </Section>
  );
}
