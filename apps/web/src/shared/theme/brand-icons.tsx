import {
  Activity,
  Dumbbell,
  Flame,
  HeartPulse,
  Mountain,
  Shield,
  Target,
  Zap,
  type LucideIcon,
} from 'lucide-react';
import type { BrandIconKey } from './brand-contract';

/**
 * Glifos de marca. El catálogo es cerrado a propósito: los iconos comparten
 * trazo, rejilla y peso óptico, de modo que cambiar de marca no descoloca el
 * encuadre ni rompe la coherencia con el resto de la interfaz.
 */
export const brandIconByKey: Record<BrandIconKey, LucideIcon> = {
  dumbbell: Dumbbell,
  activity: Activity,
  flame: Flame,
  zap: Zap,
  'heart-pulse': HeartPulse,
  shield: Shield,
  target: Target,
  mountain: Mountain,
};
