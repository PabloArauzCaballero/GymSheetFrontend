import {
  Activity,
  Award,
  BadgeCheck,
  BarChart3,
  Building2,
  ClipboardList,
  Dumbbell,
  KeyRound,
  ScanFace,
  ScrollText,
  Server,
  ShieldAlert,
  ShieldCheck,
  Store,
  UserCog,
  Users,
} from 'lucide-react';
import type { UserRole } from '@/shared/api/contracts';
import type { NavigationItem } from './nav-config';

/**
 * The REPP moderation console (backend ADR-0018): the central team
 * (`MODERATOR`) and the platform admin. Gym staff never sees it; the backend
 * answers 403 to them whatever grants they hold.
 */
export const moderationNavigation: NavigationItem[] = [
  {
    href: '/moderacion',
    label: 'Moderación',
    icon: ShieldAlert,
    roles: ['MODERATOR', 'SYSTEM_ADMIN'],
    description: 'Denuncias de todos los gimnasios, lo urgente primero.',
  },
  {
    // The platform admin reviews routines in «Rutinas REPP», where it can also write.
    href: '/moderacion/rutinas',
    label: 'Rutinas denunciadas',
    icon: ClipboardList,
    roles: ['MODERATOR'],
    description: 'Rutinas públicas ocultas o con denuncias abiertas.',
  },
  {
    // A selfie is biometric data: only the central team compares it, never the gym.
    href: '/moderacion/verificaciones',
    label: 'Verificaciones',
    icon: BadgeCheck,
    roles: ['MODERATOR', 'SYSTEM_ADMIN'],
    description: 'Selfies de todos los gimnasios por comparar con las fotos del perfil.',
  },
  {
    // Business KYC: identity in clear and private documents, audited on every read (ADR-0021).
    href: '/moderacion/negocios',
    label: 'Negocios',
    icon: Store,
    roles: ['MODERATOR', 'SYSTEM_ADMIN'],
    description: 'Verificación de negocios: colas de revisión, documentos y suspensiones.',
  },
];

/**
 * Consola de plataforma: lo que no depende de ningún gimnasio. Los módulos de
 * un gimnasio concreto van aparte, en `adminNavigation`.
 */
export const systemNavigation: NavigationItem[] = [
  { href: '/sistema', label: 'Sistema', icon: Server, roles: ['SYSTEM_ADMIN'] },
  {
    href: '/sistema/auditoria',
    label: 'Auditoría global',
    icon: ScrollText,
    roles: ['SYSTEM_ADMIN'],
    description: 'Toda la actividad administrativa de la plataforma.',
  },
  ...moderationNavigation,
  {
    href: '/sistema/moderadores',
    label: 'Equipo de moderación',
    icon: UserCog,
    roles: ['SYSTEM_ADMIN'],
    description: 'Quién modera en REPP: sumar o quitar personas del equipo.',
  },
  {
    href: '/sistema/rutinas-repp',
    label: 'Rutinas REPP',
    icon: Award,
    roles: ['SYSTEM_ADMIN'],
    description: 'Catálogo oficial: crear, marcar y desmarcar rutinas recomendadas por REPP.',
  },
];

/** Who operates a gym since franja 7a: REPP's platform admin, impersonating it. */
const GYM_OPERATOR: readonly UserRole[] = ['SYSTEM_ADMIN'];

/**
 * Administration of ONE gym, moved from the gym staff to the platform admin
 * (franja 7a). The pages keep their `/admin/*` addresses; they act on the gym
 * chosen in `/sistema` («Elegir gimnasio»).
 */
export const adminNavigation: NavigationItem[] = [
  {
    // First: the screen that says who to call today in the gym being operated.
    href: '/admin/operacion',
    label: 'Panel del gimnasio',
    icon: BarChart3,
    roles: GYM_OPERATOR,
    description: 'Uso del equipamiento, flujo de personas y quién no ha renovado.',
  },
  // Sin `description`: es la propia rejilla, y listarse a sí misma dentro sería
  // un enlace que devuelve a donde ya estás.
  { href: '/admin', label: 'Operaciones', icon: ShieldCheck, roles: GYM_OPERATOR },
  {
    href: '/admin/usuarios',
    label: 'Usuarios',
    icon: Users,
    roles: GYM_OPERATOR,
    description: 'Todas las cuentas, con su membresía y su última actividad.',
  },
  {
    href: '/admin/equipment',
    label: 'Equipamiento',
    icon: Dumbbell,
    roles: GYM_OPERATOR,
    description: 'Inventario visible y operaciones autorizadas por rol.',
  },
  {
    href: '/admin/exercises',
    label: 'Catálogo global',
    icon: Activity,
    roles: GYM_OPERATOR,
    description: 'Ejercicios globales e importación controlada de dataset.',
  },
  {
    href: '/admin/facilities',
    label: 'Instalaciones',
    icon: Building2,
    roles: GYM_OPERATOR,
    description: 'Sedes, salas, puntos de acceso y mantenimiento.',
  },
  {
    href: '/admin/membership',
    label: 'Clientes',
    icon: Users,
    roles: GYM_OPERATOR,
    description: 'Planes, clientes, vigencias y personal.',
  },
  {
    href: '/admin/people',
    label: 'Registrar persona',
    icon: ScanFace,
    roles: GYM_OPERATOR,
    description: 'Alta de personas con credencial facial capturada desde la cámara.',
  },
  {
    href: '/admin/access',
    label: 'Control de acceso',
    icon: KeyRound,
    roles: GYM_OPERATOR,
    description: 'Dispositivos, decisiones y credenciales.',
  },
  {
    href: '/admin/permissions',
    label: 'Permisos',
    icon: ShieldCheck,
    roles: GYM_OPERATOR,
    description: 'Otorgar y revocar permisos granulares de administración.',
    requiredPermission: 'admin-access:manage',
  },
  {
    href: '/admin/auditoria',
    label: 'Auditoría',
    icon: ScrollText,
    roles: GYM_OPERATOR,
    description: 'Quién hizo qué, cuándo y sobre qué cuenta.',
    requiredPermission: 'admin-access:manage',
  },
];
