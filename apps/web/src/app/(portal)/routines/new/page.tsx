import { redirect } from 'next/navigation';
import { publicEnv } from '@/shared/config/public-env';

/**
 * Crear rutina. Con la bandera `routinesV2` empieza el asistente por pasos;
 * apagada, la creación sigue siendo el diálogo de la lista de rutinas.
 */
export default function NewRoutinePage() {
  redirect(publicEnv.routinesV2 ? '/routines/new/nombre' : '/routines');
}
