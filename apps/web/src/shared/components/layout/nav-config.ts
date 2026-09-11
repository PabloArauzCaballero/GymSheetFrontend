import {
  Activity,
  BarChart3,
  Bell,
  Building2,
  CalendarCheck,
  ClipboardList,
  Dumbbell,
  Gauge,
  GraduationCap,
  IdCard,
  KeyRound,
  MessageCircle,
  ScanFace,
  Settings,
  ShieldCheck,
  Signpost,
  Sparkles,
  Users,
  Users2,
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
  // Justo debajo del panel: es la pantalla que responde «¿me estoy acercando a
  // como quiero verme?», y enterrarla al final de la lista la convertiría en
  // una sección que nadie visita.
  { href: '/trayectoria', label: 'Tu senda', icon: Signpost },
  { href: '/workouts', label: 'Entrenamientos', icon: Activity },
  { href: '/plans', label: 'Mis planes', icon: CalendarCheck },
  { href: '/routines', label: 'Rutinas', icon: ClipboardList },
  { href: '/exercises', label: 'Ejercicios', icon: Dumbbell },
  { href: '/comunidad', label: 'Comunidad', icon: Users2 },
  // Pegada a Comunidad: es lo que pasó ahí mientras no mirabas (likes, vistas
  // de perfil, next). Lleva el único indicador numérico de la navegación, así
  // que enterrarla al final la volvería una notificación que nadie atiende.
  { href: '/interacciones', label: 'Interacciones', icon: Sparkles },
  { href: '/chat', label: 'Chat', icon: MessageCircle },
  { href: '/membership', label: 'Membresía', icon: IdCard },
  { href: '/access', label: 'Acceso', icon: KeyRound },
  { href: '/notifications', label: 'Avisos', icon: Bell },
  { href: '/profile', label: 'Mi perfil', icon: Settings },
  { href: '/tutorials', label: 'Centro de ayuda', icon: GraduationCap },
];

export const adminNavigation: NavigationItem[] = [
  { href: '/admin', label: 'Operaciones', icon: ShieldCheck, roles: ['ADMIN', 'FRONT_DESK'] },
  {
    href: '/admin/usuarios',
    label: 'Usuarios',
    icon: Users,
    roles: ['ADMIN', 'FRONT_DESK'],
  },
  {
    // Entrada propia y no una pestaña dentro de «Operaciones»: es la pantalla
    // que se abre cada mañana para decidir a quién llamar, y esconderla un
    // nivel más abajo es la diferencia entre que se use y que no.
    href: '/admin/operacion',
    label: 'Panel del gimnasio',
    icon: BarChart3,
    roles: ['ADMIN', 'FRONT_DESK'],
  },
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
