/**
 * Orden y garantías del cierre de sesión, sin dependencias de React Native para
 * poder probarlo con `node --test`.
 *
 * 1. Baja del aviso push: necesita el bearer, así que va antes de borrar nada.
 * 2. Revocación del refresh en el servidor: `POST /auth/logout` exige el
 *    refresh en el cuerpo. Antes el móvil lo llamaba sin cuerpo, el servidor
 *    respondía 400 y el `catch` se lo tragaba: el refresh seguía vivo siete
 *    días aunque la persona hubiera cerrado sesión.
 *    With quick login on, the refresh is parked behind biometrics instead
 *    (`parkForQuickLogin` returns `true`) and is not revoked: it is what the
 *    next Face ID / fingerprint entry exchanges. See `storage/quick-login.ts`.
 * 3. Borrado local, **siempre**, falle lo que falle antes. Cerrar sesión no
 *    puede quedarse a medias por falta de red.
 */
export type EndSessionSteps = {
  unregisterPush: () => Promise<void>;
  getRefreshToken: () => Promise<string | null>;
  revokeRefreshToken: (refreshToken: string) => Promise<void>;
  clearTokens: () => Promise<void>;
  /** `true` when the token was parked for quick login and must stay alive. */
  parkForQuickLogin?: (refreshToken: string) => Promise<boolean>;
  /** Files this account left on the device (the downloaded data export). Best effort. */
  clearCachedFiles?: () => Promise<void>;
};

export async function endSession(steps: EndSessionSteps): Promise<void> {
  try {
    await steps.unregisterPush();
  } catch {
    // Igual que el alta del aviso: nunca bloquea el cierre.
  }
  try {
    // Se lee después de la baja del push: si esa petición renovó la sesión, el
    // refresh vigente es el nuevo, y revocar el viejo dejaría vivo el bueno.
    const refreshToken = await steps.getRefreshToken();
    if (refreshToken) {
      const parked = (await steps.parkForQuickLogin?.(refreshToken).catch(() => false)) ?? false;
      if (!parked) await steps.revokeRefreshToken(refreshToken);
    }
  } catch {
    // Revocación remota de buena fe; lo local se borra igual.
  }
  await steps.clearTokens();
  // The next person to sign in on this device must not find this account's data.
  await steps.clearCachedFiles?.().catch(() => undefined);
}
