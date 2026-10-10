'use client';

import { WIZARD_STEPS } from '@gymsheet/hooks';
import Link from 'next/link';
import { cn } from '@/shared/lib/cn';
import { wizardStepPath } from '../paths';

/**
 * Barra de progreso del asistente: «Paso 2 de 6 · Descripción» y un segmento por
 * paso. Los pasos ya recorridos son enlaces (se puede volver a ellos); los que
 * faltan no, porque llegar a ellos sin pasar por los anteriores saltaría sus
 * validaciones. El paso actual lleva `aria-current="step"`.
 */
export function WizardProgress({ actual }: Readonly<{ actual: number }>) {
  const current = WIZARD_STEPS[actual] ?? WIZARD_STEPS[0];
  return (
    <nav aria-label="Progreso de la rutina" className="grid gap-2">
      <p aria-live="polite" className="text-sm font-semibold text-[var(--text-muted)]">
        {`Paso ${actual + 1} de ${WIZARD_STEPS.length} · ${current.titulo}`}
      </p>
      <ol className="grid grid-cols-6 gap-1.5">
        {WIZARD_STEPS.map((step, index) => {
          const reached = index <= actual;
          const bar = (
            <span
              aria-hidden
              className={cn(
                'block h-1.5 w-full rounded-full transition-colors',
                reached ? 'bg-[var(--volt)]' : 'bg-[var(--surface-high)]',
                reached && index !== actual && 'opacity-55',
              )}
            />
          );
          return (
            <li key={step.id}>
              {index < actual ? (
                <Link
                  aria-label={`Volver al paso ${index + 1}: ${step.titulo}`}
                  className="flex h-11 items-center focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--volt)]"
                  href={wizardStepPath(index)}
                >
                  {bar}
                </Link>
              ) : (
                <span
                  aria-current={index === actual ? 'step' : undefined}
                  aria-label={`Paso ${index + 1}: ${step.titulo}${index === actual ? ', actual' : ''}`}
                  className="flex h-11 items-center"
                  role="img"
                >
                  {bar}
                </span>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
