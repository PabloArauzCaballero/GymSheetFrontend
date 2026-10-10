'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Mail } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { Button, ButtonLink } from '@/shared/components/ui/button';
import { notify } from '@/shared/notifications';
import { routineV2Keys } from '@/features/routines-v2/keys';
import { sharingService } from '@/features/routines-v2/services';
import { queryKeys } from '@/shared/api/query-keys';

/**
 * Lo que ve quien abre por enlace una rutina cuya invitación aún no aceptó
 * (`403 SHARE_PENDING`): el servidor no manda el contenido, así que aquí solo hay
 * quién la comparte y dos botones (RF-13).
 */
export function PendingInvitation({ routineId }: Readonly<{ routineId: string }>) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const invitations = useQuery({
    queryKey: routineV2Keys.invitations,
    queryFn: () => sharingService.myInvitations('PENDING'),
  });
  const invitation = invitations.data?.find((item) => item.rutina?.id === routineId);
  const respond = useMutation({
    mutationFn: (accept: boolean) =>
      accept ? sharingService.accept(invitation?.id ?? '') : sharingService.decline(invitation?.id ?? ''),
    onSuccess: async (_result, accept) => {
      await queryClient.invalidateQueries({ queryKey: routineV2Keys.all });
      if (accept) {
        await queryClient.invalidateQueries({ queryKey: queryKeys.routine(routineId) });
        notify.success('Rutina aceptada. Ya puedes verla completa.');
      } else {
        notify.success('Invitación rechazada.');
        router.push('/routines?tab=mias&sub=compartidas');
      }
    },
    onError: (error: Error) => notify.error(error),
  });
  return (
    <section
      aria-labelledby="pending-title"
      className="panel mx-auto grid max-w-xl justify-items-center gap-4 p-8 text-center"
      data-testid="pending-invitation"
    >
      <div className="grid size-14 place-items-center rounded-full border border-[var(--info-border)] bg-[var(--info-bg)] text-[var(--info-text)]">
        <Mail aria-hidden className="size-6" />
      </div>
      <h1 className="text-2xl font-semibold tracking-[-0.03em]" id="pending-title">
        {invitation?.rutina?.nombre ?? 'Una rutina te espera'}
      </h1>
      <p className="max-w-md text-sm leading-6 text-[var(--text-muted)]">
        {invitation
          ? `${invitation.deParte.nombre} te compartió esta rutina de ${invitation.rutina?.dias ?? 0} ${invitation.rutina?.dias === 1 ? 'día' : 'días'}. `
          : ''}
        Acepta la invitación para ver sus ejercicios.
      </p>
      <div className="flex flex-wrap justify-center gap-2">
        <Button
          disabled={!invitation || respond.isPending}
          loading={respond.isPending && respond.variables === true}
          onClick={() => respond.mutate(true)}
          variant="primary"
        >
          Aceptar
        </Button>
        <Button
          disabled={!invitation || respond.isPending}
          loading={respond.isPending && respond.variables === false}
          onClick={() => respond.mutate(false)}
          variant="secondary"
        >
          Rechazar
        </Button>
        <ButtonLink href="/routines?tab=mias&sub=compartidas" variant="ghost">
          Volver a mis rutinas
        </ButtonLink>
      </div>
    </section>
  );
}
