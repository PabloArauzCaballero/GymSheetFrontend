import { resolveStoryMediaSource } from './story-media-source.ts';

type ThumbnailStory = {
  mediaUrl: string;
  mediaType: 'image' | 'video';
  viewedByMe: boolean;
};

/**
 * Which story the ring previews: the one the viewer will open first (the first
 * unviewed), otherwise the most recent. Only images have a thumbnail — a video
 * would need a decoded frame — so a video keeps the person's avatar.
 *
 * Returns an absolute URL on the API origin, or `null` when the chosen story
 * has no safe image to show.
 */
export function storyThumbnailUrl(stories: readonly ThumbnailStory[], apiUrl: string): string | null {
  const story = stories.find((item) => !item.viewedByMe) ?? stories[stories.length - 1];
  if (!story || story.mediaType !== 'image') return null;
  return resolveStoryMediaSource(story.mediaUrl, apiUrl);
}
