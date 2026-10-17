import { type ComponentProps } from 'react';
import { AnimatedIcon } from '@/components/animated-icon';

type Props = Omit<ComponentProps<typeof AnimatedIcon>, 'name' | 'motion'>;

/**
 * Catálogo con nombre: cada icono ya trae el movimiento que le corresponde.
 * Importar de aquí en vez de combinar `AnimatedIcon` a mano en cada pantalla.
 */
export const HeartIcon = (p: Props) => <AnimatedIcon motion="beat" name="heart" {...p} />;
export const FlameIcon = (p: Props) => <AnimatedIcon motion="flicker" name="flame" {...p} />;
export const StarIcon = (p: Props) => <AnimatedIcon motion="pulse" name="star" {...p} />;
export const TrophyIcon = (p: Props) => <AnimatedIcon motion="bounce" name="trophy" {...p} />;
export const DumbbellIcon = (p: Props) => <AnimatedIcon motion="lift" name="barbell" {...p} />;
export const TimerIcon = (p: Props) => <AnimatedIcon motion="tick" name="timer-outline" {...p} />;
export const ClockIcon = (p: Props) => <AnimatedIcon motion="spin" name="sync-outline" {...p} />;
export const BoltIcon = (p: Props) => <AnimatedIcon motion="pulse" name="flash" {...p} />;
export const BellIcon = (p: Props) => <AnimatedIcon motion="wiggle" name="notifications" {...p} />;
export const RunIcon = (p: Props) => <AnimatedIcon motion="bounce" name="walk" {...p} />;
export const BikeIcon = (p: Props) => <AnimatedIcon motion="sway" name="bicycle" {...p} />;
export const RowIcon = (p: Props) => <AnimatedIcon motion="sway" name="boat" {...p} />;
export const SwimIcon = (p: Props) => <AnimatedIcon motion="float" name="water" {...p} />;
export const CalendarIcon = (p: Props) => <AnimatedIcon motion="float" name="calendar" {...p} />;
export const SpeedIcon = (p: Props) => <AnimatedIcon motion="wiggle" name="speedometer" {...p} />;
export const TrendIcon = (p: Props) => <AnimatedIcon motion="float" name="trending-up" {...p} />;
export const CheckIcon = (p: Props) => <AnimatedIcon motion="pulse" name="checkmark-circle" {...p} />;
export const FitnessIcon = (p: Props) => <AnimatedIcon motion="beat" name="fitness" {...p} />;
export const SparkIcon = (p: Props) => <AnimatedIcon motion="spin" name="sparkles" {...p} />;
