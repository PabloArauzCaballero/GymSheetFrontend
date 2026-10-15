export type StoryAudienceMode = 'ALL_CONNECTIONS' | 'SELECTED_CONNECTIONS';
export type AcceptedConnectionsState = 'loading' | 'error' | 'loaded';

/** The selected audience can submit only after connections loaded successfully and at least one person is chosen. */
export function canSubmitStoryAudience(
  mode: StoryAudienceMode,
  recipientIds: readonly string[],
  connectionsState: AcceptedConnectionsState,
): boolean {
  if (mode === 'ALL_CONNECTIONS') return true;
  return connectionsState === 'loaded' && recipientIds.length > 0;
}

/** Updates the checkbox selection without adding duplicate user IDs. */
export function toggleStoryAudienceRecipient(
  recipientIds: readonly string[],
  userId: string,
  selected: boolean,
): string[] {
  if (!selected) return recipientIds.filter((id) => id !== userId);
  return recipientIds.includes(userId) ? [...recipientIds] : [...recipientIds, userId];
}
