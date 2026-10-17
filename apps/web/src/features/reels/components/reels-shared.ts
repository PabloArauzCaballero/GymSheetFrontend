export const feedKey = ['reels', 'feed'] as const;
export const allowedVideoTypes = new Set(['video/mp4', 'video/quicktime']);

export function formatDuration(seconds: number) {
  const rounded = Math.round(seconds);
  return `${Math.floor(rounded / 60)}:${String(rounded % 60).padStart(2, '0')}`;
}
