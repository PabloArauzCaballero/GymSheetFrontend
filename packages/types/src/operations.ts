import type {
  AccessOutcome,
  CredentialStatus,
  CredentialType,
  MaintenanceStatus,
  MaintenanceType,
  MembershipStatus,
  NotificationStatus,
  PlanType,
  RoomType,
} from './enums';

export type Branch = {
  id: string;
  codigo: string;
  nombre: string;
  descripcion: string | null;
  zonaHoraria: string;
  estado: 'ACTIVE' | 'INACTIVE';
  metadata: Record<string, unknown>;
};

export type Room = {
  id: string;
  sedeId: string;
  codigo: string;
  nombre: string;
  tipoSala: RoomType;
  capacidad: number | null;
  estado: 'ACTIVE' | 'MAINTENANCE' | 'CLOSED' | 'INACTIVE';
  metadata: Record<string, unknown>;
};

export type AccessPoint = {
  id: string;
  sedeId: string;
  salaId: string | null;
  codigo: string;
  nombre: string;
  direccionPermitida: 'ENTRY' | 'EXIT' | 'BOTH';
  estado: 'ACTIVE' | 'INACTIVE';
  metadata: Record<string, unknown>;
};

export type MaintenanceEvent = {
  id: string;
  equipoId: string;
  tipo: MaintenanceType;
  estado: MaintenanceStatus;
  programadoPara: string;
  iniciadoEn: string | null;
  completadoEn: string | null;
  proveedor: string | null;
  tecnico: string | null;
  descripcion: string;
  hallazgos: string | null;
  resolucion: string | null;
  costo: number | null;
  moneda: string | null;
};

export type PlanScope = { sedeId: string; salaId: string | null };

export type MembershipPlan = {
  id: string;
  publicId: string;
  codigo: string;
  nombre: string;
  descripcion: string | null;
  tipo: PlanType;
  duracionDias: number;
  diasRecordatorio: number[];
  estado: 'ACTIVE' | 'INACTIVE';
  precio: number | null;
  moneda: string | null;
  beneficios: string[];
  orden: number;
  disponibleNuevo: boolean;
  disponibleRenovacion: boolean;
  disponibleExtension: boolean;
  imagen: {
    id: string;
    publicId: string;
    url: string;
    altText: string;
    width: number | null;
    height: number | null;
    licencia: string;
    atribucion: string;
  } | null;
  alcances: PlanScope[];
  metadata: Record<string, unknown>;
};

export type MembershipProjection = {
  membership: Membership | null;
  history: Membership[];
  paymentStatus: 'PENDING_PAYMENT' | null;
  renewalActions: { type: 'WHATSAPP'; label: string; phone: string; message: string }[];
};

export type MembershipAccess = {
  code: string;
  name: string;
  description: string | null;
  source: 'MEMBERSHIP' | 'PURCHASE' | 'ADMIN_GRANT' | 'PROMOTION' | 'TRIAL';
  sourceId: string;
  startsAt: string;
  endsAt: string | null;
};

export type MembershipOptions = {
  membershipStatus: MembershipStatus | null;
  plans: MembershipPlan[];
};

export type MembershipIntent = {
  id: string;
  publicId: string;
  status: 'PENDING_PAYMENT';
  type: 'RENEWAL' | 'EXTENSION';
  membershipId: string | null;
  planId: string;
  months: number;
  whatsappUrl: string;
  message: string;
  correlationId: string;
  accessGranted: false;
};

export type Membership = {
  id: string;
  clienteUsuarioId: string;
  planId: string;
  plan?: MembershipPlan;
  iniciaEl: string;
  venceEl: string;
  estado: MembershipStatus;
  diasRestantes: number;
  venceHoy: boolean;
  vigenteHoy: boolean;
  referenciaExterna: string | null;
  notas: string | null;
};

export type Customer = {
  id: string;
  usuarioId: string;
  numeroCliente: string;
  telefono: string | null;
  registradoEl: string;
  referenciaExterna: string | null;
  notas: string | null;
  usuario?: { id: string; email: string; nombreCompleto: string; estado: string };
};

export type AccessCredential = {
  id: string;
  usuarioId: string;
  tipo: CredentialType;
  proveedor: string;
  estado: CredentialStatus;
  referenciaExternaRegistrada: boolean;
  versionConsentimiento: string | null;
  consentimientoRegistradoEn: string | null;
  registradoEn: string;
  verificadoPorUltimaVezEn: string | null;
  revocadoEn: string | null;
};

export type AccessDecision = {
  id: string;
  eventoDispositivoId: string;
  usuarioId: string;
  resultado: AccessOutcome;
  razon: string;
  membresiaId: string | null;
  perfilPersonalId: string | null;
  diasRestantes: number | null;
  decididoEn: string;
  versionPolitica: string;
};

export type AccessEvent = {
  id: string;
  dispositivoId: string;
  eventoOrigenId: string;
  credencialId: string;
  direccion: 'ENTRY' | 'EXIT';
  ocurridoEn: string;
  recibidoEn: string;
  estadoCola: 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED' | 'DEAD_LETTER';
  decision: AccessDecision | null;
};

export type Notification = {
  id: string;
  membresiaId: string | null;
  canal: 'IN_APP' | 'HTTP_GATEWAY' | 'MOCK';
  asunto: string;
  mensaje: string;
  diasRestantes: number | null;
  estado: NotificationStatus;
  leidoEn: string | null;
  enviadoEn: string | null;
  creadoEn: string;
};

export type NotificationPreference = {
  recordatoriosVencimiento: boolean;
  canalPreferido: 'IN_APP' | 'HTTP_GATEWAY';
  consentimientoExternoEn: string | null;
  versionConsentimiento: string | null;
  horaSilencioInicio: string | null;
  horaSilencioFin: string | null;
};
