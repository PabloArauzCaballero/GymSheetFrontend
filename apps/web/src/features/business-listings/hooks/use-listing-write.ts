'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '@/shared/api/query-keys';
import type { OwnListing } from '@/shared/api/schemas';
import { notify } from '@/shared/notifications';
import { listingErrorText } from '../lib/listing-errors';

/**
 * One write of the listing editor: the answer replaces the cached listing at
 * once (the backend returns the whole `Listing`), the lists refresh in the
 * background, and an error is said in Spanish with our copy for its code.
 */
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
