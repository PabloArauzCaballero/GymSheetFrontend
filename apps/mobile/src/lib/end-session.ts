/**
 * Orden y garantías del cierre de sesión, sin dependencias de React Native para
 * poder probarlo con `node --test`.
 *
 * 1. Baja del aviso push: necesita el bearer, así que va antes de borrar nada.
 * 2. Revocación del refresh en el servidor: `POST /auth/logout` exige el
 *    refresh en el cuerpo. Antes el móvil lo llamaba sin cuerpo, el servidor
 *    respondía 400 y el `catch` se lo tragaba: el refresh seguía vivo siete
 *    días aunque la persona hubiera cerrado sesión.
 * 3. Borrado local, **siempre**, falle lo que falle antes. Cerrar sesión no
 *    puede quedarse a medias por falta de red.
 */
export type EndSessionSteps = {
  unregisterPush: () => Promise<void>;
  getRefreshToken: () => Promise<string | null>;
  revokeRefreshToken: (refreshToken: string) => Promise<void>;
  clearTokens: () => Promise<void>;
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
    if (refreshToken) await steps.revokeRefreshToken(refreshToken);
  } catch {
    // Revocación remota de buena fe; lo local se borra igual.
  }
  await steps.clearTokens();
}
