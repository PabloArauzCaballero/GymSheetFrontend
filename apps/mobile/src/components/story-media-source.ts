/**
 * Builds an authenticated story-media URL and refuses foreign origins.
 * Story media may carry a bearer token in the native image/video request, so a
 * stale public-storage URL must never be allowed to receive that credential.
 */
export function resolveStoryMediaSource(mediaUrl: string, apiUrl: string): string | null {
  try {
    const apiRoot = new URL(apiUrl);
    const candidate = new URL(mediaUrl, apiRoot);
    if (candidate.origin !== apiRoot.origin) return null;

    const apiPrefix = apiRoot.pathname.replace(/\/+$/u, '');
    const urlPath = mediaUrl.startsWith(`${apiPrefix}/`)
      ? mediaUrl.slice(apiPrefix.length + 1)
      : mediaUrl.replace(/^\/+/, '');
    return new URL(urlPath, `${apiUrl.replace(/\/+$/u, '')}/`).toString();
  } catch {
    return null;
  }
}
