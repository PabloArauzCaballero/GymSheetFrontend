import { env } from '@/config/env';
import { NameStep } from '@/features/routine-wizard/steps-basic';
import { NewRoutineScreen } from '@/features/routine-legacy/new-routine-screen';

/**
 * Crear rutina. Con la bandera `routinesV2` es el primer paso del asistente por
 * pasos; apagada, la pantalla de siempre (un solo formulario).
 */
export default function NewRoutineRoute() {
  return env.routinesV2 ? <NameStep /> : <NewRoutineScreen />;
}
