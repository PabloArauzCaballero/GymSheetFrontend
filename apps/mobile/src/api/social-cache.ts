import type { QueryClient } from '@tanstack/react-query';

/** Refresh every cached view whose connection state changes after a social mutation. */
export async function refreshSocialRelationship(
  queryClient: Pick<QueryClient, 'invalidateQueries'>,
  options: { conversations?: boolean } = {},
): Promise<void> {
  const invalidations = [
    queryClient.invalidateQueries({ queryKey: ['social', 'directory'] }),
    queryClient.invalidateQueries({ queryKey: ['social', 'connections'] }),
    queryClient.invalidateQueries({
      queryKey: ['social-map'],
      predicate: ({ queryKey }) => queryKey[2] === 'areas' || queryKey[2] === 'people',
    }),
    queryClient.invalidateQueries({ queryKey: ['social', 'member-profile'] }),
  ];

  if (options.conversations) {
    invalidations.push(queryClient.invalidateQueries({ queryKey: ['chat', 'conversations'] }));
  }

  await Promise.all(invalidations);
}
