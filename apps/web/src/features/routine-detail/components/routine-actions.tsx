'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Archive, BookmarkPlus, Play, Zap } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { isStaff } from '@gymsheet/domain';
import { canActivateProgram } from '@gymsheet/hooks';
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
import { useSavedCopy } from '../use-saved-copy';
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
        message: 'Guardada en tus rutinas',
        description: `${created.nombre}. Es tuya: puedes cambiarla sin tocar la original.`,
      });
      router.replace(`/routines/${created.id}`);
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
  const saved = useSavedCopy(routine);
  const canActivate = canActivateProgram(routine);
  return (
    <div className="flex flex-wrap gap-2">
      {routine.esMia ? null : (
        <Button disabled={!hasExercises} loading={copy.isPending} onClick={() => copy.mutate()} variant="primary">
          <BookmarkPlus aria-hidden className="size-4" />
          Guardar en mis rutinas
        </Button>
      )}
      <Button
        disabled={!hasExercises}
        loading={starting}
        onClick={onStart}
        variant="secondary"
      >
        <Play aria-hidden className="size-4" />
        {routine.esMia ? 'Empezar sesión' : 'Probar un día'}
      </Button>
      {canActivate && hasExercises ? (
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
          {saved ? (
            <p className="flex items-center gap-2 text-sm text-[var(--text-muted)]">
              {saved.label}
              <ButtonLink href={`/routines/${saved.id}`} size="sm" variant="ghost">
                Abrir
              </ButtonLink>
            </p>
          ) : null}
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
