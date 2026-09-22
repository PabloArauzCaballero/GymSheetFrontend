import {
  Activity,
  BarChart3,
  Bell,
  Building2,
  CalendarCheck,
  ClipboardList,
  Dumbbell,
  Flame,
  Gauge,
  GraduationCap,
  IdCard,
  KeyRound,
  MessageCircle,
  ScanFace,
  ScrollText,
  ShieldAlert,
  Server,
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
  /**
   * Qué hace el módulo, en una frase.
   *
   * Sólo la llevan las entradas de administración, y es lo que las hace
   * aparecer en la rejilla de `/admin`: la rejilla y esta lista eran dos
   * inventarios distintos de los mismos módulos, y tres entradas (usuarios,
   * panel del gimnasio, registrar persona) existían en la navegación y no en la
   * rejilla. Derivar una de la otra evita que vuelvan a separarse.
   */
  description?: string;
  /** Permiso granular exigido además del rol. Sin él, la entrada no se muestra. */
  requiredPermission?: string;
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
  // La baraja es un destino y no una pestaña de Comunidad: se decide
  // arrastrando y ocupa el ancho entero. Va pegada a Comunidad porque se llega
  // desde allí con los filtros puestos, y aquí sin ellos.
  { href: '/descubrir', label: 'Descubrir', icon: Flame },
  // Pegada a Comunidad: es lo que pasó ahí mientras no mirabas (likes, vistas
  // de perfil, next). Lleva el único indicador numérico de la navegación, así
  // que enterrarla al final la volvería una notificación que nadie atiende.
  { href: '/interacciones', label: 'Interacciones', icon: Sparkles },
  { href: '/chat', label: 'Mensajes', icon: MessageCircle },
  { href: '/membership', label: 'Membresía', icon: IdCard },
  { href: '/access', label: 'Acceso', icon: KeyRound },
  { href: '/notifications', label: 'Avisos', icon: Bell },
  { href: '/profile', label: 'Mi perfil', icon: Settings },
  { href: '/tutorials', label: 'Centro de ayuda', icon: GraduationCap },
];

export const adminNavigation: NavigationItem[] = [
  // Sin `description`: es la propia rejilla, y listarse a sí misma dentro sería
  // un enlace que devuelve a donde ya estás.
  { href: '/admin', label: 'Operaciones', icon: ShieldCheck, roles: ['ADMIN', 'FRONT_DESK'] },
  {
    href: '/admin/usuarios',
    label: 'Usuarios',
    icon: Users,
    roles: ['ADMIN', 'FRONT_DESK'],
    description: 'Todas las cuentas, con su membresía y su última actividad.',
  },
  {
    // Entrada propia y no una pestaña dentro de «Operaciones»: es la pantalla
    // que se abre cada mañana para decidir a quién llamar, y esconderla un
    // nivel más abajo es la diferencia entre que se use y que no.
    href: '/admin/operacion',
    label: 'Panel del gimnasio',
    icon: BarChart3,
    roles: ['ADMIN', 'FRONT_DESK'],
    description: 'Uso del equipamiento, flujo de personas y quién no ha renovado.',
  },
  {
    href: '/admin/equipment',
    label: 'Equipamiento',
    icon: Dumbbell,
    roles: ['ADMIN', 'FRONT_DESK'],
    description: 'Inventario visible y operaciones autorizadas por rol.',
  },
  {
    href: '/admin/exercises',
    label: 'Catálogo global',
    icon: Activity,
    roles: ['ADMIN'],
    description: 'Ejercicios globales e importación controlada de dataset.',
  },
  {
    href: '/admin/facilities',
    label: 'Instalaciones',
    icon: Building2,
    roles: ['ADMIN', 'FRONT_DESK'],
    description: 'Sedes, salas, puntos de acceso y mantenimiento.',
  },
  {
    href: '/admin/membership',
    label: 'Clientes',
    icon: Users,
    roles: ['ADMIN', 'FRONT_DESK'],
    description: 'Planes, clientes, vigencias y personal.',
  },
  {
    href: '/admin/people',
    label: 'Registrar persona',
    icon: ScanFace,
    roles: ['ADMIN', 'FRONT_DESK'],
    description: 'Alta de personas con credencial facial capturada desde la cámara.',
  },
  {
    href: '/admin/access',
    label: 'Control de acceso',
    icon: KeyRound,
    roles: ['ADMIN', 'FRONT_DESK'],
    description: 'Dispositivos, decisiones y credenciales.',
  },
  {
    href: '/admin/moderacion',
    label: 'Moderación',
    icon: ShieldAlert,
    roles: ['ADMIN', 'FRONT_DESK'],
    description: 'Contenido reportado por la comunidad, lo urgente primero.',
    requiredPermission: 'moderation:read',
  },
  {
    href: '/admin/permissions',
    label: 'Permisos',
    icon: ShieldCheck,
    roles: ['ADMIN', 'FRONT_DESK'],
    description: 'Otorgar y revocar permisos granulares al personal.',
    requiredPermission: 'admin-access:manage',
  },
  {
    href: '/admin/auditoria',
    label: 'Auditoría',
    icon: ScrollText,
    roles: ['ADMIN', 'FRONT_DESK'],
    description: 'Quién hizo qué, cuándo y sobre qué cuenta.',
    requiredPermission: 'admin-access:manage',
  },
];

/**
 * Consola de plataforma. Vive aparte de `adminNavigation` porque no es «más
 * administración»: son gimnasios distintos, y mezclar las dos listas pondría
 * módulos de un gimnasio concreto delante de quien no está mirando ninguno.
 */
export const systemNavigation: NavigationItem[] = [
  {
    href: '/sistema',
    label: 'Sistema',
    icon: Server,
    roles: ['SYSTEM_ADMIN'],
  },
  {
    href: '/sistema/auditoria',
    label: 'Auditoría global',
    icon: ScrollText,
    roles: ['SYSTEM_ADMIN'],
    description: 'Toda la actividad administrativa de la plataforma.',
  },
];

/**
 * El rol es el piso y el permiso lo estrecha, igual que en el backend
 * (`RolesGuard` y luego `PermissionGuard`). Sin `permissions` no se concede
 * nada que exija permiso: es la misma respuesta que da una cuenta sin
 * concesiones, y así una sesión aún sin resolver no enseña de más.
 */
export function canSee(
  item: NavigationItem,
  role: UserRole,
  permissions?: readonly string[],
) {
  if (item.roles && !item.roles.includes(role)) return false;
  if (!item.requiredPermission) return true;
  return permissions?.includes(item.requiredPermission) ?? false;
}
