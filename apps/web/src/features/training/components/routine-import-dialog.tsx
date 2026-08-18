'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Upload } from 'lucide-react';
import { useState } from 'react';
import { notify } from '@/shared/notifications';
import {
  trainingService,
  type ImportRoutinePayload,
  type RoutineExerciseInput,
} from '@/features/training/services/training-service';
import { queryKeys } from '@/shared/api/query-keys';
import { Button } from '@/shared/components/ui/button';
import { Dialog, DialogClose, DialogContent, DialogTrigger } from '@/shared/components/ui/dialog';
import { Field } from '@/shared/components/ui/field';
import { Textarea } from '@/shared/components/ui/textarea';
import { parseCsv } from '@/shared/lib/data-transfer';

function numberOrNull(value: string | undefined): number | null {
  if (value == null || value.trim() === '') return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

/** Groups flat CSV rows (one exercise per row) into routines keyed by `rutina`. */
function groupCsvRoutines(rows: Record<string, string>[]): ImportRoutinePayload[] {
  const byName = new Map<string, ImportRoutinePayload>();
  rows.forEach((row, index) => {
    const routineName = (row.rutina ?? row.nombre ?? '').trim();
    const exerciseName = (row.ejercicio ?? row.ejercicioNombre ?? '').trim();
    if (!routineName || !exerciseName) {
      throw new Error(`Fila ${index + 1}: se requieren columnas "rutina" y "ejercicio".`);
    }
    if (!byName.has(routineName)) {
      byName.set(routineName, { nombre: routineName, ejercicios: [] });
    }
    const exercise: RoutineExerciseInput = {
      ejercicioNombre: exerciseName,
      orden: Number(row.orden) || byName.get(routineName)!.ejercicios.length + 1,
      seriesObjetivo: numberOrNull(row.series ?? row.seriesObjetivo) ?? 3,
      repsMin: numberOrNull(row.reps_min ?? row.repsMin),
      repsMax: numberOrNull(row.reps_max ?? row.repsMax),
      pesoObjetivoKg: numberOrNull(row.peso_kg ?? row.pesoObjetivoKg),
      rirObjetivo: numberOrNull(row.rir ?? row.rirObjetivo),
      descansoSeg: numberOrNull(row.descanso_seg ?? row.descansoSeg),
      nota: (row.nota ?? '').trim() || null,
    };
    byName.get(routineName)!.ejercicios.push(exercise);
  });
  return [...byName.values()];
}

function parseRoutines(raw: string): ImportRoutinePayload[] {
  const trimmed = raw.trim();
  if (!trimmed) throw new Error('Pega o carga contenido JSON o CSV.');
  if (trimmed.startsWith('{') || trimmed.startsWith('[')) {
    const parsed = JSON.parse(trimmed) as unknown;
    const list = Array.isArray(parsed)
      ? parsed
      : ((parsed as { rutinas?: unknown[] }).rutinas ?? []);
    if (!Array.isArray(list) || list.length === 0) {
      throw new Error('El JSON debe ser un arreglo de rutinas o { "rutinas": [...] }.');
    }
    return list as ImportRoutinePayload[];
  }
  return groupCsvRoutines(parseCsv(trimmed));
}

export function RoutineImportDialog() {
  const [open, setOpen] = useState(false);
  const [raw, setRaw] = useState('');
  const [error, setError] = useState<string | null>(null);
  const queryClient = useQueryClient();

  const run = useMutation({
    mutationFn: () => trainingService.import(parseRoutines(raw)),
    onSuccess: async (result) => {
      await queryClient.invalidateQueries({ queryKey: queryKeys.routines('mine') });
      const failures = result.resultados.filter((item) => !item.creada);
      if (failures.length === 0) {
        notify.success(`${result.creadas} rutinas importadas.`);
        setRaw('');
        setOpen(false);
      } else {
        notify.warning(`${result.creadas} creadas, ${failures.length} con error.`);
        setError(failures.map((f) => `${f.nombre}: ${f.error}`).slice(0, 8).join('\n'));
      }
    },
    onError: (cause: Error) => setError(cause.message),
  });

  return (
    <Dialog onOpenChange={setOpen} open={open}>
      <DialogTrigger asChild>
        <Button variant="secondary">
          <Upload className="size-4" />
          Carga masiva
        </Button>
      </DialogTrigger>
      <DialogContent
        description="JSON: arreglo de { nombre, ejercicios:[{ ejercicioNombre, orden, seriesObjetivo, repsMin, repsMax, pesoObjetivoKg, rirObjetivo, descansoSeg }] }. CSV: filas con columnas rutina, ejercicio, orden, series, reps_min, reps_max, peso_kg, rir, descanso_seg."
        title="Importar rutinas"
      >
        <div className="grid gap-4">
          <Field htmlFor="routine-import" label="Contenido JSON o CSV">
            <Textarea
              id="routine-import"
              className="min-h-44 font-mono text-xs"
              onChange={(event) => setRaw(event.target.value)}
              placeholder={
                'rutina,ejercicio,orden,series,reps_min,reps_max,descanso_seg\nPush A,Press banca,1,4,6,8,120\nPush A,Press militar,2,3,8,10,90'
              }
              value={raw}
            />
          </Field>
          {error ? (
            <pre className="max-h-40 overflow-auto whitespace-pre-wrap rounded-[4px] border border-[var(--danger-border)] bg-[var(--danger-surface)] p-3 text-xs text-[var(--danger-text)]">
              {error}
            </pre>
          ) : null}
          <div className="flex justify-end gap-2">
            <DialogClose asChild>
              <Button type="button" variant="ghost">
                Cerrar
              </Button>
            </DialogClose>
            <Button
              loading={run.isPending}
              onClick={() => {
                setError(null);
                run.mutate();
              }}
              variant="primary"
            >
              Importar
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
