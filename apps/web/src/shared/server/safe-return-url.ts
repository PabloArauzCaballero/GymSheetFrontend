function hasUnsafeCharacter(value: string): boolean {
  for (const character of value) {
    const code = character.codePointAt(0) ?? 0;
    if (code <= 0x1f || code === 0x7f || character === '\\') return true;
  }
  return false;
}

/**
 * Only a path of this same site. A prefix check let `/\evil.com` through:
 * the URL parser reads `\` as `/`, so it resolved to another origin.
 */
export function safeReturnUrl(requested: string | null, base: string): URL {
  const fallback = new URL('/login', base);
  if (!requested?.startsWith('/') || hasUnsafeCharacter(requested)) return fallback;
  const target = new URL(requested, base);
  return target.origin === fallback.origin ? target : fallback;
}
