'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Mail } from 'lucide-react';
import type { RoutineCard } from '@gymsheet/types';
import { Badge } from '@/shared/components/ui/badge';
import { Button } from '@/shared/components/ui/button';
import { notify } from '@/shared/notifications';
import { routineV2Keys } from '@/features/routines-v2/keys';
import { daysPerWeekLabel, durationLabel } from '@/features/routines-v2/labels';
import { sharingService } from '@/features/routines-v2/services';

/**
 * Invitación pendiente (RF-13): quién te la compartió, cuántos días tiene y dos
 * botones. No enseña ejercicios hasta aceptar — el servidor ni siquiera los manda.
 */
export function InvitationCard({ routine }: Readonly<{ routine: RoutineCard }>) {
  const queryClient = useQueryClient();
  const invitation = routine.invitacion;
  const respond = useMutation({
    mutationFn: (accept: boolean) =>
      accept ? sharingService.accept(invitation?.id ?? '') : sharingService.decline(invitation?.id ?? ''),
    onSuccess: async (_result, accept) => {
      await queryClient.invalidateQueries({ queryKey: routineV2Keys.all });
      notify.success(accept ? 'Rutina aceptada. Ya puedes verla completa.' : 'Invitación rechazada.');
    },
    onError: (error: Error) => notify.error(error),
  });
  if (!invitation) return null;
  const meta = [daysPerWeekLabel(routine.diasPorSemana), durationLabel(routine.duracionSemanas)].filter(Boolean);
  return (
    <article
      aria-label={`Invitación a la rutina ${routine.nombre}`}
      className="panel flex h-full flex-col gap-4 border-[var(--info-border)] p-5"
      data-testid="invitation-card"
    >
      <div className="flex items-center gap-2">
        <Badge latido={false} tone="info">
          <Mail aria-hidden className="mr-1 size-3" />
          Invitación
        </Badge>
      </div>
      <div className="grid gap-1.5">
        <h2 className="text-lg font-semibold leading-snug tracking-[-0.02em]">{routine.nombre}</h2>
        <p className="text-sm text-[var(--text-muted)]">
          {invitation.deParte.nombre} te compartió esta rutina · {meta.join(' · ')}
        </p>
        <p className="text-xs text-[var(--text-muted)]">Verás los ejercicios cuando la aceptes.</p>
      </div>
      <div className="mt-auto flex flex-wrap gap-2">
        <Button
          disabled={respond.isPending}
          loading={respond.isPending && respond.variables === true}
          onClick={() => respond.mutate(true)}
          size="sm"
          variant="primary"
        >
          Aceptar
        </Button>
        <Button
          disabled={respond.isPending}
          loading={respond.isPending && respond.variables === false}
          onClick={() => respond.mutate(false)}
          size="sm"
          variant="secondary"
        >
          Rechazar
        </Button>
      </div>
    </article>
  );
}
