'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { facilitiesAdminService } from '@/features/admin/services/facilities-admin-service';
import type { Branch } from '@/shared/api/contracts';
import type { MapMarker } from '@/shared/components/map';
import { LocationPicker, readLocation } from '@/shared/components/map/location-picker';
import { Button } from '@/shared/components/ui/button';
import { Dialog, DialogClose, DialogContent } from '@/shared/components/ui/dialog';
import { pointOf } from '@/shared/lib/geo';
import { notify } from '@/shared/notifications';
import { useState } from 'react';

/**
 * Situar o mover una sede ya registrada. Las sedes anteriores al mapa no tienen
 * ubicación; desde aquí se completan sin volver a darlas de alta.
 */
export function BranchLocationDialog({
  branch,
  branches,
  onClose,
}: Readonly<{ branch: Branch | null; branches: Branch[]; onClose: () => void }>) {
  const queryClient = useQueryClient();
  const [error, setError] = useState<string | null>(null);
  const save = useMutation({
    mutationFn: ({ id, values }: { id: string; values: FormData }) => {
      const location = readLocation(values);
      return facilitiesAdminService.updateBranch(id, {
        direccion: location.address,
        latitud: location.point?.lat ?? null,
        longitud: location.point?.lng ?? null,
      });
    },
    onSuccess: async (updated) => {
      await queryClient.invalidateQueries({ queryKey: ['admin', 'branches'] });
      notify.success(`Ubicación de «${updated.nombre}» guardada.`);
      onClose();
    },
    onError: (failure: Error) => notify.error(failure),
  });

  const context: MapMarker[] = branches.flatMap((item) => {
    const position = item.id === branch?.id ? null : pointOf(item);
    return position ? [{ id: item.id, position, label: item.nombre }] : [];
  });
  const current = branch ? pointOf(branch) : null;

  return (
    <Dialog
      onOpenChange={(open) => {
        if (!open) {
          setError(null);
          onClose();
        }
      }}
      open={Boolean(branch)}
    >
      {branch ? (
        <DialogContent
          className="max-w-3xl"
          description={
            current
              ? 'Arrastra el pin o busca otra dirección para mover la sede.'
              : 'Esta sede aún no tiene ubicación. Márcala para que aparezca en el mapa.'
          }
          title={`Ubicación de ${branch.nombre}`}
        >
          <form
            className="grid gap-5"
            noValidate
            onSubmit={(event) => {
              event.preventDefault();
              const values = new FormData(event.currentTarget);
              const location = readLocation(values);
              setError(location.error);
              if (!location.error) save.mutate({ id: branch.id, values });
            }}
          >
            <LocationPicker
              context={context}
              defaultAddress={branch.direccion}
              defaultPoint={current}
              initialCenter={context[0]?.position}
              key={branch.id}
            />
            {error ? (
              <p
                className="rounded-[4px] border border-[var(--danger-border)] bg-[var(--danger-bg)] px-3 py-2 text-sm text-[var(--danger-text)]"
                role="alert"
              >
                {error}
              </p>
            ) : null}
            <div className="flex justify-end gap-2 border-t border-[var(--border-subtle)] pt-4">
              <DialogClose asChild>
                <Button type="button" variant="ghost">
                  Cancelar
                </Button>
              </DialogClose>
              <Button loading={save.isPending} type="submit" variant="primary">
                Guardar ubicación
              </Button>
            </div>
          </form>
        </DialogContent>
      ) : null}
    </Dialog>
  );
}
