'use client';

import { useQuery } from '@tanstack/react-query';
import { Check, Cog, Loader2 } from 'lucide-react';
import { useEffect, useMemo, useRef } from 'react';
import { personalExerciseService } from '@/features/progression/services/progression-service';
import { apiRequest } from '@/shared/api/api-client';
import { muscleCatalogSchema } from '@/shared/api/schemas';
import type { MuscleCatalogEntry, MuscleEquipmentInference } from '@/shared/api/schemas';
import { Field } from '@/shared/components/ui/field';
import { Select } from '@/shared/components/ui/select';
import { cn } from '@/shared/lib/cn';

const muscleCatalogService = {
  list: () => apiRequest<MuscleCatalogEntry[]>('/muscles', muscleCatalogSchema),
};

/**
 * Elige el músculo; la máquina la pone el catálogo.
 *
 * Es la forma corta de crear un ejercicio propio: en vez de teclear grupo
 * muscular, parte del cuerpo y equipamiento —tres campos que la mayoría rellena
 * a ojo y de forma inconsistente—, se elige lo único que la persona sabe con
 * certeza, qué quiere entrenar, y el resto se deduce.
 *
 * La deducción es del servidor y no de aquí: sale de contar con qué se entrena
 * ese músculo en los 1.300 ejercicios del catálogo. Una tabla músculo→máquina
 * escrita en el cliente sería una opinión, y quedaría desfasada en cuanto el
 * catálogo se sincronizara con su origen.
 *
 * Nada de esto bloquea: los campos que rellena siguen siendo editables debajo,
 * y quien quiera poner otra cosa la pone.
 */
export function MuscleMachinePicker({
  value,
  selectedEquipmentLabel,
  onSelect,
}: Readonly<{
  /** Código del músculo elegido, o cadena vacía. */
  value: string;
  /**
   * Etiqueta de equipamiento vigente en el formulario. Se recibe en vez de
   * guardarse aquí para que la ficha marcada sea siempre la que se va a enviar:
   * con dos copias del estado, elegir una alternativa dejaba resaltada la
   * sugerida y enviaba la otra.
   */
  selectedEquipmentLabel?: string;
  /** Recibe la deducción completa para que el formulario rellene sus campos. */
  onSelect: (muscleCode: string, inference: MuscleEquipmentInference | null) => void;
}>) {
  const muscles = useQuery({
    queryKey: ['muscles', 'catalog'],
    queryFn: muscleCatalogService.list,
    // El catálogo anatómico no cambia entre visitas; volver a pedirlo en cada
    // montaje solo añade una espera antes de poder elegir.
    staleTime: 60 * 60 * 1000,
  });

  const inference = useQuery({
    queryKey: ['equipment-suggestion', value],
    queryFn: () => personalExerciseService.suggestEquipment(value),
    enabled: value !== '',
  });

  /** Agrupados por región para que la lista de 36 se pueda recorrer. */
  const grouped = useMemo(() => {
    const byGroup = new Map<string, MuscleCatalogEntry[]>();
    for (const muscle of muscles.data ?? []) {
      const bucket = byGroup.get(muscle.grupo.nombre) ?? [];
      bucket.push(muscle);
      byGroup.set(muscle.grupo.nombre, bucket);
    }
    return [...byGroup.entries()];
  }, [muscles.data]);

  const suggestion = inference.data;

  /**
   * Avisa al formulario en cuanto llega la deducción.
   *
   * `onSelect` se dispara dos veces por músculo a propósito: primero al cambiar
   * el selector, con `null`, para que el formulario olvide lo anterior mientras
   * se consulta; y otra vez aquí, con el resultado. Sin la segunda llamada los
   * campos se quedarían vacíos, porque al soltar el selector todavía no se sabe
   * con qué se entrena ese músculo.
   *
   * El `ref` evita repetirla en cada render: react-query devuelve el mismo
   * objeto mientras el dato esté fresco, y sin el guardia el formulario
   * sobrescribiría lo que la persona estuviera escribiendo.
   */
  const notifiedFor = useRef<string | null>(null);
  useEffect(() => {
    if (!suggestion || suggestion.muscleCode !== value) return;
    if (notifiedFor.current === value) return;
    notifiedFor.current = value;
    onSelect(value, suggestion);
  }, [onSelect, suggestion, value]);

  return (
    <div className="grid gap-4">
      <Field
        hint="Elige qué músculo trabaja el ejercicio y completamos el resto por ti."
        htmlFor="muscleCode"
        label="Músculo entrenado"
      >
        <Select
          disabled={muscles.isLoading}
          id="muscleCode"
          onChange={(event) => {
            const code = event.target.value;
            // Se avisa ya con `null` para que el formulario limpie lo anterior;
            // la deducción llega en cuanto responde el servidor, en el efecto
            // de arriba.
            notifiedFor.current = null;
            onSelect(code, null);
          }}
          value={value}
        >
          <option value="">Prefiero escribirlo a mano</option>
          {grouped.map(([groupName, entries]) => (
            <optgroup key={groupName} label={groupName}>
              {entries.map((muscle) => (
                <option key={muscle.code} value={muscle.code}>
                  {muscle.nombre}
                </option>
              ))}
            </optgroup>
          ))}
        </Select>
      </Field>

      {value === '' ? null : (
        <div className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface-low)] p-5">
          {inference.isLoading ? (
            <p className="flex items-center gap-2 text-sm text-[var(--text-muted)]">
              <Loader2 aria-hidden className="h-4 w-4 animate-spin" />
              Buscando con qué se entrena ese músculo…
            </p>
          ) : inference.isError || !suggestion ? (
            <p className="text-sm text-[var(--text-muted)]">
              No pudimos deducir el equipamiento. Puedes indicarlo tú abajo.
            </p>
          ) : suggestion.primary === null ? (
            // No se inventa una máquina: se dice que no hay dato y se deja
            // elegir a mano, que es información honesta y no un error.
            <p className="text-sm text-[var(--text-muted)]">
              Ese músculo todavía no tiene ejercicios en el catálogo, así que no
              podemos deducir la máquina. Indícala tú abajo.
            </p>
          ) : (
            <div className="grid gap-4">
              <div className="flex items-center gap-3">
                <span className="grid size-10 shrink-0 place-items-center rounded-xl border border-[var(--border-subtle)] bg-[var(--surface-high)] text-[var(--accent-ink)]">
                  <Cog aria-hidden className="h-5 w-5" />
                </span>
                <div className="grid min-w-0 gap-0.5">
                  <span className="data-label">Máquina determinada</span>
                  <span className="truncate text-base font-semibold text-[var(--text)]">
                    {suggestion.primary.name}
                  </span>
                </div>
              </div>
              <p className="text-xs leading-5 text-[var(--text-muted)]">
                {`Es lo que usan ${suggestion.primary.exerciseCount} de los ejercicios del catálogo para ${suggestion.muscleName.toLowerCase()} (${Math.round(suggestion.primary.share * 100)} %). También clasificamos el ejercicio en ${suggestion.muscleGroupName}.`}
              </p>

              {suggestion.alternatives.length > 0 ? (
                <div className="grid gap-2">
                  <span className="data-label">O elige otra</span>
                  <div className="flex flex-wrap gap-2">
                    {[suggestion.primary, ...suggestion.alternatives].map((option) => {
                      const active =
                        option.label === (selectedEquipmentLabel ?? suggestion.primary?.label);
                      return (
                        <button
                          aria-pressed={active}
                          className={cn(
                            'inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs transition-colors',
                            active
                              ? 'border-[var(--volt)] bg-[color-mix(in_srgb,var(--volt)_14%,transparent)] text-[var(--text)]'
                              : 'border-[var(--border-subtle)] text-[var(--text-muted)] hover:border-[var(--border)] hover:text-[var(--text)]',
                          )}
                          key={option.label}
                          onClick={() => {
                            // Elección manual: se marca como ya notificada para
                            // que el efecto no la deshaga en el render siguiente.
                            notifiedFor.current = value;
                            onSelect(value, { ...suggestion, primary: option });
                          }}
                          type="button"
                        >
                          {active ? <Check aria-hidden className="h-3 w-3" /> : null}
                          {option.name}
                        </button>
                      );
                    })}
                  </div>
                </div>
              ) : null}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
