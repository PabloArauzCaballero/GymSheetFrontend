import { describe, expect, it } from 'vitest';
import type { StoryFeedEntry } from '@/shared/api/schemas';
import { locateStoryInFeed } from './story-feed-location';

const entry = (userId: string, storyIds: string[]) => ({
  userId,
  stories: storyIds.map((id) => ({ id })),
}) as StoryFeedEntry;

describe('locateStoryInFeed', () => {
  it('returns the current position after feed reordering', () => {
    expect(locateStoryInFeed([entry('b', ['b1']), entry('a', ['a1', 'a2'])], 'a2'))
      .toEqual({ userIndex: 1, storyIndex: 1 });
  });

  it('returns null after the active story is removed', () => {
    expect(locateStoryInFeed([entry('a', ['a2'])], 'a1')).toBeNull();
  });
});
