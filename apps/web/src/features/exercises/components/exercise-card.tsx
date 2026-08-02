import { Dumbbell, Heart, Target } from 'lucide-react';
import Link from 'next/link';
import type { Exercise } from '@/shared/api/contracts';
import { Badge } from '@/shared/components/ui/badge';
import { Button } from '@/shared/components/ui/button';
import { DomainImage } from '@/shared/components/media/domain-image';
import { cn } from '@/shared/lib/cn';

export function ExerciseCard({
  exercise,
  favorite,
  onToggleFavorite,
  busy,
}: Readonly<{
  exercise: Exercise;
  favorite: boolean;
  onToggleFavorite: () => void;
  busy?: boolean;
}>) {
  const primaryMedia = exercise.media.find((item) => item.isPrimary) ?? exercise.media[0];
  return (
    <article className="panel group overflow-hidden transition duration-300 hover:-translate-y-1 hover:border-[var(--border)] hover:shadow-[0_20px_50px_-24px_rgb(195_244_0_/_0.35)]">
      <Link href={`/exercises/${exercise.id}`}>
        <div className="relative grid aspect-[16/9] place-items-center overflow-hidden border-b border-[var(--border-subtle)] bg-[var(--surface-low)]">
          {primaryMedia?.mediaType === 'IMAGE' || primaryMedia?.mediaType === 'GIF' ? (
            <DomainImage
              key={primaryMedia.id}
              alt={primaryMedia.altText}
              className="size-full object-cover opacity-90 transition duration-500 ease-out group-hover:scale-[1.05] group-hover:opacity-100"
              fallbackSrc={primaryMedia.url}
              src={primaryMedia.thumbnailUrl ?? primaryMedia.url}
            />
          ) : (
            <Dumbbell className="size-10 text-[var(--text-disabled)] transition duration-500 group-hover:scale-110 group-hover:text-[var(--text-muted)]" />
          )}
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 transition duration-300 group-hover:opacity-100"
          />
          <div className="absolute left-3 top-3 flex gap-2">
            <Badge tone={exercise.tipoEjercicio === 'PERSONAL' ? 'info' : 'neutral'}>
              {exercise.tipoEjercicio}
            </Badge>
          </div>
        </div>
      </Link>
      <div className="p-5">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <p className="data-label text-[var(--accent-ink)]">{exercise.grupoMuscular}</p>
            <h2 className="mt-2 break-words text-xl font-bold tracking-[-0.03em] transition-colors duration-200 group-hover:text-[var(--accent-ink)]">
              <Link href={`/exercises/${exercise.id}`}>{exercise.nombre}</Link>
            </h2>
          </div>
          <Button
            aria-label={favorite ? 'Quitar de frecuentes' : 'Agregar a frecuentes'}
            aria-pressed={favorite}
            className={favorite ? 'text-[var(--accent-ink)]' : undefined}
            disabled={busy}
            onClick={onToggleFavorite}
            size="icon"
            variant="ghost"
          >
            <Heart
              className={cn(
                'size-4 transition-transform duration-200 active:scale-125',
                favorite && 'scale-110',
              )}
              fill={favorite ? 'currentColor' : 'none'}
            />
          </Button>
        </div>
        <p className="mt-3 line-clamp-2 min-h-12 text-sm leading-6 text-[var(--text-muted)]">
          {exercise.descripcion ?? 'Sin descripción adicional.'}
        </p>
        <div className="mt-5 grid gap-2 text-xs text-[var(--text-muted)]">
          <span className="flex items-center gap-2">
            <Target className="size-4" />
            {exercise.targetMuscle ?? exercise.bodyPart ?? 'Objetivo no especificado'}
          </span>
          <span className="break-words">
            {exercise.category ?? 'Sin categoría'} ·{' '}
            {exercise.requiredEquipment ?? exercise.equipment[0]?.nombre ?? 'Sin equipo'}
          </span>
        </div>
      </div>
    </article>
  );
}
