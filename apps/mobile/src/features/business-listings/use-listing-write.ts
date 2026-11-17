import { queryKeys } from '@gymsheet/hooks';
import type { OwnListing } from '@gymsheet/schemas';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { notify } from '@/notifications';
import { listingErrorText } from './listings-service';

/** One write of the editor: the answer replaces the cached listing, the lists refresh behind. */
export function useListingWrite<TInput>(listingId: string, write: (input: TInput) => Promise<OwnListing>, success: string) {
  const client = useQueryClient();
  return useMutation({
    mutationFn: write,
    onSuccess: (listing) => {
      client.setQueryData(queryKeys.business.listing(listingId), listing);
      void client.invalidateQueries({ queryKey: queryKeys.business.listings, predicate: (query) => query.queryKey[3] === 'list' });
      notify.success(success);
    },
    onError: (error) => notify.error(listingErrorText(error)),
  });
}
