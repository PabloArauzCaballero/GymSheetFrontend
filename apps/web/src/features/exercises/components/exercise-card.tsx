import { selectExercisePoster } from '@gymsheet/domain';
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
  /**
   * Solo imagen fija, nunca vídeo: una rejilla que cargara los clips gastaría
   * 1,9 MB por tarjeta (PLAN-VIDEOS-EJERCICIOS §4.3). Cuando el ejercicio solo
   * tiene vídeo se usa su póster, que antes caía al icono genérico.
   */
  const poster = selectExercisePoster(exercise.media, null);
  return (
    <article className="panel hover-lift group overflow-hidden">
      <Link href={`/exercises/${exercise.id}`}>
        <div className="relative grid aspect-[16/9] place-items-center overflow-hidden border-b border-[var(--border-subtle)] bg-[var(--surface-low)]">
          {poster ? (
            <DomainImage
              key={poster.url}
              alt={poster.altText}
              className="size-full object-cover transition-opacity duration-[var(--dur-4)] ease-[var(--ease-out)]"
              src={poster.url}
            />
          ) : (
            <Dumbbell className="size-10 text-[var(--text-disabled)]" />
          )}
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 bg-gradient-to-t from-[rgb(var(--scrim-channels)/0.6)] via-transparent to-transparent opacity-0 transition duration-300 group-hover:opacity-100"
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
            <p className="data-label">{exercise.grupoMuscular}</p>
            <h2 className="mt-2 break-words text-xl font-semibold tracking-[-0.02em]">
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
