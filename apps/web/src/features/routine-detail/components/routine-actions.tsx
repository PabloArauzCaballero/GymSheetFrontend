'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Archive, Copy, Play, Zap } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { isStaff } from '@gymsheet/domain';
import type { Routine } from '@gymsheet/types';
import type { UserRole } from '@/shared/api/contracts';
import { Button, ButtonLink } from '@/shared/components/ui/button';
import { confirm, notify } from '@/shared/notifications';
import { ReportDialog } from '@/features/moderation/components/report-dialog';
import { routineV2Keys } from '@/features/routines-v2/keys';
import { sharingService } from '@/features/routines-v2/services';
import { ShareDialog } from '@/features/routine-sharing/components/share-dialog';
import { AssignRoutineDialog } from '@/features/training/components/assign-routine-dialog';
import { trainingService } from '@/features/training/services/training-service';
import { PublishControls } from './publish-controls';

/**
 * Las acciones de la rutina según quién mira: la autora publica, comparte y
 * archiva; cualquiera que la vea la copia, la denuncia o empieza una sesión; el
 * entrenador la asigna a un cliente.
 */
export function RoutineActions({
  routine,
  role,
  onStart,
  starting,
}: Readonly<{ routine: Routine; role: UserRole; onStart: () => void; starting: boolean }>) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const copy = useMutation({
    mutationFn: () => sharingService.copy(routine.id),
    onSuccess: async (created) => {
      await queryClient.invalidateQueries({ queryKey: routineV2Keys.all });
      notify.success({
        message: 'Copiada a Mías',
        description: 'Es tuya: puedes cambiarla sin tocar la original.',
        action: { label: 'Abrir', onClick: () => router.push(`/routines/${created.id}`) },
      });
    },
    onError: (error: Error) => notify.error(error),
  });
  const archive = useMutation({
    mutationFn: () => trainingService.remove(routine.id),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: routineV2Keys.all });
      notify.success('Rutina archivada.');
      router.push('/routines?tab=mias');
    },
    onError: (error: Error) => notify.error(error),
  });
  const hasExercises = routine.ejercicios.length > 0;
  return (
    <div className="flex flex-wrap gap-2">
      <Button disabled={!hasExercises} loading={starting} onClick={onStart} variant="secondary">
        <Play aria-hidden className="size-4" />
        Empezar sesión
      </Button>
      {hasExercises ? (
        <ButtonLink href={`/routines/${routine.id}/activate`} variant="primary">
          <Zap aria-hidden className="size-4" />
          Activar
        </ButtonLink>
      ) : null}
      {routine.esMia ? (
        <>
          <PublishControls routine={routine} />
          {routine.visibilidad !== 'PUBLIC' ? (
            <ShareDialog routineId={routine.id} routineName={routine.nombre} />
          ) : null}
          <Button
            aria-label="Archivar la rutina"
            loading={archive.isPending}
            onClick={async () => {
              const result = await confirm({
                title: 'Archivar la rutina',
                message: 'Dejará de aparecer en tus rutinas. Las copias y los programas ya activos no cambian.',
                confirmLabel: 'Archivar',
                severity: 'danger',
              });
              if (result.confirmed) archive.mutate();
            }}
            variant="ghost"
          >
            <Archive aria-hidden className="size-4" />
            Archivar
          </Button>
        </>
      ) : (
        <>
          <Button disabled={!hasExercises} loading={copy.isPending} onClick={() => copy.mutate()} variant="secondary">
            <Copy aria-hidden className="size-4" />
            Copiar a mis rutinas
          </Button>
          <ReportDialog
            consequence="Alguien del equipo revisará la rutina. Nadie sabrá que fuiste tú."
            defaultReason="INFORMACION_ENGANOSA"
            subjectName="esta rutina"
            successMessage="Gracias. Lo revisaremos."
            targetId={routine.id}
            targetKind="ROUTINE"
          />
        </>
      )}
      {isStaff(role) ? <AssignRoutineDialog routineId={routine.id} /> : null}
    </div>
  );
}
