'use client';

import type { ReactNode } from 'react';
import { Activity, BarChart3, ShieldCheck } from 'lucide-react';
import { useBrand } from '@/shared/theme/brand-provider';
import { AmbientBackground } from '@/shared/components/background/ambient-background';

export function AuthFrame({
  eyebrow,
  title,
  description,
  children,
}: Readonly<{ eyebrow: string; title: string; description: string; children: ReactNode }>) {
  const brand = useBrand();
  return (
    <main className="relative isolate grid min-h-dvh lg:grid-cols-[minmax(0,1.1fr)_minmax(420px,0.9fr)]">
      <AmbientBackground variant="auth" reactive fixed />
      <section className="relative hidden border-r border-[var(--border-subtle)] bg-[color-mix(in_srgb,var(--surface-sidebar)_82%,transparent)] p-12 backdrop-blur-sm lg:flex lg:flex-col lg:justify-between xl:p-16">
        <div className="inline-flex items-center gap-3 text-lg font-semibold tracking-[-0.02em]">
          <span className="grid size-9 place-items-center rounded-[4px] bg-[var(--volt)] text-sm text-[var(--accent-contrast)]">
            {brand.monogram}
          </span>
          {brand.wordmark}
        </div>
        <div className="max-w-2xl">
          <p className="data-label text-[var(--accent-ink)]">Elite performance system</p>
          <h2 className="mt-5 text-5xl font-semibold leading-[1.03] tracking-[-0.022em] xl:text-7xl">
            Cada serie.
            <br />
            Cada decisión.
            <br />
            Sin fricción.
          </h2>
          <p className="mt-7 max-w-xl text-lg leading-8 text-[var(--text-muted)]">
            Registra peso, repeticiones, RIR, descanso y énfasis con la precisión de una herramienta
            profesional.
          </p>
        </div>
        <div className="stagger grid grid-cols-3 gap-4">
          {[
            { icon: Activity, label: 'Entrenamiento', detail: 'Registro en vivo' },
            { icon: BarChart3, label: 'Progreso', detail: 'Historial verificable' },
            { icon: ShieldCheck, label: 'Seguridad', detail: 'Sesión protegida' },
          ].map(({ icon: Icon, label, detail }) => (
            <div
              className="hover-lift group rounded-[8px] border border-[var(--border-subtle)] bg-[var(--surface-lowest)] p-4"
              key={label}
            >
              <span className="grid size-9 place-items-center rounded-[6px] border border-[var(--border-subtle)] bg-[var(--surface-low)] text-[var(--accent-ink)] transition-transform duration-300 group-hover:scale-110">
                <Icon className="size-5" />
              </span>
              <p className="mt-5 text-sm font-bold">{label}</p>
              <p className="mt-1 text-xs text-[var(--text-muted)]">{detail}</p>
            </div>
          ))}
        </div>
      </section>
      <section className="relative flex items-center justify-center px-5 py-10 sm:px-8 lg:px-12">
        <div className="reveal w-full max-w-md">
          <div className="mb-10 lg:hidden">
            <div className="inline-flex items-center gap-3 text-lg font-semibold tracking-[-0.02em]">
              <span className="grid size-9 place-items-center rounded-[6px] bg-[var(--volt)] text-sm text-[var(--accent-contrast)] shadow-[0_8px_24px_-8px_rgb(var(--accent-channels)/0.7)]">
                {brand.monogram}
              </span>
              {brand.wordmark}
            </div>
          </div>
          <p className="data-label inline-flex items-center gap-2 text-[var(--accent-ink)]">
            <span
              aria-hidden
              className="h-3 w-1 rounded-full bg-[var(--volt)] shadow-[0_0_8px_var(--volt)]"
            />
            {eyebrow}
          </p>
          <h1 className="mt-4 text-4xl font-semibold tracking-[-0.022em]">{title}</h1>
          <p className="mt-4 text-sm leading-7 text-[var(--text-muted)]">{description}</p>
          <div className="mt-8">{children}</div>
        </div>
      </section>
    </main>
  );
}
