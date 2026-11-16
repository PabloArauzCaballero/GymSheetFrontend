/**
 * Files the backend serves itself from its local media mount.
 *
 * With `MEDIA_STORAGE_PROVIDER=local` the backend publishes uploads (profile
 * photos among them) under `<backend origin>/media/…`, an absolute URL on
 * `localhost` or a private host. The media proxy refuses those hosts to stop
 * SSRF, so every proxied `<img>` of such a photo broke. This maps that URL to
 * the backend origin the BFF already talks to, and only when it matches an
 * origin taken from our own configuration — never from the request — and the
 * path stays inside the media mount.
 */
const MEDIA_MOUNT = '/media/';

export function backendMediaTarget(
  raw: string,
  {
    internalOrigin,
    publicOrigins,
  }: Readonly<{ internalOrigin: string; publicOrigins: readonly (string | undefined)[] }>,
): URL | null {
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    return null;
  }
  if (url.protocol !== 'http:' && url.protocol !== 'https:') return null;
  if (url.username || url.password) return null;
  const known = [internalOrigin, ...publicOrigins].map((origin) => (origin ? originOf(origin) : ''));
  if (!known.includes(url.origin)) return null;
  // `new URL` already collapsed `..` and `%2e%2e` segments, so the prefix check
  // cannot be escaped into the API routes.
  if (!url.pathname.startsWith(MEDIA_MOUNT) || url.pathname.length === MEDIA_MOUNT.length) return null;
  return new URL(url.pathname, originOf(internalOrigin));
}

function originOf(value: string): string {
  try {
    return new URL(value).origin;
  } catch {
    return '';
  }
}
