'use client';

import { ArrowLeft } from 'lucide-react';
import type { ReactNode } from 'react';
import { ButtonLink } from '@/shared/components/ui/button';
import { cn } from '@/shared/lib/cn';

export type ActivationStepId = 'reemplazo' | 'fechas' | 'modo' | 'datos' | 'resumen';

export const STEP_TITLES: Record<ActivationStepId, string> = {
  reemplazo: 'Programa actual',
  fechas: 'Fechas',
  modo: 'Modo',
  datos: 'Datos del modo',
  resumen: 'Resumen',
};

/**
 * Marco de la activación (RF-14): volver a la rutina, barra «Paso 2 de 4 · Fechas»,
 * título y la barra de acciones pegada abajo. Son pantallas, no un modal.
 */
export function ActivationFrame({
  steps,
  current,
  title,
  description,
  back,
  actions,
  info,
  children,
}: Readonly<{
  steps: readonly ActivationStepId[];
  current: number;
  title: string;
  description?: string;
  back: { href: string; label: string };
  actions: ReactNode;
  info?: string;
  children: ReactNode;
}>) {
  const step = steps[current] ?? steps[0]!;
  return (
    <div className="mx-auto grid w-full max-w-3xl grid-cols-[minmax(0,1fr)] gap-8">
      <div className="grid gap-5">
        <div>
          <ButtonLink href={back.href} variant="ghost">
            <ArrowLeft aria-hidden className="size-4" />
            {back.label}
          </ButtonLink>
        </div>
        <nav aria-label="Progreso de la activación" className="grid gap-2">
          <p aria-live="polite" className="text-sm font-semibold text-[var(--text-muted)]">
            {`Paso ${current + 1} de ${steps.length} · ${STEP_TITLES[step]}`}
          </p>
          <ol className="flex gap-1.5">
            {steps.map((id, index) => (
              <li className="flex-1" key={id}>
                <span
                  aria-current={index === current ? 'step' : undefined}
                  aria-label={`Paso ${index + 1}: ${STEP_TITLES[id]}${index === current ? ', actual' : ''}`}
                  className="flex h-6 items-center"
                  role="img"
                >
                  <span
                    aria-hidden
                    className={cn(
                      'block h-1.5 w-full rounded-full',
                      index <= current ? 'bg-[var(--volt)]' : 'bg-[var(--surface-high)]',
                      index < current && 'opacity-55',
                    )}
                  />
                </span>
              </li>
            ))}
          </ol>
        </nav>
        <header className="grid gap-2">
          <h1 className="display-title">{title}</h1>
          {description ? (
            <p className="text-sm leading-7 text-[var(--text-muted)] sm:text-base">{description}</p>
          ) : null}
        </header>
      </div>
      {children}
      <div
        aria-label="Acciones del asistente"
        className="sticky bottom-0 z-30 rounded-t-[var(--radius-lg)] border border-b-0 border-[var(--border-subtle)] bg-[var(--surface-low)] px-4 py-3 [padding-bottom:calc(0.75rem+env(safe-area-inset-bottom))]"
        data-testid="activation-actions"
        role="region"
      >
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p aria-live="polite" className="text-sm font-semibold text-[var(--text-muted)]">
            {info ?? ''}
          </p>
          <div className="flex flex-wrap gap-2">{actions}</div>
        </div>
      </div>
    </div>
  );
}
