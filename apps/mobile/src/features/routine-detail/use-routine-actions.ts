import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { ApiError } from '@gymsheet/api-client';
import { confirm } from '@gymsheet/notifications';
import type { Routine } from '@gymsheet/types';
import { routineCatalogService, routineService } from '@/api/services';
import { notify } from '@/notifications';

/**
 * Publicar, despublicar, copiar y sincronizar (RF-09, RF-10). Publicar pide
 * confirmación y, si el backend responde `409 ROUTINE_DUPLICATE`, ofrece ver la
 * rutina idéntica que ya existe en vez de enseñar un error técnico.
 */
export function useRoutineActions(routine: Routine) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const open = (id: string) => router.push({ pathname: '/routines/[id]', params: { id } });
  // Se refresca en segundo plano: el aviso de éxito no espera a que terminen las
  // consultas del catálogo (con la red lenta tardaban más que la propia acción).
  const refresh = () => {
    void queryClient.invalidateQueries({ queryKey: ['routines'] });
    void queryClient.invalidateQueries({ queryKey: ['routine', routine.id] });
  };

  const showDuplicate = async (existingId: string | null) => {
    let label = 'Otra persona ya publicó una rutina con los mismos ejercicios.';
    if (existingId) {
      const existing = await routineService.get(existingId).catch(() => null);
      if (existing) {
        label = `«${existing.nombre}» de ${existing.atribucion?.authorName ?? 'otra persona'} tiene los mismos días y ejercicios.`;
      }
    }
    const choice = await confirm({
      title: 'Ya existe una rutina idéntica',
      message: label,
      confirmLabel: 'Ver rutina',
      cancelLabel: 'Seguir editando',
    });
    if (choice.confirmed && existingId) open(existingId);
  };

  const publish = useMutation({
    mutationFn: () => routineCatalogService.publish(routine.id),
    onSuccess: () => {
      refresh();
      notify.success('Rutina publicada. Ya aparece en Públicas.');
    },
    onError: async (error: Error) => {
      if (error instanceof ApiError && error.code === 'ROUTINE_DUPLICATE') {
        const id = error.details?.['existingRoutineId'];
        await showDuplicate(typeof id === 'string' ? id : null);
        return;
      }
      notify.error(error);
    },
  });

  const unpublish = useMutation({
    mutationFn: () => routineCatalogService.unpublish(routine.id),
    onSuccess: () => {
      refresh();
      notify.success('Rutina despublicada. Las copias no cambian.');
    },
    onError: (error: Error) => notify.error(error),
  });

  const copy = useMutation({
    mutationFn: () => routineCatalogService.copy(routine.id),
    onSuccess: (created) => {
      refresh();
      notify.success({
        message: 'Copiada a Mías',
        action: { label: 'Abrir', onClick: () => open(created.id) },
      });
    },
    onError: (error: Error) => notify.error(error),
  });

  const sync = useMutation({
    mutationFn: () => routineCatalogService.syncFromSource(routine.id),
    onSuccess: () => {
      refresh();
      notify.success('Copia actualizada con la versión nueva.');
    },
    onError: (error: Error) => notify.error(error),
  });

  return {
    publish: async () => {
      const choice = await confirm({
        title: 'Publicar rutina',
        message: 'Cualquiera podrá verla y copiarla. Podrás despublicarla cuando quieras.',
        confirmLabel: 'Publicar',
        cancelLabel: 'Cancelar',
      });
      if (choice.confirmed) publish.mutate();
    },
    unpublish: async () => {
      const choice = await confirm({
        title: 'Despublicar rutina',
        message: 'Dejará de aparecer en Públicas. Las copias que ya hicieron otras personas no cambian.',
        confirmLabel: 'Despublicar',
        cancelLabel: 'Cancelar',
      });
      if (choice.confirmed) unpublish.mutate();
    },
    copy: () => copy.mutate(),
    sync: () => sync.mutate(),
    publishing: publish.isPending,
    unpublishing: unpublish.isPending,
    copying: copy.isPending,
    syncing: sync.isPending,
  };
}
