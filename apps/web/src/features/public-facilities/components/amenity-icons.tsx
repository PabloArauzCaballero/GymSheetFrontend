import {
  CheckCircle2,
  LockKeyhole,
  ParkingCircle,
  ShowerHead,
  Snowflake,
  Store,
  UserCheck,
  Users,
  Wifi,
  type LucideIcon,
} from 'lucide-react';

const AMENITY_ICON: Record<string, LucideIcon> = {
  Estacionamiento: ParkingCircle,
  'Vestidores y duchas': ShowerHead,
  'Aire acondicionado': Snowflake,
  'Wifi gratis': Wifi,
  Casilleros: LockKeyhole,
  'Tienda de suplementos': Store,
  'Entrenador personal': UserCheck,
  'Clases grupales': Users,
};

export function amenityIcon(label: string): LucideIcon {
  return AMENITY_ICON[label] ?? CheckCircle2;
}
