'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { RefreshCw } from 'lucide-react';
import { Button } from '@/shared/components/ui/button';
import { confirm, notify } from '@/shared/notifications';
import {
  supportTrainingService,
  type RecomputeResult,
} from '@/features/support-training/services/support-training-service';
import { recomputeMessage } from './support-labels';

export const supportKey = (userId: string) => ['admin', 'soporte', 'entrenamiento', userId] as const;

/**
 * «Recalcular semana», con confirmación y con el resultado a la vista.
 *
 * El backend sólo puede AÑADIR el bono que faltaba y es idempotente, así que el
 * diálogo lo dice antes de preguntar: quien lo pulsa no teme quitarle puntos al
 * socio. Sin `support:respond` el botón se ve, pero desactivado.
 */
export function RecomputeWeekButton({
  userId,
  programId,
  week,
  canRespond,
  onResult,
}: Readonly<{
  userId: string;
  programId: string;
  week: number;
  canRespond: boolean;
  onResult: (week: number, result: RecomputeResult) => void;
}>) {
  const queryClient = useQueryClient();
  const recompute = useMutation({
    mutationFn: () => supportTrainingService.recomputeWeek(programId, week),
    onSuccess: async (result) => {
      onResult(week, result);
      notify.success(recomputeMessage(result));
      await queryClient.invalidateQueries({ queryKey: supportKey(userId) });
    },
    onError: (error: Error) => notify.error(error),
  });

  const ask = async () => {
    const answer = await confirm({
      title: `¿Recalcular la semana ${week}?`,
      message:
        'Se vuelve a evaluar con las sesiones registradas. Si ahora resulta cumplida, se otorga el bono que faltaba.',
      description:
        'Es seguro repetirlo: nunca resta puntos, no toca otras semanas y no paga dos veces. Queda en la auditoría.',
      confirmLabel: 'Recalcular',
      severity: 'info',
    });
    if (answer.confirmed) recompute.mutate();
  };

  return (
    <Button
      aria-label={`Recalcular la semana ${week}`}
      disabled={!canRespond}
      loading={recompute.isPending}
      onClick={() => void ask()}
      size="sm"
      title={canRespond ? undefined : 'Necesitas el permiso de responder en soporte (support:respond).'}
      variant="secondary"
    >
      <RefreshCw aria-hidden className="size-4" />
      Recalcular
    </Button>
  );
}
