import { z } from 'zod';
import {
  maintenanceStatuses,
  maintenanceTypes,
  roomTypes,
} from '@gymsheet/types';

/**
 * Archivo del repositorio de medios. `creadoEl`/`actualizadoEl` llegan como
 * fecha ISO serializada por el backend; se validan como cadena porque el resto
 * de contratos del monorepo tratan las fechas igual.
 */
export const mediaFileSchema = z.object({
  id: z.string().uuid(),
  publicId: z.string().uuid(),
  codigo: z.string(),
  nombre: z.string(),
  tipo: z.string(),
  mimeType: z.string(),
  proveedor: z.string(),
  origen: z.string(),
  url: z.string(),
  altText: z.string(),
  width: z.number().int().nullable(),
  height: z.number().int().nullable(),
  licencia: z.string(),
  atribucion: z.string(),
  estado: z.string(),
  creadoEl: z.string(),
  actualizadoEl: z.string(),
});

export const branchSchema = z.object({
  id: z.string().uuid(),
  codigo: z.string(),
  nombre: z.string(),
  descripcion: z.string().nullable(),
  zonaHoraria: z.string(),
  // Opcionales en la lectura: un backend anterior a la ubicación en mapa no
  // los envía y la lista de sedes no debe romperse por ello.
  direccion: z
    .string()
    .nullish()
    .transform((value) => value ?? null),
  latitud: z
    .number()
    .nullish()
    .transform((value) => value ?? null),
  longitud: z
    .number()
    .nullish()
    .transform((value) => value ?? null),
  radioGeocercaM: z
    .number()
    .int()
    .nullish()
    .transform((value) => value ?? null),
  estado: z.enum(['ACTIVE', 'INACTIVE']),
  metadata: z.record(z.string(), z.unknown()),
});

export const roomSchema = z.object({
  id: z.string().uuid(),
  sedeId: z.string().uuid(),
  codigo: z.string(),
  nombre: z.string(),
  tipoSala: z.enum(roomTypes),
  capacidad: z.number().int().nullable(),
  estado: z.enum(['ACTIVE', 'MAINTENANCE', 'CLOSED', 'INACTIVE']),
  metadata: z.record(z.string(), z.unknown()),
});

export const maintenanceSchema = z.object({
  id: z.string().uuid(),
  equipoId: z.string().uuid(),
  tipo: z.enum(maintenanceTypes),
  estado: z.enum(maintenanceStatuses),
  programadoPara: z.string(),
  iniciadoEn: z.string().nullable(),
  completadoEn: z.string().nullable(),
  proveedor: z.string().nullable(),
  tecnico: z.string().nullable(),
  descripcion: z.string(),
  hallazgos: z.string().nullable(),
  resolucion: z.string().nullable(),
  costo: z.number().nullable(),
  moneda: z.string().nullable(),
});

export const notificationPreferenceSchema = z.object({
  recordatoriosVencimiento: z.boolean(),
  vistaPreviaMensajes: z.boolean(),
  canalPreferido: z.enum(['IN_APP', 'HTTP_GATEWAY']),
  consentimientoExternoEn: z.string().nullable(),
  versionConsentimiento: z.string().nullable(),
  horaSilencioInicio: z.string().nullable(),
  horaSilencioFin: z.string().nullable(),
});
