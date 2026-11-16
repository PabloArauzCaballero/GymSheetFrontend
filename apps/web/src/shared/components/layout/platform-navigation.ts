import { Award, BadgeCheck, ClipboardList, ScrollText, Server, ShieldAlert, UserCog } from 'lucide-react';
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
];

/**
 * Consola de plataforma. Vive aparte de `adminNavigation` porque no es «más
 * administración»: son gimnasios distintos, y mezclar las dos listas pondría
 * módulos de un gimnasio concreto delante de quien no está mirando ninguno.
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
