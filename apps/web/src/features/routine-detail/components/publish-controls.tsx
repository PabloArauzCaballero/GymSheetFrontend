'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Globe, GlobeLock } from 'lucide-react';
import { useState } from 'react';
import type { Routine } from '@gymsheet/types';
import { ApiError } from '@/shared/api/api-error';
import { queryKeys } from '@/shared/api/query-keys';
import { Button, ButtonLink } from '@/shared/components/ui/button';
import { Dialog, DialogClose, DialogContent } from '@/shared/components/ui/dialog';
import { confirm, notify } from '@/shared/notifications';
import { routineBuilderService } from '@/features/routine-wizard/services';
import { routineV2Keys } from '@/features/routines-v2/keys';
import { catalogService, sharingService } from '@/features/routines-v2/services';

/** Lo que dice el 409: ya hay una pública con los mismos ejercicios. Se enseña cuál y de quién. */
function DuplicateDialog({
  existingId,
  onClose,
}: Readonly<{ existingId: string | null; onClose: () => void }>) {
  // La pública idéntica: su nombre sale del detalle y su autora de la tarjeta del catálogo.
  const existing = useQuery({
    queryKey: ['routines-v2', 'duplicate-of', existingId],
    queryFn: async () => {
      const detail = await routineBuilderService.get(existingId ?? '');
      const page = await catalogService.list({ scope: 'public', q: detail.nombre, limit: 20 });
      return { nombre: detail.nombre, autor: page.items.find((item) => item.id === existingId)?.autor.nombre ?? null };
    },
    enabled: existingId !== null,
  });
  const name = existing.data?.nombre ?? 'Una rutina pública';
  return (
    <Dialog onOpenChange={(open) => (open ? undefined : onClose())} open>
      <DialogContent
        description="No se pueden publicar dos rutinas con los mismos ejercicios, series y repeticiones en el mismo orden. Cambia algo tuyo (un ejercicio o una repetición) y vuelve a publicar."
        title="Ya existe una rutina idéntica"
      >
        <div className="grid gap-5">
          <p className="rounded-[var(--radius-md)] border border-[var(--border-subtle)] bg-[var(--surface-low)] p-4 text-sm" data-testid="duplicate-of">
            <strong>{name}</strong>
            {existing.data?.autor ? <> de {existing.data.autor}</> : null}
          </p>
          <div className="flex flex-wrap justify-end gap-2">
            <DialogClose asChild>
              <Button variant="ghost">Seguir editando</Button>
            </DialogClose>
            {existingId ? (
              <ButtonLink href={`/routines/${existingId}`} variant="primary">
                Ver rutina
              </ButtonLink>
            ) : null}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

/** Publicar o despublicar una rutina propia (RF-09). Una oficial solo la gestiona REPP. */
export function PublishControls({ routine }: Readonly<{ routine: Routine }>) {
  const queryClient = useQueryClient();
  const [duplicate, setDuplicate] = useState<string | null | undefined>(undefined);
  const isPublic = routine.visibilidad === 'PUBLIC';
  const change = useMutation({
    mutationFn: () => (isPublic ? sharingService.unpublish(routine.id) : sharingService.publish(routine.id)),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: queryKeys.routine(routine.id) });
      await queryClient.invalidateQueries({ queryKey: routineV2Keys.all });
      notify.success(isPublic ? 'Rutina despublicada. Las copias que ya existen no cambian.' : 'Rutina publicada. Ya aparece en Públicas.');
    },
    onError: (error: Error) => {
      if (error instanceof ApiError && error.code === 'ROUTINE_DUPLICATE') {
        const id = error.details?.existingRoutineId;
        setDuplicate(typeof id === 'string' ? id : null);
        return;
      }
      notify.error(error);
    },
  });
  if (routine.esOficial) return null;
  const onClick = async () => {
    const result = await confirm(
      isPublic
        ? {
            title: 'Despublicar la rutina',
            message: 'Dejará de verse en Públicas. Las copias que ya hicieron otras personas no cambian.',
            confirmLabel: 'Despublicar',
          }
        : {
            title: 'Publicar la rutina',
            message: 'Cualquiera podrá verla, valorarla, comentarla y copiarla. Podrás despublicarla cuando quieras.',
            confirmLabel: 'Publicar',
          },
    );
    if (result.confirmed) change.mutate();
  };
  return (
    <>
      <Button loading={change.isPending} onClick={onClick} variant="secondary">
        {isPublic ? <GlobeLock aria-hidden className="size-4" /> : <Globe aria-hidden className="size-4" />}
        {isPublic ? 'Despublicar' : 'Publicar'}
      </Button>
      {duplicate !== undefined ? (
        <DuplicateDialog existingId={duplicate} onClose={() => setDuplicate(undefined)} />
      ) : null}
    </>
  );
}
