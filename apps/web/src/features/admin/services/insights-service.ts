import { z } from 'zod';
import { apiRequest } from '@/shared/api/api-client';

/**
 * Las tres preguntas del panel de operación.
 *
 * Los contratos se declaran aquí y no en `@gymsheet/schemas` porque son
 * informes del portal de administración: no los consume la aplicación móvil, y
 * meterlos en el paquete compartido obligaría a versionarlos con ella.
 */
export const equipmentUsageRowSchema = z.object({
  equipoId: z.string().uuid().nullable(),
  nombre: z.string(),
  tipo: z.string().nullable(),
  series: z.number().int(),
  sesiones: z.number().int(),
  personas: z.number().int(),
});

export const peopleFlowRowSchema = z.object({
  dia: z.string(),
  sesionesApp: z.number().int(),
  personasApp: z.number().int(),
  entradas: z.number().int(),
  personasEntrada: z.number().int(),
});

export const lapsedMemberSchema = z.object({
  usuarioId: z.string().uuid(),
  nombreCompleto: z.string(),
  email: z.string(),
  telefono: z.string().nullable(),
  plan: z.string().nullable(),
  vencioEl: z.string().nullable(),
  diasVencido: z.number().int().nullable(),
});

export type EquipmentUsageRow = z.infer<typeof equipmentUsageRowSchema>;
export type PeopleFlowRow = z.infer<typeof peopleFlowRowSchema>;
export type LapsedMember = z.infer<typeof lapsedMemberSchema>;

export const portalUserSchema = z.object({
  id: z.string().uuid(),
  nombreCompleto: z.string(),
  email: z.string(),
  rol: z.string(),
  estado: z.string(),
  tenantId: z.string().nullable(),
  telefono: z.string().nullable(),
  plan: z.string().nullable(),
  venceEl: z.string().nullable(),
  vigente: z.boolean(),
  ultimaSesion: z.string().nullable(),
});

export type PortalUser = z.infer<typeof portalUserSchema>;

/**
 * Página de cuentas.
 *
 * Antes el listado pedía `limit=200` y recibía un array suelto: a partir del
 * socio 201 la tabla simplemente dejaba de tener gente, sin decirlo. Ahora el
 * backend pagina de verdad y devuelve el total, que es lo que permite mostrar
 * «41 cuentas» y no una lista que podría estar recortada.
 */
export const portalUserPageSchema = z.object({
  items: z.array(portalUserSchema),
  page: z.number().int(),
  pageSize: z.number().int(),
  total: z.number().int(),
  totalPages: z.number().int(),
});

export type PortalUserPage = z.infer<typeof portalUserPageSchema>;

/** Roles con los que se puede trabajar en el gimnasio (todo menos el cliente). */
export const STAFF_ROLE_FILTER = 'ADMIN,COACH,FRONT_DESK,ENTRENADOR_EXTERNO';

export const insightsService = {
  /**
   * `roles` lo aplica el servidor, no el navegador.
   *
   * Filtrar aquí después de recibir la página sería perder gente: el personal
   * que cayera fuera de la página pedida simplemente no existiría para quien
   * busca, y el fallo crece con el tamaño del gimnasio.
   */
  users: (search: string, page = 1, pageSize = 50, roles?: string) => {
    const params = new URLSearchParams({ page: String(page), pageSize: String(pageSize) });
    if (search) params.set('q', search);
    if (roles) params.set('roles', roles);
    return apiRequest(`/admin/membership/users?${params.toString()}`, portalUserPageSchema, {
      method: 'GET',
    });
  },
  equipmentUsage: (days: number) =>
    apiRequest(
      `/admin/membership/insights/equipment-usage?days=${days}`,
      z.array(equipmentUsageRowSchema),
      { method: 'GET' },
    ),
  peopleFlow: (days: number) =>
    apiRequest(
      `/admin/membership/insights/people-flow?days=${days}`,
      z.array(peopleFlowRowSchema),
      { method: 'GET' },
    ),
  lapsed: (limit = 50) =>
    apiRequest(`/admin/membership/insights/lapsed?limit=${limit}`, z.array(lapsedMemberSchema), {
      method: 'GET',
    }),
};
