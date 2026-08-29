'use client';

/**
 * El estado elegido se marcaba sólo con `--surface-high` y un borde volt. En tema
 * claro eso es #f0f1ec sobre una tarjeta blanca (1.06:1) más un borde de 1.29:1:
 * ninguno llega al 3:1 que pide WCAG 1.4.11 para el estado de un control, así que
 * no se distinguía qué habías marcado. El tinte de volt sí se lee en ambos temas
 * —es el mismo recurso que usa `muscle-machine-picker`— y respeta la regla de
 * Kelly de reservar `--volt` para rellenos.
 */
export function ChoiceGroup({
  options,
  selected,
  setSelected,
}: Readonly<{ options: string[]; selected: string[]; setSelected: (items: string[]) => void }>) {
  return (
    <div className="grid grid-cols-1 gap-3 min-[400px]:grid-cols-2 sm:grid-cols-3">
      {options.map((item) => (
        <button
          /* `aria-pressed` es lo único que le cuenta a un lector de pantalla que
             esta opción está elegida: sin él, el estado sólo existía en el color. */
          aria-pressed={selected.includes(item)}
          className={`min-h-12 rounded-lg border px-3 text-sm ${selected.includes(item) ? 'border-[var(--volt)] bg-[color-mix(in_srgb,var(--volt)_14%,transparent)]' : 'border-[var(--border-subtle)]'}`}
          key={item}
          onClick={() =>
            setSelected(
              selected.includes(item)
                ? selected.filter((value) => value !== item)
                : [...selected, item],
            )
          }
          type="button"
        >
          {item}
        </button>
      ))}
    </div>
  );
}
