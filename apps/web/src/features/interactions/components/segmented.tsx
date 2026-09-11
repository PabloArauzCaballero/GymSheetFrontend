'use client';

/**
 * Conmutador de dos vistas del mismo tipo de dato (recibidos / enviados).
 *
 * No son pestañas de la página —esas ya existen un nivel arriba— sino dos
 * caras de la misma lista, así que se pintan como un control y no como otra
 * fila de pestañas: dos jerarquías de pestañas seguidas dejan de leerse.
 *
 * Semánticamente son botones con `aria-pressed`, no `role="tab"`: una pestaña
 * de verdad exige `tabpanel`, `aria-controls` y navegación con flechas, y
 * prometer eso sin cumplirlo deja al lector de pantalla buscando un panel que
 * no existe.
 */
export function Segmented<Value extends string>({
  onChange,
  options,
  value,
}: Readonly<{
  onChange: (value: Value) => void;
  options: ReadonlyArray<{ value: Value; label: string; count?: number }>;
  value: Value;
}>) {
  return (
    <div
      aria-label="Cambiar de lista"
      className="inline-flex w-fit max-w-full gap-1 overflow-x-auto rounded-full border border-[var(--border-subtle)] bg-[var(--surface-low)] p-1"
      role="group"
    >
      {options.map((option) => {
        const active = option.value === value;
        return (
          <button
            aria-pressed={active}
            className={`min-h-11 shrink-0 rounded-full px-4 text-sm transition-colors duration-[var(--dur-2)] ${
              active
                ? 'bg-[var(--volt)] font-semibold text-[var(--accent-contrast)]'
                : 'font-medium text-[var(--text-muted)] hover:text-[var(--text)]'
            }`}
            key={option.value}
            onClick={() => onChange(option.value)}
            type="button"
          >
            {option.label}
            {option.count !== undefined ? (
              <span
                className={
                  active
                    ? 'ml-1.5 tabular-nums'
                    : 'ml-1.5 tabular-nums text-[var(--text-disabled)]'
                }
              >
                {option.count}
              </span>
            ) : null}
          </button>
        );
      })}
    </div>
  );
}
