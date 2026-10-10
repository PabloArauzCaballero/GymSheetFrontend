'use client';

import { ArrowLeft } from 'lucide-react';
import type { ReactNode } from 'react';
import { ButtonLink } from '@/shared/components/ui/button';
import { WizardProgress } from './wizard-progress';

/**
 * Marco común de las páginas del asistente: volver, barra de progreso, título y
 * una barra de acciones pegada abajo. Son páginas de verdad (nunca un diálogo),
 * así que el botón Atrás del navegador recorre los pasos.
 */
export function WizardFrame({
  paso,
  title,
  description,
  back,
  actions,
  info,
  children,
}: Readonly<{
  paso: number;
  title: string;
  description?: string;
  /** Destino de «Volver»; por omisión, la lista de rutinas. */
  back?: { href: string; label?: string };
  actions: ReactNode;
  /** Línea de contexto de la barra («4 días · 12 semanas», «5 ejercicios»). */
  info?: string;
  children: ReactNode;
}>) {
  return (
    <div className="mx-auto grid w-full max-w-3xl grid-cols-[minmax(0,1fr)] gap-8">
      <div className="grid gap-5">
        <div>
          <ButtonLink href={back?.href ?? '/routines'} variant="ghost">
            <ArrowLeft className="size-4" />
            {back?.label ?? 'Volver'}
          </ButtonLink>
        </div>
        <WizardProgress actual={paso} />
        <header className="grid gap-2">
          <h1 className="display-title">{title}</h1>
          {description ? (
            <p className="text-sm leading-7 text-[var(--text-muted)] sm:text-base">{description}</p>
          ) : null}
        </header>
      </div>
      {children}
      {/* Pegada al borde inferior de la ventana mientras el contenido es más alto que
          ella (`sticky`, no `fixed`: la página entra con una transformación que
          convertiría a `fixed` en relativa a su propio contenedor). */}
      <div
        aria-label="Acciones del asistente"
        className="sticky bottom-0 z-30 rounded-t-[var(--radius-lg)] border border-b-0 border-[var(--border-subtle)] bg-[var(--surface-low)] px-4 py-3 [padding-bottom:calc(0.75rem+env(safe-area-inset-bottom))]"
        data-testid="wizard-actions"
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
