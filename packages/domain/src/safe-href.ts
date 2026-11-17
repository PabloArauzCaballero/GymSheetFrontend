/**
 * A link target safe to render in `href`: absolute http(s) URLs and
 * same-origin paths only. Anything else (`javascript:`, `data:`, `vbscript:`,
 * protocol-relative `//host`) returns undefined so the caller renders text.
 * Content shown to moderators comes from members, so it is never trusted.
 */
export function safeHref(value: string | null | undefined): string | undefined {
  if (!value) return undefined;
  const trimmed = value.trim();
  if (trimmed.startsWith('/') && !trimmed.startsWith('//') && !trimmed.startsWith('/\\')) return trimmed;
  try {
    const parsed = new URL(trimmed);
    return parsed.protocol === 'https:' || parsed.protocol === 'http:' ? parsed.href : undefined;
  } catch {
    return undefined;
  }
}
