'use client';

import { affiliationChip, affiliationCopy, affiliationReasonText, gymHandleOf, ownAffiliationAction } from '@gymsheet/domain';
import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { itemsOfPages, queryKeys } from '@/shared/api/query-keys';
import type { Affiliation } from '@/shared/api/schemas';
import { EmptyState } from '@/shared/components/feedback/empty-state';
import { ErrorPanel } from '@/shared/components/feedback/error-panel';
import { SkeletonList } from '@/shared/components/feedback/skeleton';
import { PageHeader } from '@/shared/components/layout/page-header';
import { Badge } from '@/shared/components/ui/badge';
import { Button } from '@/shared/components/ui/button';
import { Field } from '@/shared/components/ui/field';
import { Input } from '@/shared/components/ui/input';
import { Select } from '@/shared/components/ui/select';
import { useDebouncedValue } from '@/shared/hooks/use-debounced-value';
import { confirm, notify } from '@/shared/notifications';
import { formatDate } from '@/shared/lib/date';
import { marketplaceService } from '@/features/business-listings/services/listings-client';
import { affiliationErrorText, coachGymLinksService } from '../../services/affiliations-client';

/** «Pedir vínculo»: the gym's @handle and, when it has sedes, an optional one (two fields). */
function RequestLinkForm() {
  const client = useQueryClient();
  const [handle, setHandle] = useState('');
  const [locationId, setLocationId] = useState('');
  const typed = useDebouncedValue(gymHandleOf(handle), 400);
  const profile = useQuery({
    queryKey: queryKeys.marketplace.profile(typed),
    // Only a hint while typing: an unknown handle is not an error to announce.
    queryFn: () => marketplaceService.profile(typed).catch(() => null),
    enabled: typed.length >= 3,
  });
  const gym = profile.data && !('redirectTo' in profile.data) && profile.data.entity.entityType === 'GYM' ? profile.data : null;
  const send = useMutation({
    mutationFn: () => coachGymLinksService.request({ gymHandle: gymHandleOf(handle), ...(locationId ? { locationId } : {}) }),
    onSuccess: () => {
      void client.invalidateQueries({ queryKey: queryKeys.business.gymLinks });
      notify.success(affiliationCopy.sentToast);
      setHandle('');
      setLocationId('');
    },
  });
  return (
    <form
      className="panel grid gap-4 p-5"
      onSubmit={(event) => {
        event.preventDefault();
        if (gymHandleOf(handle)) send.mutate();
      }}
    >
      <Field hint={gym ? gym.entity.name : 'Lo encuentras en su perfil: empieza con @.'} label={affiliationCopy.handleLabel}>
        <Input autoCapitalize="none" autoComplete="off" name="gymHandle" onChange={(event) => setHandle(event.target.value)} placeholder="@tugimnasio" spellCheck={false} value={handle} />
      </Field>
      {gym && gym.locations.length > 0 ? (
        <Field label="Sede (opcional)">
          <Select onChange={(event) => setLocationId(event.target.value)} value={locationId}>
            <option value="">Cualquier sede</option>
            {gym.locations.map((location) => (
              <option key={location.id} value={location.id}>
                {location.name}
              </option>
            ))}
          </Select>
        </Field>
      ) : null}
      {send.error ? (
        <p className="t-subhead text-[var(--danger-text)]" role="alert">
          {affiliationErrorText(send.error, true)}
        </p>
      ) : null}
      <Button className="justify-self-start" disabled={!gymHandleOf(handle)} loading={send.isPending} type="submit" variant="primary">
        {affiliationCopy.requestLink}
      </Button>
    </form>
  );
}

/**
 * «Mis gimnasios» of a coach business (plan §4.2): ask a gym by @handle to
 * list you as a coach; the gym accepts. Requests can be cancelled, links left.
 */
export function GymLinksPanel() {
  const client = useQueryClient();
  const pages = useInfiniteQuery({
    queryKey: queryKeys.business.gymLinks,
    queryFn: ({ pageParam }) => coachGymLinksService.list({ cursor: pageParam }),
    initialPageParam: null as string | null,
    getNextPageParam: (page) => page.nextCursor,
  });
  const close = useMutation({
    mutationFn: (row: Affiliation) => (ownAffiliationAction(row) === 'cancel' ? coachGymLinksService.cancel(row.id) : coachGymLinksService.end(row.id)),
    onSuccess: () => void client.invalidateQueries({ queryKey: queryKeys.business.gymLinks }),
    onError: (error) => notify.error(affiliationErrorText(error)),
  });
  async function ask(row: Affiliation) {
    const cancel = ownAffiliationAction(row) === 'cancel';
    const label = cancel ? affiliationCopy.cancel : affiliationCopy.leaveCoach;
    const answer = await confirm({ title: `${label}: ${row.gym.name}`, message: cancel ? 'El gimnasio ya no la verá.' : 'Dejas de salir entre sus entrenadores.', confirmLabel: label, cancelLabel: 'Volver' });
    if (answer.confirmed) close.mutate(row);
  }
  const rows = itemsOfPages(pages.data);

  return (
    <div className="grid gap-6">
      <PageHeader description="Pide a los gimnasios donde entrenas a gente que te muestren como entrenador." title={affiliationCopy.myGyms} />
      <RequestLinkForm />
      {pages.isPending ? (
        <SkeletonList rows={2} withAvatar={false} />
      ) : pages.isError ? (
        <ErrorPanel error={pages.error} message="No pudimos cargar tus gimnasios." onRetry={() => void pages.refetch()} />
      ) : rows.length === 0 ? (
        <EmptyState description={affiliationCopy.emptyLinks} title="Todavía sin gimnasios" />
      ) : (
        <ul className="m-0 grid list-none gap-2 p-0">
          {rows.map((row) => {
            const chip = affiliationChip(row);
            const action = ownAffiliationAction(row);
            const reason = affiliationReasonText(row.reasonCode, row.reasonNote);
            return (
              <li className="panel grid gap-2 px-5 py-4" key={row.id}>
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="font-semibold">{row.gym.name}</p>
                  <Badge tone={chip.tone}>{chip.label}</Badge>
                </div>
                <p className="t-subhead text-[var(--text-muted)]">{[row.gym.handle ? `@${row.gym.handle}` : null, row.location?.name, `pedido el ${formatDate(row.requestedAt)}`].filter(Boolean).join(' · ')}</p>
                {reason ? <p className="t-subhead">{reason}</p> : null}
                {action ? (
                  <Button className="justify-self-start" loading={close.isPending && close.variables?.id === row.id} onClick={() => void ask(row)} size="sm" variant="ghost">
                    {action === 'cancel' ? affiliationCopy.cancel : affiliationCopy.leaveCoach}
                  </Button>
                ) : null}
              </li>
            );
          })}
        </ul>
      )}
      {pages.hasNextPage ? (
        <Button className="justify-self-center" loading={pages.isFetchingNextPage} onClick={() => void pages.fetchNextPage()} variant="ghost">
          Ver más
        </Button>
      ) : null}
    </div>
  );
}
