import type { Ionicons } from '@expo/vector-icons';
import { swapReasons, type SwapReason } from '@gymsheet/types';
import type { MetricKey } from '@/theme';

/** Los motivos en el orden en que se ofrecen: lo más frecuente en el gimnasio, primero. */
export const SWAP_REASONS: readonly SwapReason[] = swapReasons;

type ReasonLook = { label: string; icon: keyof typeof Ionicons.glyphMap; metric: MetricKey };

/** Cada motivo con su texto, glifo y color: se reconoce sin leer. */
const LOOK: Readonly<Record<SwapReason, ReasonLook>> = {
  MAQUINA_OCUPADA: { label: 'Máquina ocupada', icon: 'people-outline', metric: 'weight' },
  SIN_EQUIPO: { label: 'No tengo el equipo', icon: 'construct-outline', metric: 'time' },
  MOLESTIA: { label: 'Molestia o dolor', icon: 'bandage-outline', metric: 'volume' },
  MUY_DIFICIL: { label: 'Muy difícil', icon: 'trending-down-outline', metric: 'effort' },
  MUY_FACIL: { label: 'Muy fácil', icon: 'trending-up-outline', metric: 'reps' },
  PREFERENCIA: { label: 'Prefiero otro', icon: 'heart-outline', metric: 'record' },
  CAMBIO_DE_PLAN: { label: 'Cambio de plan', icon: 'git-branch-outline', metric: 'skipped' },
};

export function swapReasonLook(reason: SwapReason): ReasonLook {
  return LOOK[reason];
}
