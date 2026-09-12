import type { ReactNode } from 'react';
import { cn } from '@/shared/lib/cn';

type Tone = 'neutral' | 'success' | 'warning' | 'danger' | 'info';

const toneClasses: Record<Tone, string> = {
  neutral: 'border-[var(--border)] text-[var(--text-muted)]',
  success: 'border-[var(--success-border)] bg-[var(--success-bg)] text-[var(--success-text)]',
  warning: 'border-[var(--warning-border)] bg-[var(--warning-bg)] text-[var(--warning-text)]',
  danger: 'border-[var(--danger-border)] bg-[var(--danger-bg)] text-[var(--danger-text)]',
  info: 'border-[var(--info-border)] bg-[var(--info-bg)] text-[var(--info-text)]',
};

/**
 * El chip late.
 *
 * Va aqui, en el componente compartido, y no repetido en cada pantalla: es lo
 * unico que hace que «los chips laten en toda la aplicacion» siga siendo cierto
 * dentro de seis meses, cuando alguien añada el chip numero treinta y nueve sin
 * haber leido esto.
 *
 * `inline-flex` mas `transform` necesita un origen explicito: sin
 * `origin-center` el navegador escala desde la esquina que le toque segun el
 * contexto de linea y el chip cabecea en lugar de latir.
 *
 * `latido={false}` existe para el caso en que el chip esta dentro de algo que ya
 * se mueve —una tarjeta que entra, una baraja que se arrastra—: dos movimientos
 * superpuestos no suman, se pelean.
 */
const HEARTBEAT = 'motion-safe:animate-[chip-heartbeat_2.6s_ease-in-out_infinite] origin-center';

export function Badge({
  children,
  tone = 'neutral',
  className,
  latido = true,
}: Readonly<{ children: ReactNode; tone?: Tone; className?: string; latido?: boolean }>) {
  return (
    <span
      className={cn(
        'inline-flex min-h-6 items-center rounded-[var(--radius-sm)] border px-2 py-0.5 text-[11px] font-semibold uppercase tracking-[0.08em]',
        toneClasses[tone],
        latido ? HEARTBEAT : null,
        className,
      )}
    >
      {children}
    </span>
  );
}

/** La misma clase, para chips que por su sitio no pueden usar `Badge`. */
export const chipHeartbeat = HEARTBEAT;
