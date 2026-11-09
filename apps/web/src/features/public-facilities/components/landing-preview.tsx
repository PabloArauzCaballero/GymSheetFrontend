import type { WeekDot } from '@gymsheet/hooks';
import { Flame, Play } from 'lucide-react';
import { ProgressStrip } from '@/features/home/components/progress-strip';
import { HeroSurface } from '@/shared/components/mobile/hero-surface';
import { WeekDots } from '@/shared/components/mobile/week-dots';
import { metricInk } from '@/shared/theme/metric-colors';

/** Una semana de ejemplo: tres días hechos, dos por entrenar, hoy jueves. */
const SAMPLE_WEEK: WeekDot[] = [
  { key: '1', initial: 'L', label: 'Lunes', state: 'done' },
  { key: '2', initial: 'M', label: 'Martes', state: 'rest' },
  { key: '3', initial: 'X', label: 'Miércoles', state: 'done' },
  { key: '4', initial: 'J', label: 'Jueves', state: 'training', today: true },
  { key: '5', initial: 'V', label: 'Viernes', state: 'done' },
  { key: '6', initial: 'S', label: 'Sábado', state: 'training' },
  { key: '7', initial: 'D', label: 'Domingo', state: 'rest' },
];

/**
 * La portada enseña la app de verdad: «Hoy» y «Tu semana» de Inicio, pintados
 * con los mismos componentes que el portal (no una maqueta dibujada aparte).
 * Los datos son de ejemplo y el bloque es una ilustración: no es interactivo
 * y el lector de pantalla lo anuncia como tal.
 */
export function LandingPreview() {
  return (
    <div
      aria-label="Ejemplo de la pantalla de Inicio de REPP"
      className="pointer-events-none mx-auto grid w-full min-w-0 max-w-[400px] select-none gap-4 rounded-[36px] border border-[var(--border-subtle)] bg-[var(--background)] p-3 shadow-[var(--shadow-lg)] sm:p-5"
      role="img"
    >
      <div aria-hidden className="grid gap-4">
        <div className="grid gap-0.5 px-1 pt-1">
          <p className="display-title text-[28px] sm:text-[30px]">Hola, Ana</p>
          <p className="t-subhead text-[var(--text-muted)]">jueves, 12 de noviembre</p>
        </div>

        <HeroSurface watermark>
          <p className="t-footnote text-[var(--text-muted)]">Hoy · Semana 3 de 8</p>
          <p className="title-text">Pierna y glúteo</p>
          <p className="t-subhead tabular-nums text-[var(--text-muted)]">Hipertrofia 4 días · 6 ejercicios · ≈55 min</p>
          <span className="inline-flex min-h-12 items-center justify-center gap-2 rounded-[var(--radius-lg)] bg-[linear-gradient(135deg,color-mix(in_srgb,var(--volt)_78%,white)_0%,var(--volt)_100%)] px-5 text-[17px] font-semibold text-[var(--accent-contrast)] shadow-[0_10px_28px_-8px_color-mix(in_srgb,var(--volt)_55%,transparent)]">
            <Play className="size-4" />
            Entrenar hoy
          </span>
        </HeroSurface>

        <div className="grid gap-3 px-1">
          <p className="t-headline">Tu semana</p>
          <div className="grid gap-0.5">
            <p className="flex items-baseline gap-2">
              <span className="t-hero">3</span>
              <span className="title-text tabular-nums text-[var(--text-muted)]">de 4 entrenos</span>
            </p>
            <p className="t-footnote flex items-center gap-1 tabular-nums text-[var(--text-muted)]">
              <Flame className="size-4" style={{ color: metricInk.streak }} />6 semanas seguidas
            </p>
          </div>
          <WeekDots compact days={SAMPLE_WEEK} quiet />
          <ProgressStrip
            figures={[
              { key: 'carga', value: '12,4 t', label: 'Carga esta semana', delta: { label: '+8 %', direction: 'up' } },
              { key: 'mes', value: '14', label: 'Sesiones en 4 semanas' },
            ]}
          />
        </div>
      </div>
    </div>
  );
}
