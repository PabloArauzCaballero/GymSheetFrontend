import type { StoryFeedEntry } from '@/shared/api/schemas';

export function locateStoryInFeed(
  entries: readonly StoryFeedEntry[],
  storyId: string,
): { userIndex: number; storyIndex: number } | null {
  for (let userIndex = 0; userIndex < entries.length; userIndex += 1) {
    const storyIndex = entries[userIndex]?.stories.findIndex((story) => story.id === storyId) ?? -1;
    if (storyIndex !== -1) return { userIndex, storyIndex };
  }
  return null;
}
