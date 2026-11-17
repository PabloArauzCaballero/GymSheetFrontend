import { ApiError } from '@gymsheet/api-client';
import { affiliationCopy, checkoutAffiliationOf, isSwitchGymConflict, type JoinGymForm } from '@gymsheet/domain';
import { personAffiliationKeys, queryKeys } from '@gymsheet/hooks';
import type { CreateOrderInput, PublicLocation } from '@gymsheet/schemas';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { personAffiliationsService } from '@/features/affiliations/affiliations-service';
import { marketplaceService } from '@/features/business-listings/listings-service';
import { confirm } from '@/notifications';
import { buyerOrdersService } from './orders-service';

type Draft = Omit<CreateOrderInput, 'affiliation'>;

/** The gym's sedes for «Hazte socio», from its public profile (null while loading). */
export function useGymLocations(handle: string | null, enabled: boolean): PublicLocation[] | null {
  const profile = useQuery({ queryKey: queryKeys.marketplace.profile(handle ?? ''), queryFn: () => marketplaceService.profile(handle ?? ''), enabled: enabled && Boolean(handle) });
  if (!handle || profile.isError) return [];
  return profile.data && 'locations' in profile.data ? profile.data.locations : null;
}

/**
 * Creates the order; with `socio` it carries the SOCIO data of a gym
 * membership (ADR-0026). `422 AFFILIATION_REQUIRED` opens the step the person
 * skipped; `409 SOCIO_OF_ANOTHER_GYM` asks once and resends with `switchGym`.
 */
export function useCheckout({ gymName, onNeedsSocio, onDone }: { gymName: string; onNeedsSocio: () => void; onDone: () => void }) {
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
      onDone();
      router.push({ pathname: '/compras/[id]', params: { id: order.id } });
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
