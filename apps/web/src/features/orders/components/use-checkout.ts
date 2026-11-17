'use client';

import { affiliationCopy, checkoutAffiliationOf, isSwitchGymConflict, type JoinGymForm } from '@gymsheet/domain';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { ApiError } from '@/shared/api/api-error';
import { personAffiliationKeys, queryKeys } from '@/shared/api/query-keys';
import type { CreateOrderInput } from '@/shared/api/schemas';
import { confirm } from '@/shared/notifications';
import { personAffiliationsService } from '@/features/affiliations/services/affiliations-client';
import { buyerOrdersService } from '../services/orders-client';

type Draft = Omit<CreateOrderInput, 'affiliation'>;

/**
 * Creates the order; with `socio` it carries the SOCIO data of a gym
 * membership (ADR-0026). `422 AFFILIATION_REQUIRED` asks for the step the
 * person skipped; `409 SOCIO_OF_ANOTHER_GYM` asks «¿Quieres cambiarte?» once
 * and resends with `switchGym: true`.
 */
export function useCheckout({ gymName, onNeedsSocio }: Readonly<{ gymName: string; onNeedsSocio: () => void }>) {
  const router = useRouter();
  const client = useQueryClient();
  const create = useMutation({
    mutationFn: ({ draft, socio, switchGym }: { draft: Draft; socio: JoinGymForm | null; switchGym: boolean }) =>
      buyerOrdersService.create({ ...draft, ...(socio ? { affiliation: checkoutAffiliationOf(socio, switchGym) } : {}) }),
    onSuccess: (order, { socio }) => {
      client.setQueryData(queryKeys.orders.detail(order.id), order);
      void client.invalidateQueries({ queryKey: queryKeys.orders.list });
      void client.invalidateQueries({ queryKey: queryKeys.subscriptions.all });
      if (socio) for (const key of personAffiliationKeys()) void client.invalidateQueries({ queryKey: key });
      router.push(`/profile/compras/${order.id}`);
    },
    onError: async (error, variables) => {
      if (!(error instanceof ApiError)) return;
      if (error.code === 'AFFILIATION_REQUIRED') onNeedsSocio();
      if (!isSwitchGymConflict(error)) return;
      const current = await client.fetchQuery({ queryKey: queryKeys.myGym, queryFn: personAffiliationsService.myGym }).catch(() => null);
      const answer = await confirm({
        title: affiliationCopy.switchTitle(current?.gym?.name ?? 'otro gimnasio'),
        message: affiliationCopy.switchBody(gymName),
        confirmLabel: affiliationCopy.switchConfirm,
        cancelLabel: 'Quedarme',
      });
      if (answer.confirmed) create.mutate({ ...variables, switchGym: true });
    },
  });
  // The switch question replaces the error: it is a choice, not a failure.
  const error = create.error instanceof ApiError && isSwitchGymConflict(create.error) ? null : create.error;
  return { create, error };
}
