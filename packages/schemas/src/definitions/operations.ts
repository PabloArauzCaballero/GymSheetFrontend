import { z } from 'zod';
import {
  accessOutcomes,
  credentialStatuses,
  credentialTypes,
  maintenanceStatuses,
  maintenanceTypes,
  membershipStatuses,
  notificationStatuses,
  planTypes,
  roomTypes,
} from '@gymsheet/types';

export const branchSchema = z.object({
  id: z.string().uuid(),
  codigo: z.string(),
  nombre: z.string(),
  descripcion: z.string().nullable(),
  zonaHoraria: z.string(),
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

export const membershipPlanSchema = z.object({
  id: z.string().uuid(),
  publicId: z.string().uuid(),
  codigo: z.string(),
  nombre: z.string(),
  descripcion: z.string().nullable(),
  tipo: z.enum(planTypes),
  duracionDias: z.number().int(),
  diasRecordatorio: z.array(z.number().int()),
  estado: z.enum(['ACTIVE', 'INACTIVE']),
  precio: z.number().nullable(),
  moneda: z.string().nullable(),
  beneficios: z.array(z.string()),
  orden: z.number().int(),
  disponibleNuevo: z.boolean(),
  disponibleRenovacion: z.boolean(),
  disponibleExtension: z.boolean(),
  imagen: z
    .object({
      id: z.string().uuid(),
      publicId: z.string().uuid(),
      url: z.string().url(),
      altText: z.string(),
      width: z.number().int().nullable(),
      height: z.number().int().nullable(),
      licencia: z.string(),
      atribucion: z.string(),
    })
    .nullable(),
  alcances: z.array(z.object({ sedeId: z.string().uuid(), salaId: z.string().uuid().nullable() })),
  metadata: z.record(z.string(), z.unknown()),
});

export const membershipAccessSchema = z.object({
  code: z.string(),
  name: z.string(),
  description: z.string().nullable(),
  source: z.enum(['MEMBERSHIP', 'PURCHASE', 'ADMIN_GRANT', 'PROMOTION', 'TRIAL']),
  sourceId: z.string().uuid(),
  startsAt: z.string(),
  endsAt: z.string().nullable(),
});

export const membershipOptionsSchema = z.object({
  membershipStatus: z.enum(membershipStatuses).nullable(),
  plans: z.array(membershipPlanSchema),
});

export const membershipIntentSchema = z.object({
  id: z.string().uuid(),
  publicId: z.string().uuid(),
  status: z.literal('PENDING_PAYMENT'),
  type: z.enum(['RENEWAL', 'EXTENSION']),
  membershipId: z.string().uuid().nullable(),
  planId: z.string().uuid(),
  months: z.number().int(),
  whatsappUrl: z.string().url(),
  message: z.literal('Hola, quisiera renovar mi membresía'),
  correlationId: z.string().uuid(),
  accessGranted: z.literal(false),
});

export const membershipSchema = z.object({
  id: z.string().uuid(),
  clienteUsuarioId: z.string().uuid(),
  planId: z.string().uuid(),
  plan: membershipPlanSchema.optional(),
  iniciaEl: z.string(),
  venceEl: z.string(),
  estado: z.enum(membershipStatuses),
  diasRestantes: z.number().int(),
  venceHoy: z.boolean(),
  vigenteHoy: z.boolean(),
  referenciaExterna: z.string().nullable(),
  notas: z.string().nullable(),
});

export const membershipProjectionSchema = z.object({
  membership: membershipSchema.nullable(),
  history: z.array(membershipSchema),
  paymentStatus: z.literal('PENDING_PAYMENT').nullable(),
  renewalActions: z.array(
    z.object({
      type: z.literal('WHATSAPP'),
      label: z.string(),
      phone: z.string(),
      message: z.string(),
    }),
  ),
});

export const customerSchema = z.object({
  id: z.string().uuid(),
  usuarioId: z.string().uuid(),
  numeroCliente: z.string(),
  telefono: z.string().nullable(),
  registradoEl: z.string(),
  referenciaExterna: z.string().nullable(),
  notas: z.string().nullable(),
  usuario: z
    .object({
      id: z.string().uuid(),
      email: z.string(),
      nombreCompleto: z.string(),
      estado: z.string(),
    })
    .optional(),
});

export const credentialSchema = z.object({
  id: z.string().uuid(),
  usuarioId: z.string().uuid(),
  tipo: z.enum(credentialTypes),
  proveedor: z.string(),
  estado: z.enum(credentialStatuses),
  referenciaExternaRegistrada: z.boolean(),
  versionConsentimiento: z.string().nullable(),
  consentimientoRegistradoEn: z.string().nullable(),
  registradoEn: z.string(),
  verificadoPorUltimaVezEn: z.string().nullable(),
  revocadoEn: z.string().nullable(),
});

export const accessDecisionSchema = z.object({
  id: z.string().uuid(),
  eventoDispositivoId: z.string().uuid(),
  usuarioId: z.string().uuid(),
  resultado: z.enum(accessOutcomes),
  razon: z.string(),
  membresiaId: z.string().uuid().nullable(),
  perfilPersonalId: z.string().uuid().nullable(),
  diasRestantes: z.number().int().nullable(),
  decididoEn: z.string(),
  versionPolitica: z.string(),
});

export const accessEventSchema = z.object({
  id: z.string().uuid(),
  dispositivoId: z.string().uuid(),
  eventoOrigenId: z.string(),
  credencialId: z.string().uuid(),
  direccion: z.enum(['ENTRY', 'EXIT']),
  ocurridoEn: z.string(),
  recibidoEn: z.string(),
  estadoCola: z.enum(['PENDING', 'PROCESSING', 'COMPLETED', 'FAILED', 'DEAD_LETTER']),
  decision: accessDecisionSchema.nullable(),
});

export const notificationSchema = z.object({
  id: z.string().uuid(),
  membresiaId: z.string().uuid().nullable(),
  canal: z.enum(['IN_APP', 'HTTP_GATEWAY', 'MOCK']),
  asunto: z.string(),
  mensaje: z.string(),
  diasRestantes: z.number().int().nullable(),
  estado: z.enum(notificationStatuses),
  leidoEn: z.string().nullable(),
  enviadoEn: z.string().nullable(),
  creadoEn: z.string(),
});

export const notificationPreferenceSchema = z.object({
  recordatoriosVencimiento: z.boolean(),
  canalPreferido: z.enum(['IN_APP', 'HTTP_GATEWAY']),
  consentimientoExternoEn: z.string().nullable(),
  versionConsentimiento: z.string().nullable(),
  horaSilencioInicio: z.string().nullable(),
  horaSilencioFin: z.string().nullable(),
});
