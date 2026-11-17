'use client';

import { affiliationChip, affiliationCopy, affiliationKindLabels, affiliationReasonText, ownAffiliationAction } from '@gymsheet/domain';
import { useInfiniteQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import Link from 'next/link';
import { itemsOfPages, personAffiliationKeys, queryKeys } from '@/shared/api/query-keys';
import type { Affiliation } from '@/shared/api/schemas';
import { EmptyState } from '@/shared/components/feedback/empty-state';
import { ErrorPanel } from '@/shared/components/feedback/error-panel';
import { SkeletonList } from '@/shared/components/feedback/skeleton';
import { PageHeader } from '@/shared/components/layout/page-header';
import { Badge } from '@/shared/components/ui/badge';
import { Button } from '@/shared/components/ui/button';
import { confirm, notify } from '@/shared/notifications';
import { formatDate } from '@/shared/lib/date';
import { affiliationErrorText, personAffiliationsService } from '../../services/affiliations-client';

/**
 * «Mis afiliaciones»: every request and membership with its state, newest
 * first. A request can be cancelled; a confirmed one, left.
 */
export function MyAffiliationsList() {
  const client = useQueryClient();
  const pages = useInfiniteQuery({
    queryKey: [...queryKeys.affiliations.all, 'pages'],
    queryFn: ({ pageParam }) => personAffiliationsService.list({ cursor: pageParam, limit: 20 }),
    initialPageParam: null as string | null,
    getNextPageParam: (page) => page.nextCursor,
  });
  const close = useMutation({
    mutationFn: (row: Affiliation) => (ownAffiliationAction(row) === 'cancel' ? personAffiliationsService.cancel(row.id) : personAffiliationsService.end(row.id)),
    onSuccess: () => {
      for (const key of personAffiliationKeys()) void client.invalidateQueries({ queryKey: key });
      notify.success('Listo.');
    },
    onError: (error) => notify.error(affiliationErrorText(error)),
  });
  async function ask(row: Affiliation) {
    const cancel = ownAffiliationAction(row) === 'cancel';
    const label = cancel ? affiliationCopy.cancel : row.kind === 'SOCIO' ? affiliationCopy.leave : affiliationCopy.leaveCoach;
    const answer = await confirm({ title: `${label}: ${row.gym.name}`, message: cancel ? 'El gimnasio ya no la verá.' : 'El gimnasio deja de contarte.', confirmLabel: label, cancelLabel: 'Volver' });
    if (answer.confirmed) close.mutate(row);
  }
  const items = itemsOfPages(pages.data);

  return (
    <div className="mx-auto grid w-full max-w-2xl gap-6">
      <PageHeader title={affiliationCopy.myAffiliations} />
      {pages.isPending ? (
        <SkeletonList rows={3} withAvatar={false} />
      ) : pages.isError ? (
        <ErrorPanel error={pages.error} message="No pudimos cargar tus afiliaciones." onRetry={() => void pages.refetch()} />
      ) : items.length === 0 ? (
        <EmptyState description={affiliationCopy.emptyMine} title="Sin afiliaciones" />
      ) : (
        <ul className="m-0 grid list-none gap-2 p-0">
          {items.map((row) => {
            const chip = affiliationChip(row);
            const action = ownAffiliationAction(row);
            const reason = affiliationReasonText(row.reasonCode, row.reasonNote);
            return (
              <li className="panel grid gap-2 px-5 py-4" key={row.id}>
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="font-semibold">
                    {row.gym.handle ? <Link className="underline-offset-4 hover:underline" href={`/@${row.gym.handle}`}>{row.gym.name}</Link> : row.gym.name}
                  </p>
                  <Badge tone={chip.tone}>{chip.label}</Badge>
                </div>
                <p className="t-subhead text-[var(--text-muted)]">
                  {[affiliationKindLabels[row.kind], row.location?.name, `pedida el ${formatDate(row.requestedAt)}`].filter(Boolean).join(' · ')}
                </p>
                {reason ? <p className="t-subhead">{reason}</p> : null}
                {action ? (
                  <Button className="justify-self-start" loading={close.isPending && close.variables?.id === row.id} onClick={() => void ask(row)} size="sm" variant="ghost">
                    {action === 'cancel' ? affiliationCopy.cancel : row.kind === 'SOCIO' ? affiliationCopy.leave : affiliationCopy.leaveCoach}
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
