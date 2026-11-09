import { cn } from '@/shared/lib/cn';

export type Choice = { value: string; title: string; hint?: string };

/**
 * Grupo de opciones excluyentes presentado como tarjetas. Es un `radio` nativo:
 * se envía con el formulario, se recorre con flechas y lo anuncia el lector de
 * pantalla, sin estado propio.
 */
export function ChoiceCards({
  name,
  legend,
  choices,
  defaultValue,
  columns = 3,
}: Readonly<{
  name: string;
  legend: string;
  choices: readonly Choice[];
  defaultValue?: string;
  columns?: 2 | 3 | 4;
}>) {
  return (
    <fieldset className="grid gap-2">
      <legend className="data-label mb-2">{legend}</legend>
      <div
        className={cn(
          'grid gap-2',
          columns === 2 && 'sm:grid-cols-2',
          columns === 3 && 'sm:grid-cols-3',
          columns === 4 && 'sm:grid-cols-2 lg:grid-cols-4',
        )}
      >
        {choices.map((choice, index) => (
          <label className="choice-card" key={choice.value}>
            <input
              className="sr-only"
              defaultChecked={defaultValue ? choice.value === defaultValue : index === 0}
              name={name}
              required
              type="radio"
              value={choice.value}
            />
            <span className="text-sm font-semibold">{choice.title}</span>
            {choice.hint ? (
              <span className="text-xs leading-5 text-[var(--text-muted)]">{choice.hint}</span>
            ) : null}
          </label>
        ))}
      </div>
    </fieldset>
  );
}
