import { z } from 'zod';
import { apiRequest } from '@/shared/api/api-client';
import type {
  AccessPoint,
  Branch,
  MaintenanceEvent,
  MaintenanceStatus,
  MaintenanceType,
  Page,
  Room,
  RoomType,
} from '@/shared/api/contracts';
import { branchSchema, maintenanceSchema, pageSchema, roomSchema } from '@/shared/api/schemas';

const accessPointSchema = z.object({
  id: z.string().uuid(),
  sedeId: z.string().uuid(),
  salaId: z.string().uuid().nullable(),
  codigo: z.string(),
  nombre: z.string(),
  direccionPermitida: z.enum(['ENTRY', 'EXIT', 'BOTH']),
  estado: z.enum(['ACTIVE', 'INACTIVE']),
  metadata: z.record(z.string(), z.unknown()),
});

export type BranchInput = {
  codigo: string;
  nombre: string;
  descripcion?: string | null;
  zonaHoraria?: string;
  metadata?: Record<string, unknown>;
};

export type RoomInput = {
  sedeId: string;
  codigo: string;
  nombre: string;
  tipoSala: RoomType;
  capacidad?: number | null;
  metadata?: Record<string, unknown>;
};

export type MaintenanceInput = {
  equipoId: string;
  tipo: MaintenanceType;
  programadoPara: string;
  descripcion: string;
  proveedor?: string | null;
  tecnico?: string | null;
  metadata?: Record<string, unknown>;
};

export const facilitiesAdminService = {
  listBranches: (page = 1) =>
    apiRequest<Page<Branch>>(
      `/admin/facilities/branches?page=${page}&pageSize=25`,
      pageSchema(branchSchema),
    ),
  createBranch: (input: BranchInput) =>
    apiRequest<Branch>('/admin/facilities/branches', branchSchema, { method: 'POST', body: input }),
  updateBranch: (
    id: string,
    input: Partial<Omit<BranchInput, 'codigo'>> & { estado?: 'ACTIVE' | 'INACTIVE' },
  ) =>
    apiRequest<Branch>(`/admin/facilities/branches/${id}`, branchSchema, {
      method: 'PATCH',
      body: input,
    }),
  listRooms: (page = 1, branchId?: string) =>
    apiRequest<Page<Room>>(
      `/admin/facilities/rooms?page=${page}&pageSize=25${branchId ? `&branchId=${encodeURIComponent(branchId)}` : ''}`,
      pageSchema(roomSchema),
    ),
  createRoom: (input: RoomInput) =>
    apiRequest<Room>('/admin/facilities/rooms', roomSchema, { method: 'POST', body: input }),
  updateRoom: (
    id: string,
    input: Partial<Omit<RoomInput, 'sedeId' | 'codigo'>> & { estado?: Room['estado'] },
  ) =>
    apiRequest<Room>(`/admin/facilities/rooms/${id}`, roomSchema, { method: 'PATCH', body: input }),
  listAccessPoints: (branchId?: string) =>
    apiRequest<AccessPoint[]>(
      `/admin/facilities/access-points${branchId ? `?branchId=${encodeURIComponent(branchId)}` : ''}`,
      z.array(accessPointSchema),
    ),
  createAccessPoint: (input: {
    sedeId: string;
    salaId?: string | null;
    codigo: string;
    nombre: string;
    direccionPermitida?: 'ENTRY' | 'EXIT' | 'BOTH';
    metadata?: Record<string, unknown>;
  }) =>
    apiRequest<AccessPoint>('/admin/facilities/access-points', accessPointSchema, {
      method: 'POST',
      body: input,
    }),
  assignEquipment: (input: { equipoId: string; salaId: string; notas?: string | null }) =>
    apiRequest('/admin/facilities/equipment-assignments', z.record(z.string(), z.unknown()), {
      method: 'POST',
      body: input,
    }),
  listMaintenance: (page = 1, estado?: MaintenanceStatus) =>
    apiRequest<Page<MaintenanceEvent>>(
      `/admin/facilities/maintenance?page=${page}&pageSize=25${estado ? `&estado=${estado}` : ''}`,
      pageSchema(maintenanceSchema),
    ),
  scheduleMaintenance: (input: MaintenanceInput) =>
    apiRequest<MaintenanceEvent>('/admin/facilities/maintenance', maintenanceSchema, {
      method: 'POST',
      body: input,
    }),
  startMaintenance: (id: string) =>
    apiRequest<MaintenanceEvent>(`/admin/facilities/maintenance/${id}/start`, maintenanceSchema, {
      method: 'PATCH',
    }),
  completeMaintenance: (
    id: string,
    input: {
      hallazgos?: string | null;
      resolucion: string;
      costo?: number | null;
      moneda?: string | null;
    },
  ) =>
    apiRequest<MaintenanceEvent>(
      `/admin/facilities/maintenance/${id}/complete`,
      maintenanceSchema,
      { method: 'PATCH', body: input },
    ),
};
