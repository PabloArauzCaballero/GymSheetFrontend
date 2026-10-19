import { dayDividerLabel } from '@/features/chat/lib/chat-time';

/** Dos fechas ISO caen el mismo día (según la parte de fecha que manda el servidor). */
export function sameDay(a: string, b: string): boolean {
  return a.slice(0, 10) === b.slice(0, 10);
}

/** «Hoy», «Ayer» o la fecha entre dos líneas finas, encima del primer mensaje de cada día. */
export function DayDivider({ iso }: Readonly<{ iso: string }>) {
  return (
    <li className="my-4 flex items-center gap-3 self-stretch text-[11px] uppercase tracking-[0.08em] text-[var(--text-muted)]">
      <span aria-hidden className="h-px flex-1 bg-[var(--border-subtle)]" />
      {dayDividerLabel(iso)}
      <span aria-hidden className="h-px flex-1 bg-[var(--border-subtle)]" />
    </li>
  );
}
