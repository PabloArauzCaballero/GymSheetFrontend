/**
 * `lib.dom` declara `randomUUID` como siempre presente, asi que el tipo es
 * mas optimista que el navegador: sin este alias TypeScript estrecha `crypto`
 * a `never` en la rama del respaldo y no deja ni llamar a `getRandomValues`.
 */
type CryptoConRandomUuidOpcional = Omit<Crypto, 'randomUUID'> & {
  randomUUID?: () => string;
};

/**
 * UUID v4 que funciona TAMBIÉN fuera de contexto seguro.
 *
 * `crypto.randomUUID` sólo está definido en contexto seguro (HTTPS o
 * localhost). El entorno de TEST se sirve por HTTP plano, donde la propiedad
 * NO existe y llamarla lanza `TypeError: crypto.randomUUID is not a function`.
 * Dentro de `apiRequest` esa excepción salta al construir las cabeceras, o sea
 * ANTES del `fetch`: no se registra ninguna petición en la red y el `catch`
 * genérico la traduce a «No se pudo conectar con el servicio». El resultado era
 * que el panel, los ejercicios y los entrenamientos se veían caídos con el
 * backend perfectamente sano, sin un solo error en consola y con «Reintentar»
 * fallando igual al instante. Medido el 2026-09-16 en el despliegue de test:
 * `isSecureContext: false`, `typeof crypto.randomUUID === 'undefined'`.
 *
 * `crypto.getRandomValues` sí está disponible sin contexto seguro, así que el
 * respaldo genera un UUID v4 de verdad y no un identificador degradado: uno de
 * los usos es la clave de idempotencia con la que se renueva una membresía, y
 * ahí una colisión no es un detalle estético.
 */
export function randomUuid(): string {
  const webCrypto: CryptoConRandomUuidOpcional = globalThis.crypto;
  if (typeof webCrypto.randomUUID === 'function') return webCrypto.randomUUID();
  const bytes = new Uint8Array(16);
  webCrypto.getRandomValues(bytes);
  const hex = Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('');
  // Nibble 12 = versión (4). Nibble 16 = variante RFC 4122 (10xx).
  const variante = ((Number.parseInt(hex.slice(16, 17), 16) & 0x3) | 0x8).toString(16);
  return [
    hex.slice(0, 8),
    hex.slice(8, 12),
    `4${hex.slice(13, 16)}`,
    `${variante}${hex.slice(17, 20)}`,
    hex.slice(20, 32),
  ].join('-');
}
