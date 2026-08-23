import type { CSSProperties } from 'react';
import {
  Award,
  Beer,
  Bike,
  BookMarked,
  CalendarDays,
  CheckCheck,
  Compass,
  Flame,
  Footprints,
  Home,
  Layers,
  type LucideIcon,
  Map as MapIcon,
  Medal,
  Moon,
  PersonStanding,
  Repeat,
  Ribbon,
  Rocket,
  Shield,
  Sparkles,
  Star,
  Sun,
  TrainFront,
  TrendingUp,
  Trophy,
  Zap,
} from 'lucide-react';

/**
 * Traduce el nombre de icono que envía el backend al icono de esta plataforma.
 *
 * El catálogo guarda nombres de Ionicons porque es el juego que usa el móvil, y
 * la web dibuja con lucide. Traducir aquí —y no duplicar el catálogo con un
 * campo de icono por plataforma— mantiene una sola fila por rango: un
 * administrador elige un icono, no dos, y no puede dejarlos descuadrados.
 *
 * Un nombre desconocido no rompe la pantalla: cae en un icono genérico, que es
 * lo correcto cuando el gimnasio inventa una insignia con un icono que esta
 * versión de la web todavía no conoce.
 */
const ICONS: Readonly<Record<string, LucideIcon>> = {
  'footsteps-outline': Footprints,
  'walk-outline': PersonStanding,
  'barbell-outline': Zap,
  barbell: Zap,
  'flame-outline': Flame,
  flame: Flame,
  'flash-outline': Zap,
  'shield-outline': Shield,
  'planet-outline': Award,
  'sparkles-outline': Sparkles,
  'ribbon-outline': Ribbon,
  'checkmark-done-outline': CheckCheck,
  'trophy-outline': Trophy,
  'medal-outline': Medal,
  'bonfire-outline': Flame,
  'calendar-outline': CalendarDays,
  'calendar-number-outline': CalendarDays,
  'train-outline': TrainFront,
  'layers-outline': Layers,
  'repeat-outline': Repeat,
  'body-outline': PersonStanding,
  'map-outline': MapIcon,
  'compass-outline': Compass,
  'library-outline': BookMarked,
  'trending-up-outline': TrendingUp,
  'rocket-outline': Rocket,
  'home-outline': Home,
  'sunny-outline': Sun,
  'moon-outline': Moon,
  'beer-outline': Beer,
  'star-outline': Star,
  'bicycle-outline': Bike,
};

/**
 * Dibuja el icono que nombra el catálogo.
 *
 * Es un componente y no una función que devuelva otro componente: elegir el
 * icono dentro del render y guardarlo en una variable en mayúscula crea un tipo
 * de componente nuevo en cada pasada, React lo trata como un elemento distinto
 * y lo desmonta y vuelve a montar. Aquí el componente es estable y lo que
 * cambia es solo el nombre que recibe.
 */
export function ProgressionIcon({
  name,
  className,
  style,
}: Readonly<{ name: string; className?: string; style?: CSSProperties }>) {
  const Icon: LucideIcon = ICONS[name] ?? Ribbon;
  return <Icon aria-hidden className={className} style={style} />;
}
