import { musclesByGroup } from '@gymsheet/anatomy';
import { ArrowLeft, ChevronRight } from 'lucide-react';
import Link from 'next/link';
import { PageHeader } from '@/shared/components/layout/page-header';

/**
 * Todos los músculos de la figura, por grupo. Es la alternativa a apuntar en
 * la imagen: se recorre con el teclado o un lector de pantalla y lleva a la
 * misma página que tocar el músculo.
 */
export function MuscleList() {
  return (
    <div className="grid gap-8">
      <Link
        className="inline-flex w-fit items-center gap-2 text-sm text-[var(--text-muted)] transition-colors hover:text-[var(--text)]"
        href="/exercises"
      >
        <ArrowLeft aria-hidden className="size-4" />
        Ejercicios
      </Link>
      <PageHeader
        description="Elige un músculo para ver los ejercicios que lo trabajan."
        eyebrow="Anatomía"
        title="Todos los músculos"
      />
      <div className="grid gap-8 md:grid-cols-2 xl:grid-cols-3">
        {musclesByGroup().map(({ group, muscles }) => (
          <section aria-labelledby={`group-${group.code}`} className="grid content-start gap-3" key={group.code}>
            <h2 className="data-label text-[var(--text-muted)]" id={`group-${group.code}`}>
              {group.name}
            </h2>
            <ul className="panel divide-y divide-[var(--border-subtle)] overflow-hidden">
              {muscles.map((muscle) => (
                <li key={muscle.code}>
                  <Link
                    className="group flex items-center gap-3 px-4 py-3 transition-colors duration-[var(--dur-1)] hover:bg-[var(--surface)] focus-visible:bg-[var(--surface)] focus-visible:outline-none"
                    href={`/exercises/muscle/${muscle.code}`}
                  >
                    <span className="min-w-0 flex-1">
                      <span className="block truncate font-semibold">{muscle.name}</span>
                      <span className="block truncate text-xs text-[var(--text-muted)]">{muscle.latinName}</span>
                    </span>
                    <ChevronRight
                      aria-hidden
                      className="size-4 shrink-0 text-[var(--text-disabled)] transition-transform duration-[var(--dur-1)] group-hover:translate-x-0.5"
                    />
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>
    </div>
  );
}
