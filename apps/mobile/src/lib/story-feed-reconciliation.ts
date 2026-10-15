type StoryLike = { id: string; viewedByMe?: boolean };
type FeedEntryLike = { userId: string; stories: readonly StoryLike[] };
export type StoryCursorLike = { userId: string; storyId: string };

export type StoryFeedReconciliation =
  | { kind: 'keep' }
  | { kind: 'advance'; storyId: string }
  | { kind: 'close' };

/** Picks an unseen story first, then the first story when all have been seen. */
export function firstAvailableStoryId(entry: FeedEntryLike | undefined): string | null {
  if (!entry) return null;
  return entry.stories.find((story) => !story.viewedByMe)?.id ?? entry.stories[0]?.id ?? null;
}

/** Decide how to reconcile the open viewer against a newly fetched feed. */
export function reconcileStoryFeed(
  feed: readonly FeedEntryLike[],
  cursor: StoryCursorLike,
): StoryFeedReconciliation {
  const current = feed.find((entry) => entry.userId === cursor.userId);
  if (!current) return { kind: 'close' };
  if (current.stories.some((story) => story.id === cursor.storyId)) return { kind: 'keep' };
  const fallback = firstAvailableStoryId(current);
  return fallback ? { kind: 'advance', storyId: fallback } : { kind: 'close' };
}
