/**
 * Restauración de la sesión al arrancar, sin dependencias de React Native para
 * poder probarla con `node --test`.
 *
 * Regla: **sólo un rechazo del servidor cierra la sesión**. Sin red, un plazo
 * agotado o un 5xx no dicen nada sobre si la sesión sigue siendo válida, así
 * que no se borra nada. Con copia local del principal se entra al momento y
 * `/auth/me` se valida en segundo plano; sin copia (instalaciones de antes de
 * guardarla) se espera a `/auth/me`, y si no contesta se muestra el acceso sin
 * borrar los tokens, de modo que el siguiente arranque con red la recupera.
 */
export type RestoreSessionSteps<P> = {
  hasAccessToken: () => Promise<boolean>;
  /** La copia local, ya validada; `null` si no hay o no pasa el esquema. */
  readCachedPrincipal: () => Promise<P | null>;
  fetchPrincipal: () => Promise<P>;
  /** `true` sólo si el error es un rechazo de la sesión (401 tras renovar). */
  isSessionRejected: (error: unknown) => boolean;
  /** Entra con este principal (arranque o validación en segundo plano). */
  authenticate: (principal: P, origin: 'cache' | 'server') => void | Promise<void>;
  /** Rechazo del servidor: borra tokens y copia, y manda al acceso. */
  signOut: () => void | Promise<void>;
  /** No hay con qué entrar ahora, pero tampoco motivo para borrar nada. */
  showLogin: () => void;
};

export async function restoreSession<P>(steps: RestoreSessionSteps<P>): Promise<void> {
  if (!(await steps.hasAccessToken())) {
    steps.showLogin();
    return;
  }

  const cached = await steps.readCachedPrincipal();
  if (cached) await steps.authenticate(cached, 'cache');

  try {
    const principal = await steps.fetchPrincipal();
    await steps.authenticate(principal, 'server');
  } catch (error) {
    if (steps.isSessionRejected(error)) {
      await steps.signOut();
      return;
    }
    if (!cached) steps.showLogin();
  }
}
