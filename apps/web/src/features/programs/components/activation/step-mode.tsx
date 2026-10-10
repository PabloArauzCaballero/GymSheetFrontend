import { Gauge, Target, TrendingUp } from 'lucide-react';
import type { ProgramMode } from '@gymsheet/types';
import { Checkbox } from '@/shared/components/ui/checkbox';
import { cn } from '@/shared/lib/cn';

const MODES: Array<{ value: ProgramMode; title: string; text: string; Icon: typeof Gauge }> = [
  { value: 'NONE', title: 'Normal', text: 'Sigue la rutina tal cual.', Icon: Gauge },
  {
    value: 'PROGRESSIVE_OVERLOAD',
    title: 'Sobrecarga progresiva',
    text: 'La app sube el peso cuando estás listo. Multiplicador de puntos semanal.',
    Icon: TrendingUp,
  },
  {
    value: 'STRENGTH_GOALS',
    title: 'Metas de marca',
    text: 'Elige 1 a 3 levantamientos y una meta. Insignia al lograrla.',
    Icon: Target,
  },
];

/** A3 · tres tarjetas con lo que pide y lo que da cada modo, y la casilla del plan de cardio. */
export function StepMode({
  mode,
  conCardio,
  onMode,
  onCardio,
}: Readonly<{
  mode: ProgramMode;
  conCardio: boolean;
  onMode: (mode: ProgramMode) => void;
  onCardio: (value: boolean) => void;
}>) {
  return (
    <div className="grid gap-6">
      <fieldset className="grid gap-3">
        <legend className="sr-only">Modo del programa</legend>
        {MODES.map(({ value, title, text, Icon }) => (
          <label
            className={cn(
              'flex cursor-pointer items-start gap-4 rounded-[var(--radius-md)] border bg-[var(--surface-low)] p-4 has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-[var(--volt)]',
              mode === value ? 'border-[var(--volt)] bg-[rgb(var(--accent-channels)/0.1)]' : 'border-[var(--border)]',
            )}
            key={value}
          >
            <input
              checked={mode === value}
              className="mt-1 size-4 accent-[var(--volt)]"
              name="modo"
              onChange={() => onMode(value)}
              type="radio"
              value={value}
            />
            <Icon aria-hidden className="mt-0.5 size-5 shrink-0 text-[var(--accent-ink)]" />
            <span className="grid gap-0.5">
              <span className="font-semibold">{title}</span>
              <span className="text-sm text-[var(--text-muted)]">{text}</span>
            </span>
          </label>
        ))}
      </fieldset>
      <Checkbox
        checked={conCardio}
        label="Añadir un plan de cardio después de activar"
        onChange={(event) => onCardio(event.target.checked)}
      />
    </div>
  );
}
