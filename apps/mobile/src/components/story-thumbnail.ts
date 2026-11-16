import { resolveStoryMediaSource } from './story-media-source.ts';

type ThumbnailStory = {
  mediaUrl: string;
  /** Server-made small square; `null` for videos, absent on an older backend. */
  thumbnailUrl?: string | null;
  mediaType: 'image' | 'video';
  viewedByMe: boolean;
};

/**
 * Which story the ring previews: the one the viewer will open first (the first
 * unviewed), otherwise the most recent. Uses the server's small thumbnail
 * (~1 KB instead of the full photo); an older backend without it falls back to
 * the full image. Only images have one, so a video keeps the person's avatar.
 *
 * Returns an absolute URL on the API origin, or `null` when the chosen story
 * has no safe image to show.
 */
export function storyThumbnailUrl(stories: readonly ThumbnailStory[], apiUrl: string): string | null {
  const story = stories.find((item) => !item.viewedByMe) ?? stories[stories.length - 1];
  if (!story || story.mediaType !== 'image') return null;
  const source = story.thumbnailUrl === undefined ? story.mediaUrl : story.thumbnailUrl;
  return source ? resolveStoryMediaSource(source, apiUrl) : null;
}
