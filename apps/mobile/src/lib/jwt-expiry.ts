/**
 * Cuándo caduca un JWT, leyendo `exp` sin verificar la firma (eso es cosa del
 * servidor): solo sirve para renovar a tiempo. `null` si no se puede leer.
 */
export function jwtExpiresAtMs(token: string | null | undefined): number | null {
  const payload = token?.split('.')[1];
  if (!payload) return null;
  try {
    const base64 = payload.replace(/-/g, '+').replace(/_/g, '/');
    const padded = base64 + '='.repeat((4 - (base64.length % 4)) % 4);
    const parsed: unknown = JSON.parse(atob(padded));
    const exp = typeof parsed === 'object' && parsed !== null ? (parsed as { exp?: unknown }).exp : undefined;
    return typeof exp === 'number' && Number.isFinite(exp) ? exp * 1_000 : null;
  } catch {
    return null;
  }
}

/** El token ya caducó o lo hará dentro de `marginMs`: hay que renovarlo antes de usarlo en una URL de medios. */
export function isTokenExpiring(token: string | null | undefined, nowMs: number, marginMs = 60_000): boolean {
  const expiresAt = jwtExpiresAtMs(token);
  return expiresAt === null || expiresAt - nowMs <= marginMs;
}
