import {
  Activity,
  Bell,
  Building2,
  CalendarCheck,
  ClipboardList,
  Dumbbell,
  Gauge,
  GraduationCap,
  IdCard,
  KeyRound,
  ScanFace,
  Settings,
  ShieldCheck,
  Users,
} from 'lucide-react';
import type { UserRole } from '@/shared/api/contracts';

export type NavigationItem = {
  href: string;
  label: string;
  icon: typeof Gauge;
  roles?: readonly UserRole[];
};

export const primaryNavigation: NavigationItem[] = [
  { href: '/dashboard', label: 'Panel', icon: Gauge },
  { href: '/workouts', label: 'Entrenamientos', icon: Activity },
  { href: '/plans', label: 'Mis planes', icon: CalendarCheck },
  { href: '/routines', label: 'Rutinas', icon: ClipboardList },
  { href: '/exercises', label: 'Ejercicios', icon: Dumbbell },
  { href: '/membership', label: 'Membresía', icon: IdCard },
  { href: '/access', label: 'Acceso', icon: KeyRound },
  { href: '/notifications', label: 'Avisos', icon: Bell },
  { href: '/profile', label: 'Mi perfil', icon: Settings },
  { href: '/tutorials', label: 'Centro de ayuda', icon: GraduationCap },
];

export const adminNavigation: NavigationItem[] = [
  { href: '/admin', label: 'Operaciones', icon: ShieldCheck, roles: ['ADMIN', 'FRONT_DESK'] },
  {
    href: '/admin/equipment',
    label: 'Equipamiento',
    icon: Dumbbell,
    roles: ['ADMIN', 'FRONT_DESK'],
  },
  { href: '/admin/exercises', label: 'Catálogo global', icon: Activity, roles: ['ADMIN'] },
  {
    href: '/admin/facilities',
    label: 'Instalaciones',
    icon: Building2,
    roles: ['ADMIN', 'FRONT_DESK'],
  },
  { href: '/admin/membership', label: 'Clientes', icon: Users, roles: ['ADMIN', 'FRONT_DESK'] },
  {
    href: '/admin/people',
    label: 'Registrar persona',
    icon: ScanFace,
    roles: ['ADMIN', 'FRONT_DESK'],
  },
  {
    href: '/admin/access',
    label: 'Control de acceso',
    icon: KeyRound,
    roles: ['ADMIN', 'FRONT_DESK'],
  },
];

export function canSee(item: NavigationItem, role: UserRole) {
  return !item.roles || item.roles.includes(role);
}
