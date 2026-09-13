import { queryKeys } from '@/shared/api/query-keys';

/**
 * Claves de caché del catálogo de socios.
 *
 * Todo cuelga de `gym-directory` a propósito: el directorio, la baraja y la
 * ficha de un socio son **la misma verdad** vista de tres formas, y un
 * «conectar» las desactualiza a las tres a la vez. Con un solo prefijo,
 * invalidar es una línea; con tres familias sueltas, es tres líneas que alguien
 * olvidará el día que añada la cuarta superficie.
 *
 * Viven aquí y no en `@gymsheet/hooks` porque son claves de esta app: el móvil
 * usa las suyas (`['social', 'directory', …]`) y coordinar dos aplicaciones
 * para un cambio de caché de una sola no compra nada.
 */
export const directoryKeys = {
  all: ['gym-directory'] as const,
  list: (filterKey: string) => ['gym-directory', 'list', filterKey] as const,
  deck: (filterKey: string) => ['gym-directory', 'deck', filterKey] as const,
  member: (userId: string) => ['gym-directory', 'member', userId] as const,
  /** Las sedes del gimnasio propio, que alimentan el filtro por sucursal. */
  myBranches: ['facilities', 'my-branches'] as const,
};

/**
 * Las conexiones, **una clave por estado**.
 *
 * `queryKeys.connections` es una sola clave para `/me/connections`, y tres
 * pantallas la usaban con tres filtros distintos: solicitudes pendientes,
 * conexiones aceptadas y el punto de aviso de la cabecera de Comunidad. Con la
 * misma clave, TanStack Query las considera **la misma consulta**: la primera
 * que monta decide qué `queryFn` corre, así que «Mis conexiones» podía acabar
 * pintando las solicitudes pendientes y al revés. Sólo no se notaba porque las
 * dos vivían en pestañas que no coexistían.
 *
 * El estado entra en la clave y el prefijo se conserva, de modo que todas las
 * invalidaciones que ya existen con `queryKeys.connections` siguen alcanzando a
 * las tres — TanStack compara por prefijo.
 */
export const connectionKeys = {
  byStatus: (status: 'PENDING' | 'ACCEPTED' | 'REJECTED') =>
    [...queryKeys.connections, status] as const,
};
