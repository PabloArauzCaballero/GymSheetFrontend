/**
 * `Secure` impide que el navegador devuelva la cookie por HTTP plano: el usuario
 * inicia sesion, recibe la cookie y en la peticion siguiente vuelve a estar
 * deslogueado, sin ningun error visible. En despliegues servidos por HTTPS es lo
 * correcto y por eso sigue siendo el valor por defecto; `AUTH_COOKIE_SECURE`
 * existe para el entorno de TEST del VPS de Contabo, que se publica por HTTP
 * plano en un dominio `sslip.io`. Se lee en ejecucion (no es `NEXT_PUBLIC_`), asi
 * que cambiarla es una variable y un reinicio, no una reconstruccion.
 *
 * Without `server-only` on purpose: `proxy.ts` sets the installation cookie too.
 */
export function cookieSecure(): boolean {
  const override = process.env.AUTH_COOKIE_SECURE;
  if (override === 'true') return true;
  if (override === 'false') return false;
  return process.env.NODE_ENV === 'production';
}
