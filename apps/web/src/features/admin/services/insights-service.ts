import { z } from 'zod';
import { apiRequest } from '@/shared/api/api-client';

/**
 * The portal's account list. The contract is declared here and not in
 * `@gymsheet/schemas` because only the administration portal reads it.
 */
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
   *
   * Since backend franja 8e the platform account search is `GET /admin/users`
   * (ADR-0026 §11), outside the retired membership module; same response shape.
   */
  users: (search: string, page = 1, pageSize = 50, roles?: string) => {
    const params = new URLSearchParams({ page: String(page), pageSize: String(pageSize) });
    if (search) params.set('q', search);
    if (roles) params.set('roles', roles);
    return apiRequest(`/admin/users?${params.toString()}`, portalUserPageSchema, {
      method: 'GET',
    });
  },
};
