'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { RoutineShare, ShareStatus } from '@gymsheet/types';
import { Badge } from '@/shared/components/ui/badge';
import { Button } from '@/shared/components/ui/button';
import { confirm, notify } from '@/shared/notifications';
import { routineV2Keys } from '@/features/routines-v2/keys';
import { sharingService } from '@/features/routines-v2/services';

const STATUS: Record<ShareStatus, { label: string; tone: 'neutral' | 'success' | 'warning' | 'danger' }> = {
  PENDING: { label: 'Pendiente', tone: 'warning' },
  ACCEPTED: { label: 'Aceptó', tone: 'success' },
  DECLINED: { label: 'Rechazó', tone: 'danger' },
  REVOKED: { label: 'Revocada', tone: 'neutral' },
};

/** «Compartida con»: a quién se invitó, en qué estado va y la opción de revocar (RF-13). */
export function SharedWith({ routineId }: Readonly<{ routineId: string }>) {
  const queryClient = useQueryClient();
  const shares = useQuery({
    queryKey: routineV2Keys.shares(routineId),
    queryFn: () => sharingService.listShares(routineId),
  });
  const revoke = useMutation({
    mutationFn: (share: RoutineShare) => sharingService.revokeShare(routineId, share.id),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: routineV2Keys.shares(routineId) });
      notify.success('Invitación revocada. Esa persona deja de ver la rutina.');
    },
    onError: (error: Error) => notify.error(error),
  });
  const items = shares.data ?? [];
  if (shares.isLoading || items.length === 0) return null;
  return (
    <section aria-labelledby="shared-with-title" className="panel p-5" data-testid="shared-with">
      <h2 className="text-lg font-semibold tracking-[-0.02em]" id="shared-with-title">
        Compartida con
      </h2>
      <ul className="mt-4 grid list-none gap-3">
        {items.map((share) => {
          const status = STATUS[share.estado];
          const live = share.estado === 'PENDING' || share.estado === 'ACCEPTED';
          return (
            <li className="flex flex-wrap items-center justify-between gap-2" key={share.id}>
              <span className="grid min-w-0">
                <span className="truncate font-semibold">{share.invitadoNombre ?? 'Socio'}</span>
              </span>
              <span className="flex items-center gap-2">
                <Badge latido={false} tone={status.tone}>
                  {status.label}
                </Badge>
                {live ? (
                  <Button
                    aria-label={`Revocar la invitación de ${share.invitadoNombre ?? 'esta persona'}`}
                    loading={revoke.isPending && revoke.variables?.id === share.id}
                    onClick={async () => {
                      const result = await confirm({
                        title: 'Revocar la invitación',
                        message: `${share.invitadoNombre ?? 'Esta persona'} dejará de ver la rutina.`,
                        confirmLabel: 'Revocar',
                        severity: 'danger',
                      });
                      if (result.confirmed) revoke.mutate(share);
                    }}
                    size="sm"
                    variant="ghost"
                  >
                    Revocar
                  </Button>
                ) : null}
              </span>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
