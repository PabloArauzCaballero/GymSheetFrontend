import type { ReactNode } from 'react';

/** Resumen de solo lectura para el paso final de revisión. */
export function WizardSummary({
  items,
}: Readonly<{ items: readonly { label: string; value: ReactNode }[] }>) {
  return (
    <dl className="grid gap-px overflow-hidden rounded-[6px] border border-[var(--border)] bg-[var(--border-subtle)] sm:grid-cols-2">
      {items.map((item) => (
        <div
          className="grid gap-1 bg-[var(--surface-lowest)] px-4 py-3 sm:[&:last-child:nth-child(odd)]:col-span-2"
          key={item.label}
        >
          <dt className="data-label">{item.label}</dt>
          <dd className="m-0 break-words text-sm font-semibold">{item.value || '—'}</dd>
        </div>
      ))}
    </dl>
  );
}

/** Lee un campo de texto del resumen sin arrastrar `File` ni `null`. */
export function textOf(values: FormData, name: string): string {
  const value = values.get(name);
  return typeof value === 'string' ? value.trim() : '';
}
