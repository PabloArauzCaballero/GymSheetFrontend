import { affiliationCopy } from '@gymsheet/domain';
import { itemsOfPages, personAffiliationKeys, queryKeys } from '@gymsheet/hooks';
import type { Affiliation } from '@gymsheet/schemas';
import { useInfiniteQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { EmptyState, ErrorState, RowsSkeleton } from '@/components/feedback';
import { ScreenHeader, ScrollScreen } from '@/components/layout';
import { Button } from '@/components/ui';
import { affiliationErrorText, personAffiliationsService } from '@/features/affiliations/affiliations-service';
import { OwnAffiliationRow } from '@/features/affiliations/own-affiliation-row';
import { notify } from '@/notifications';

/** «Mis afiliaciones» (franja 7b): every request and membership with its state, newest first. */
export default function MyAffiliationsScreen() {
  const client = useQueryClient();
  const pages = useInfiniteQuery({
    queryKey: [...queryKeys.affiliations.all, 'pages'],
    queryFn: ({ pageParam }) => personAffiliationsService.list({ cursor: pageParam, limit: 20 }),
    initialPageParam: null as string | null,
    getNextPageParam: (page) => page.nextCursor,
  });
  const close = useMutation({
    mutationFn: (row: Affiliation) => (row.status === 'REQUESTED' ? personAffiliationsService.cancel(row.id) : personAffiliationsService.end(row.id)),
    onSuccess: () => {
      for (const key of personAffiliationKeys()) void client.invalidateQueries({ queryKey: key });
      notify.success('Listo.');
    },
    onError: (error) => notify.error(affiliationErrorText(error)),
  });
  const rows = itemsOfPages(pages.data);
  return (
    <ScrollScreen onRefresh={() => void pages.refetch()} refreshing={pages.isRefetching}>
      <ScreenHeader detail title={affiliationCopy.myAffiliations} />
      {pages.isPending ? (
        <RowsSkeleton rows={3} thumb={0} />
      ) : pages.isError ? (
        <ErrorState error={pages.error} onRetry={() => void pages.refetch()} />
      ) : rows.length === 0 ? (
        <EmptyState icon="business-outline" message={affiliationCopy.emptyMine} title="Sin afiliaciones" />
      ) : (
        rows.map((row) => <OwnAffiliationRow busy={close.isPending && close.variables?.id === row.id} key={row.id} onClose={(item) => close.mutate(item)} row={row} />)
      )}
      {pages.hasNextPage ? <Button label="Ver más" loading={pages.isFetchingNextPage} onPress={() => void pages.fetchNextPage()} variant="ghost" /> : null}
    </ScrollScreen>
  );
}
