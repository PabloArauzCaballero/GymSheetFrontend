import type { ReactNode } from 'react';
import { ReppMark } from '@/shared/components/brand/brand-mark';
import { cn } from '@/shared/lib/cn';

/**
 * La superficie protagonista (`HeroSurface` del móvil): tarjeta elevada (e2)
 * de radio 24 con un resplandor estático del acento en diagonal y, si se pide,
 * el isotipo como marca de agua. Una por pantalla.
 */
export function HeroSurface({
  children,
  watermark = false,
  className,
}: Readonly<{ children: ReactNode; watermark?: boolean; className?: string }>) {
  return (
    <div
      className={cn(
        'relative isolate grid gap-3 overflow-hidden rounded-[var(--radius-2xl)] bg-[var(--surface-high)] p-5 shadow-[var(--shadow-md)]',
        className,
      )}
    >
      <span
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-10"
        style={{
          background:
            'linear-gradient(135deg, color-mix(in srgb, var(--volt) 34%, transparent) 0%, color-mix(in srgb, var(--volt) 10%, transparent) 45%, transparent 100%)',
        }}
      />
      {watermark ? (
        <span aria-hidden className="pointer-events-none absolute -bottom-6 -right-6 -z-10 opacity-[0.05]">
          <ReppMark ink="var(--text)" size={168} tick="var(--text)" />
        </span>
      ) : null}
      {children}
    </div>
  );
}
