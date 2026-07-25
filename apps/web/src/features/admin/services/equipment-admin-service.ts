import { apiRequest } from '@/shared/api/api-client';
import type { Equipment, EquipmentStatus, EquipmentType } from '@/shared/api/contracts';
import { equipmentSchema } from '@/shared/api/schemas';

export type EquipmentAdminInput = {
  nombre: string;
  tipo: EquipmentType;
  descripcion?: string | null;
};

export const equipmentAdminService = {
  create: (input: EquipmentAdminInput) =>
    apiRequest<Equipment>('/admin/equipment', equipmentSchema, { method: 'POST', body: input }),
  update: (id: string, input: Partial<EquipmentAdminInput> & { estado?: EquipmentStatus }) =>
    apiRequest<Equipment>(`/admin/equipment/${id}`, equipmentSchema, {
      method: 'PATCH',
      body: input,
    }),
  inactivate: (id: string) =>
    apiRequest<Equipment>(`/admin/equipment/${id}`, equipmentSchema, { method: 'DELETE' }),
};
