'use client';

import { useQuery } from '@tanstack/react-query';
import { Plus, Search } from 'lucide-react';
import { useState } from 'react';
import { Button } from '@/shared/components/ui/button';
import { Input } from '@/shared/components/ui/input';
import { z } from 'zod';
import { apiRequest } from '@/shared/api/api-client';

export type PickedExercise = { id: string; nombre: string };

/**
 * Sólo lo que el buscador pinta, y con el id como texto.
 *
 * No se usa el esquema compartido de `Exercise`: exige UUID estricto y el
 * catálogo trae ejercicios sembrados con ids como `00000000-…-00e2`, que ese
 * esquema rechaza y tumbaría toda la página de resultados. El backend valida el
 * id al crear la rutina, que es donde importa.
 */
const exerciseHitsSchema = z.object({
  items: z.array(z.object({ id: z.string().min(1), nombre: z.string(), grupoMuscular: z.string() })),
});

/**
 * Busca en el catálogo de ejercicios y devuelve el elegido.
 *
 * Reutiliza `exerciseService.list`, el mismo que alimenta la pantalla de
 * ejercicios. No hay un selector compartido que sirva aquí (el de máquinas es
 * de equipamiento), y montar uno completo para una rutina oficial sería más
 * código que el formulario.
 */
export function ExerciseSearch({
  onPick,
}: Readonly<{ onPick: (exercise: PickedExercise) => void }>) {
  const [term, setTerm] = useState('');
  const search = term.trim();
  const results = useQuery({
    queryKey: ['sistema', 'rutinas-repp', 'ejercicios', search],
    queryFn: () =>
      apiRequest(
        `/exercises?${new URLSearchParams({ search, pageSize: '6' }).toString()}`,
        exerciseHitsSchema,
        { method: 'GET' },
      ),
    enabled: search.length >= 2,
  });

  return (
    <div className="flex flex-col gap-2">
      <div className="relative">
        <Search
          aria-hidden
          className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-[var(--text-muted)]"
        />
        <Input
          aria-label="Buscar ejercicio"
          className="pl-9"
          onChange={(event) => setTerm(event.target.value)}
          placeholder="Buscar ejercicio para añadir…"
          value={term}
        />
      </div>
      {search.length >= 2 && results.data ? (
        results.data.items.length === 0 ? (
          <p className="text-sm text-[var(--text-muted)]">Ningún ejercicio coincide.</p>
        ) : (
          <ul className="flex flex-col gap-1">
            {results.data.items.map((exercise) => (
              <li className="flex items-center justify-between gap-2" key={exercise.id}>
                <span className="min-w-0 truncate text-sm">
                  {exercise.nombre}
                  <span className="text-[var(--text-muted)]"> · {exercise.grupoMuscular}</span>
                </span>
                <Button
                  aria-label={`Añadir ${exercise.nombre}`}
                  onClick={() => {
                    onPick({ id: exercise.id, nombre: exercise.nombre });
                    setTerm('');
                  }}
                  size="icon"
                  type="button"
                  variant="ghost"
                >
                  <Plus aria-hidden className="size-4" />
                </Button>
              </li>
            ))}
          </ul>
        )
      ) : null}
    </div>
  );
}
