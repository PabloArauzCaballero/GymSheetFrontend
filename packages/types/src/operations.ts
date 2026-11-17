import type {
  MaintenanceStatus,
  MaintenanceType,
  NotificationStatus,
  RoomType,
} from './enums';

/**
 * Archivo del repositorio de medios administrado por el gimnasio. Se
 * identifica por `codigo` (kebab-case estable), de modo que reemplazar la
 * imagen —por ejemplo el QR de cobro de un plan— no cambia la referencia.
 */
export type MediaFile = {
  id: string;
  publicId: string;
  codigo: string;
  nombre: string;
  tipo: string;
  mimeType: string;
  proveedor: string;
  origen: string;
  url: string;
  altText: string;
  width: number | null;
  height: number | null;
  licencia: string;
  atribucion: string;
  estado: string;
  creadoEl: string;
  actualizadoEl: string;
};

export type Branch = {
  id: string;
  codigo: string;
  nombre: string;
  descripcion: string | null;
  zonaHoraria: string;
  /** Ubicación de la sede. Nula en sedes anteriores a la ubicación en mapa. */
  direccion: string | null;
  latitud: number | null;
  longitud: number | null;
  /** Radio en metros para verificar rachas por ubicación; nulo = no verifica. */
  radioGeocercaM: number | null;
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
  /** Backend `metadata.type`: where the notice opens (null for plain notices). */
  tipo: string | null;
};

export type NotificationPreference = {
  recordatoriosVencimiento: boolean;
  vistaPreviaMensajes: boolean;
  canalPreferido: 'IN_APP' | 'HTTP_GATEWAY';
  consentimientoExternoEn: string | null;
  versionConsentimiento: string | null;
  horaSilencioInicio: string | null;
  horaSilencioFin: string | null;
};
