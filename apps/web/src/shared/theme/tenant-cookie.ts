/**
 * Inquilino de la sesión del navegador.
 *
 * La marca entra por la URL de acceso —`https://dominio/topfitness`— y a partir
 * de ahí viaja en una cookie. El prefijo es la puerta de entrada, no un
 * segmento que haya que arrastrar en cada enlace: mantenerlo en la ruta
 * obligaría a que cada `href` de la aplicación lo reescribiera, y bastaría un
 * enlace olvidado para devolver al usuario a la marca genérica a mitad de
 * sesión.
 */
export const TENANT_COOKIE = 'gymsheet_tenant';

/** Un año: la marca de un gimnasio no cambia entre visitas. */
export const TENANT_COOKIE_MAX_AGE = 60 * 60 * 24 * 365;
