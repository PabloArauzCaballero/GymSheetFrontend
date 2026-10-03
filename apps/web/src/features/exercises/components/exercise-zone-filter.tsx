'use client';

import type { ExerciseTaxonomy } from '@gymsheet/schemas';
import { X } from 'lucide-react';
import { cn } from '@/shared/lib/cn';

/** `upper arms` → `Upper arms`: el dataset guarda las zonas en minúscula. */
function sentenceCase(value: string) {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

function Chip({
  label,
  count,
  active,
  onClick,
}: Readonly<{ label: string; count?: number; active: boolean; onClick: () => void }>) {
  return (
    <button
      aria-pressed={active}
      className={cn(
        'inline-flex min-h-11 shrink-0 items-center gap-2 rounded-full border px-3.5 text-sm transition-[background-color,border-color,color,transform] duration-[var(--dur-1)] ease-[var(--ease-out)] motion-reduce:transition-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent-ink)] active:scale-[0.97] motion-reduce:active:scale-100',
        active
          ? 'border-[var(--text)] bg-[var(--text)] font-semibold text-[var(--background)]'
          : 'border-[var(--border)] bg-[var(--surface-low)] text-[var(--text-muted)] hover:border-[var(--text-disabled)] hover:text-[var(--text)]',
      )}
      onClick={onClick}
      type="button"
    >
      {label}
      {count !== undefined ? (
        <span className={cn('data-value text-xs', active ? 'opacity-70' : 'text-[var(--text-disabled)]')}>
          {count}
        </span>
      ) : null}
    </button>
  );
}

/**
 * Navegación por zona → músculo, la misma que el catálogo del móvil: primero la
 * zona del cuerpo, y dentro de ella el músculo concreto. Sustituye al selector
 * de «grupo muscular», que solo ofrecía los grupos de la página visible.
 */
export function ExerciseZoneFilter({
  taxonomy,
  bodyPart,
  muscle,
  onBodyPart,
  onMuscle,
}: Readonly<{
  taxonomy: ExerciseTaxonomy;
  bodyPart: string | null;
  muscle: string | null;
  onBodyPart: (value: string | null) => void;
  onMuscle: (value: string | null) => void;
}>) {
  const zone = taxonomy.find((entry) => entry.bodyPart === bodyPart);
  return (
    <div className="grid gap-3">
      <div aria-label="Zona del cuerpo" className="flex flex-wrap gap-2" role="group">
        <Chip active={bodyPart === null} label="Todas" onClick={() => onBodyPart(null)} />
        {taxonomy.map((entry) => (
          <Chip
            active={entry.bodyPart === bodyPart}
            count={entry.total}
            key={entry.bodyPart}
            label={sentenceCase(entry.bodyPart)}
            onClick={() => onBodyPart(entry.bodyPart === bodyPart ? null : entry.bodyPart)}
          />
        ))}
      </div>
      {zone && zone.muscles.length > 1 ? (
        <div
          aria-label={`Músculos de ${sentenceCase(zone.bodyPart).toLowerCase()}`}
          className="reveal flex flex-wrap items-center gap-2 border-t border-[var(--border-subtle)] pt-3"
          role="group"
        >
          {zone.muscles.map((entry) => (
            <Chip
              active={entry.targetMuscle === muscle}
              count={entry.total}
              key={entry.targetMuscle}
              label={sentenceCase(entry.targetMuscle)}
              onClick={() => onMuscle(entry.targetMuscle === muscle ? null : entry.targetMuscle)}
            />
          ))}
          {muscle ? (
            <button
              className="inline-flex min-h-11 items-center gap-1 px-2 text-sm text-[var(--text-muted)] hover:text-[var(--text)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent-ink)]"
              onClick={() => onMuscle(null)}
              type="button"
            >
              <X aria-hidden className="size-4" />
              Quitar músculo
            </button>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
