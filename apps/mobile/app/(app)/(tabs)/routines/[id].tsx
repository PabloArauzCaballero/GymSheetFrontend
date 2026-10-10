import { LegacyRoutineDetailScreen } from '@/features/routine-legacy/routine-detail-screen';
import { RoutineDetailScreen } from '@/features/routine-detail/routine-detail-screen';
import { env } from '@/config/env';

/** Con la bandera `routinesV2` el detalle tiene vista Semana/Mes; apagada, el de siempre. */
export default function RoutineDetailRoute() {
  return env.routinesV2 ? <RoutineDetailScreen /> : <LegacyRoutineDetailScreen />;
}
