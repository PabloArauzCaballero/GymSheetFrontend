import { LegacyRoutinesScreen } from '@/features/routine-legacy/routines-list-screen';
import { RoutinesCatalogScreen } from '@/features/routine-catalog/routines-catalog-screen';
import { env } from '@/config/env';

/** Con la bandera `routinesV2` es el catálogo por pestañas; apagada, la lista de siempre. */
export default function RoutinesScreen() {
  return env.routinesV2 ? <RoutinesCatalogScreen /> : <LegacyRoutinesScreen />;
}
