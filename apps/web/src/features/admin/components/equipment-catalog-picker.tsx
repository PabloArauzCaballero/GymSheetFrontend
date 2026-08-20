'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { PackagePlus } from 'lucide-react';
import { useState } from 'react';
import { z } from 'zod';
import { apiRequest } from '@/shared/api/api-client';
import { notify } from '@/shared/notifications';
import { Button } from '@/shared/components/ui/button';
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogTrigger,
} from '@/shared/components/ui/dialog';

const catalogZoneSchema = z.object({
  zona: z.string(),
  equipos: z.array(
    z.object({ clave: z.string(), nombre: z.string(), tipo: z.string() }),
  ),
});

const seedResultSchema = z.object({
  creados: z.array(z.object({ id: z.string() })),
  omitidos: z.array(z.string()),
});

const catalogService = {
  list: () =>
    apiRequest('/admin/equipment/catalog', z.array(catalogZoneSchema), { method: 'GET' }),
  seed: (claves: string[]) =>
    apiRequest('/admin/equipment/catalog', seedResultSchema, {
      method: 'POST',
      body: { claves },
    }),
};

/**
 * Elegir equipamiento de una lista en vez de escribirlo.
 *
 * El problema que resuelve es el primer día: un gimnasio recién dado de alta
 * abre esta pantalla vacía y tiene que teclear cuarenta fichas antes de que la
 * aplicación le diga nada. Lo que ocurre entonces es que teclea cuatro y lo
 * deja, o escribe «Prensa», «prensa de piernas» y «Leg press» en tres visitas
 * distintas y los informes quedan repartidos entre tres máquinas que son la
 * misma.
 *
 * Se marca por zona porque así es como alguien recorre su propio gimnasio
 * mentalmente —la sala de peso libre, las de empuje, el cardio—, no por tipo de
 * mecanismo.
 *
 * Lo ya registrado se omite en silencio y se informa al terminar: quien vuelve
 * aquí suele hacerlo para añadir lo que le faltó, y castigarle con un error por
 * marcar de nuevo lo que ya tenía convierte una corrección en un problema.
 */
export function EquipmentCatalogPicker() {
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const queryClient = useQueryClient();

  const catalog = useQuery({
    queryKey: ['admin', 'equipment', 'catalog'],
    queryFn: catalogService.list,
    enabled: open,
  });

  const seed = useMutation({
    mutationFn: () => catalogService.seed([...selected]),
    onSuccess: async (result) => {
      await queryClient.invalidateQueries({ queryKey: ['admin', 'equipment'] });
      setSelected(new Set());
      setOpen(false);
      notify.success(
        result.omitidos.length > 0
          ? `${result.creados.length} equipos añadidos. ${result.omitidos.length} ya estaban registrados.`
          : `${result.creados.length} equipos añadidos.`,
      );
    },
    onError: (error: Error) => notify.error(error),
  });

  const toggle = (clave: string) =>
    setSelected((previous) => {
      const next = new Set(previous);
      if (next.has(clave)) next.delete(clave);
      else next.add(clave);
      return next;
    });

  const toggleZone = (claves: string[], allSelected: boolean) =>
    setSelected((previous) => {
      const next = new Set(previous);
      for (const clave of claves) {
        if (allSelected) next.delete(clave);
        else next.add(clave);
      }
      return next;
    });

  return (
    <Dialog onOpenChange={setOpen} open={open}>
      <DialogTrigger asChild>
        <Button variant="secondary">
          <PackagePlus className="size-4" />
          Añadir desde catálogo
        </Button>
      </DialogTrigger>
      <DialogContent
        description="Marca lo que tenga tu gimnasio. Lo que ya esté registrado se omite."
        title="Equipamiento habitual"
      >
        <div className="flex max-h-[70vh] flex-col gap-4 overflow-y-auto">

          {catalog.isPending ? (
            <div className="h-64 animate-pulse rounded-[8px] bg-[var(--surface-low)]" />
          ) : (
            (catalog.data ?? []).map((zone) => {
              const claves = zone.equipos.map((item) => item.clave);
              const allSelected = claves.every((clave) => selected.has(clave));
              return (
                <section className="flex flex-col gap-2" key={zone.zona}>
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-semibold uppercase tracking-wide text-[var(--text-muted)]">
                      {zone.zona}
                    </h3>
                    <button
                      className="text-xs text-[var(--text-muted)] underline-offset-4 hover:underline"
                      onClick={() => toggleZone(claves, allSelected)}
                      type="button"
                    >
                      {allSelected ? 'Quitar zona' : 'Marcar zona'}
                    </button>
                  </div>
                  <div className="grid gap-2 sm:grid-cols-2">
                    {zone.equipos.map((item) => (
                      <label
                        className="flex cursor-pointer items-center gap-2 rounded-[6px] border border-[var(--border-subtle)] p-2 text-sm text-[var(--text)] hover:border-[var(--border)]"
                        key={item.clave}
                      >
                        <input
                          checked={selected.has(item.clave)}
                          onChange={() => toggle(item.clave)}
                          type="checkbox"
                        />
                        {item.nombre}
                      </label>
                    ))}
                  </div>
                </section>
              );
            })
          )}

          <div className="flex items-center justify-between gap-3 border-t border-[var(--border-subtle)] pt-4">
            <span className="text-sm text-[var(--text-muted)]">
              {selected.size === 0
                ? 'Nada marcado todavía'
                : `${selected.size} seleccionados`}
            </span>
            <div className="flex gap-2">
              <DialogClose asChild>
                <Button variant="ghost">Cancelar</Button>
              </DialogClose>
              <Button
                disabled={selected.size === 0 || seed.isPending}
                loading={seed.isPending}
                onClick={() => seed.mutate()}
              >
                Añadir
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
