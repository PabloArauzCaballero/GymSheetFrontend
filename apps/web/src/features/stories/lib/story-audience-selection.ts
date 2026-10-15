export type StoryAudienceMode = 'ALL_CONNECTIONS' | 'SELECTED_CONNECTIONS';
export type AcceptedConnectionsState = 'loading' | 'error' | 'loaded';

/** Selected audiences require a successful connection load and at least one recipient. */
export function canSubmitStoryAudience(
  mode: StoryAudienceMode,
  recipientIds: readonly string[],
  connectionsState: AcceptedConnectionsState,
): boolean {
  if (mode === 'ALL_CONNECTIONS') return true;
  return connectionsState === 'loaded' && recipientIds.length > 0;
}
