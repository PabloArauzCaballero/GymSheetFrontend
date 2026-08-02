'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Upload } from 'lucide-react';
import { useState, type ChangeEvent } from 'react';
import { toast } from 'sonner';
import { equipmentAdminService } from '@/features/admin/services/equipment-admin-service';
import { equipmentTypes, type EquipmentType } from '@/shared/api/contracts';
import { queryKeys } from '@/shared/api/query-keys';
import { Button } from '@/shared/components/ui/button';
import { Dialog, DialogClose, DialogContent, DialogTrigger } from '@/shared/components/ui/dialog';
import { Field } from '@/shared/components/ui/field';
import { Textarea } from '@/shared/components/ui/textarea';
import { parseCsv } from '@/shared/lib/data-transfer';

type ParsedEquipment = { nombre: string; tipo: EquipmentType; descripcion: string | null };

function coerceRows(raw: string): ParsedEquipment[] {
  const trimmed = raw.trim();
  if (!trimmed) throw new Error('Pega o carga contenido CSV o JSON.');
  const records: Record<string, unknown>[] =
    trimmed.startsWith('[') || trimmed.startsWith('{')
      ? asArray(JSON.parse(trimmed))
      : parseCsv(trimmed);
  if (records.length === 0) throw new Error('No se encontraron filas.');

  return records.map((record, index) => {
    const nombre = String(record.nombre ?? '').trim();
    const tipo = String(record.tipo ?? '').trim().toUpperCase();
    const descripcion = String(record.descripcion ?? '').trim();
    if (nombre.length < 2) throw new Error(`Fila ${index + 1}: "nombre" es obligatorio.`);
    if (!equipmentTypes.includes(tipo as EquipmentType)) {
      throw new Error(
        `Fila ${index + 1}: "tipo" inválido (${tipo || 'vacío'}). Usa uno de: ${equipmentTypes.join(', ')}.`,
      );
    }
    return { nombre, tipo: tipo as EquipmentType, descripcion: descripcion || null };
  });
}

function asArray(value: unknown): Record<string, unknown>[] {
  if (Array.isArray(value)) return value as Record<string, unknown>[];
  if (value && typeof value === 'object') return [value as Record<string, unknown>];
  return [];
}

export function EquipmentBulkImport() {
  const [open, setOpen] = useState(false);
  const [raw, setRaw] = useState('');
  const [error, setError] = useState<string | null>(null);
  const queryClient = useQueryClient();

  const runImport = useMutation({
    mutationFn: async () => {
      const rows = coerceRows(raw);
      let created = 0;
      const failures: string[] = [];
      for (const [index, row] of rows.entries()) {
        try {
          await equipmentAdminService.create(row);
          created += 1;
        } catch (cause) {
          failures.push(`Fila ${index + 1} (${row.nombre}): ${(cause as Error).message}`);
        }
      }
      return { created, failures, total: rows.length };
    },
    onSuccess: async ({ created, failures, total }) => {
      await queryClient.invalidateQueries({ queryKey: queryKeys.equipment });
      if (failures.length === 0) {
        toast.success(`${created} equipos creados.`);
        setRaw('');
        setOpen(false);
      } else {
        toast.warning(`${created}/${total} creados. ${failures.length} con error.`);
        setError(failures.slice(0, 8).join('\n'));
      }
    },
    onError: (cause: Error) => setError(cause.message),
  });

  const onFile = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    void file.text().then((text) => {
      setRaw(text);
      setError(null);
    });
  };

  return (
    <Dialog onOpenChange={setOpen} open={open}>
      <DialogTrigger asChild>
        <Button variant="secondary">
          <Upload className="size-4" />
          Carga masiva
        </Button>
      </DialogTrigger>
      <DialogContent
        description="Pega CSV (columnas: nombre, tipo, descripcion) o un arreglo JSON. Se crea cada equipo con el endpoint estándar."
        title="Importar equipos"
      >
        <div className="grid gap-4">
          <input
            accept=".csv,.json,text/csv,application/json"
            aria-label="Archivo CSV o JSON"
            className="text-sm text-[var(--text-muted)] file:mr-3 file:rounded-[4px] file:border file:border-[var(--border)] file:bg-[var(--surface)] file:px-3 file:py-1.5 file:text-[var(--text)]"
            onChange={onFile}
            type="file"
          />
          <Field htmlFor="bulk-raw" label="Contenido CSV o JSON">
            <Textarea
              id="bulk-raw"
              className="min-h-40 font-mono text-xs"
              onChange={(event) => setRaw(event.target.value)}
              placeholder={'nombre,tipo,descripcion\nPress banca,BANCO,Banco plano\nMancuerna 10kg,MANCUERNA,'}
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
              loading={runImport.isPending}
              onClick={() => {
                setError(null);
                runImport.mutate();
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
