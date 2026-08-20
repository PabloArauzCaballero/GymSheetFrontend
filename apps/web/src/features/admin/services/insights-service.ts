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

export const insightsService = {
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
