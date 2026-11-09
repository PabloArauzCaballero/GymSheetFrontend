import type { MaintenanceType, RoomType } from '@/shared/api/contracts';

/** Etiquetas en español para los enumerados de instalaciones (el contrato sigue en inglés). */
export const roomTypeLabels: Record<RoomType, string> = {
  TRAINING: 'Musculación',
  CARDIO: 'Cardio',
  FUNCTIONAL: 'Funcional',
  CLASSROOM: 'Clases grupales',
  LOCKER: 'Vestuario',
  RECEPTION: 'Recepción',
  STAFF: 'Personal',
  OTHER: 'Otro',
};

export const accessDirectionLabels = {
  BOTH: { title: 'Entrada y salida', hint: 'Torniquete o puerta de doble sentido.' },
  ENTRY: { title: 'Solo entrada', hint: 'Registra ingresos; la salida va por otro punto.' },
  EXIT: { title: 'Solo salida', hint: 'Cierra la estancia registrada en la entrada.' },
} as const;

export const maintenanceTypeLabels: Record<MaintenanceType, { title: string; hint: string }> = {
  PREVENTIVE: { title: 'Preventivo', hint: 'Revisión planificada para evitar fallas.' },
  CORRECTIVE: { title: 'Correctivo', hint: 'Reparar una falla ya detectada.' },
  INSPECTION: { title: 'Inspección', hint: 'Verificar estado y seguridad sin intervenir.' },
};

/** Zonas horarias habituales; la de Bolivia primero porque es la de la operación. */
export const timeZones = [
  'America/La_Paz',
  'America/Santiago',
  'America/Lima',
  'America/Bogota',
  'America/Guayaquil',
  'America/Asuncion',
  'America/Argentina/Buenos_Aires',
  'America/Montevideo',
  'America/Sao_Paulo',
  'America/Caracas',
  'America/Mexico_City',
  'Europe/Madrid',
  'UTC',
] as const;

/** Hora actual en una zona, para que el administrador confirme que eligió bien. */
export function localTimeIn(timeZone: string, now = new Date()): string | null {
  try {
    return new Intl.DateTimeFormat('es-BO', {
      timeZone,
      hour: '2-digit',
      minute: '2-digit',
      weekday: 'long',
    }).format(now);
  } catch {
    return null;
  }
}
