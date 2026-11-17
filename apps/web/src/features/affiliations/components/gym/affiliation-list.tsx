'use client';

import { affiliationCopy } from '@gymsheet/domain';
import { itemsOfPages } from '@gymsheet/hooks';
import { useInfiniteQuery } from '@tanstack/react-query';
import type { GymAffiliationsPage } from '@/shared/api/schemas';
import { EmptyState } from '@/shared/components/feedback/empty-state';
import { ErrorPanel } from '@/shared/components/feedback/error-panel';
import { SkeletonList } from '@/shared/components/feedback/skeleton';
import { Button } from '@/shared/components/ui/button';
import { errorCodeOf } from '../../services/affiliations-client';
import type { PlanChip } from '@/features/subscriptions/components/business/use-socio-plans';
import { AffiliationRow } from './affiliation-row';

/**
 * One tab of «Socios»: a cursor list of rows. The inbox answers 409
 * GYM_NOT_ACTIVE while the gym is not public: that is a state, explained.
 */
export function AffiliationList({
  queryKey,
  load,
  empty,
  planOf,
}: Readonly<{ queryKey: readonly unknown[]; load: (cursor: string | null) => Promise<GymAffiliationsPage>; empty: string; planOf?: (affiliationId: string) => PlanChip | null }>) {
  const pages = useInfiniteQuery({
    queryKey,
    queryFn: ({ pageParam }) => load(pageParam),
    initialPageParam: null as string | null,
    getNextPageParam: (page) => page.nextCursor,
    retry: false,
  });
  if (pages.isPending) return <SkeletonList rows={3} />;
  if (pages.isError) {
    if (errorCodeOf(pages.error) === 'GYM_NOT_ACTIVE') return <EmptyState description={affiliationCopy.gymNotActive} level={3} title="Tu gimnasio no está publicado" />;
    return <ErrorPanel error={pages.error} message="No pudimos cargar la lista." onRetry={() => void pages.refetch()} />;
  }
  const rows = itemsOfPages(pages.data);
  if (rows.length === 0) return <EmptyState description={empty} level={3} title="Nada por aquí" />;
  return (
    <div className="grid gap-3">
      <ul className="m-0 grid list-none gap-3 p-0">
        {rows.map((row) => (
          <AffiliationRow key={row.id} plan={planOf?.(row.id) ?? null} row={row} />
        ))}
      </ul>
      {pages.hasNextPage ? (
        <Button className="justify-self-center" loading={pages.isFetchingNextPage} onClick={() => void pages.fetchNextPage()} variant="ghost">
          Ver más
        </Button>
      ) : null}
    </div>
  );
}
