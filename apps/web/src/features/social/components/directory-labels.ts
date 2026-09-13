import type { DirectoryConnectionStatus } from '@/shared/api/schemas';

/**
 * Las etiquetas del dominio social, en las mismas palabras que el móvil.
 *
 * Son literalmente las de `apps/mobile/src/lib/social-labels.ts`. Viven
 * duplicadas y no en `packages/*` a propósito: son texto de interfaz, no
 * contrato, y el día que la web quiera decir «Pérdida de grasa» donde el móvil
 * dice otra cosa no debería tener que cambiar un paquete compartido. Lo que sí
 * es obligatorio es que coincidan mientras nadie decida lo contrario — un
 * mismo objetivo con dos nombres según el dispositivo es cómo se pierde la
 * sensación de estar en el mismo producto.
 */
export const trainingGoalLabels: Record<string, string> = {
  HIPERTROFIA: 'Hipertrofia',
  FUERZA: 'Fuerza',
  RESISTENCIA: 'Resistencia',
  PERDIDA_GRASA: 'Pérdida de grasa',
  SALUD_GENERAL: 'Salud general',
  REHABILITACION: 'Rehabilitación',
};

export const genderLabels: Record<string, string> = {
  MALE: 'Hombre',
  FEMALE: 'Mujer',
  UNSPECIFIED: 'Sin especificar',
};

export const experienceLevelLabels: Record<string, string> = {
  BEGINNER: 'Principiante',
  INTERMEDIATE: 'Intermedio',
  ADVANCED: 'Avanzado',
};

export const directoryStatusLabels: Record<DirectoryConnectionStatus, string> = {
  NONE: 'Sin conexión',
  PENDING_SENT: 'Solicitud enviada',
  PENDING_RECEIVED: 'Te escribió',
  ACCEPTED: 'Conectado/a',
};

/**
 * «GYM_RAT» → «Gym Rat».
 *
 * El catálogo de rangos no expone un nombre legible aparte del código, así que
 * el título se deriva de él. Misma función que `levelTitle` en el móvil.
 */
export function levelTitle(code: string): string {
  return code
    .toLowerCase()
    .split('_')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}
