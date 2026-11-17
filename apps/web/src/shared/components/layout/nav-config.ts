import {
  Activity,
  Bell,
  Building2,
  CalendarCheck,
  ClipboardList,
  Dumbbell,
  Film,
  Gauge,
  GraduationCap,
  House,
  IdCard,
  MessageCircle,
  Settings,
  ShoppingBag,
  UserRound,
  Signpost,
  Sparkles,
  Store,
  Users2,
} from 'lucide-react';
import type { UserRole } from '@/shared/api/contracts';
import { adminNavigation, moderationNavigation, systemNavigation } from './platform-navigation';

export { adminNavigation, moderationNavigation, systemNavigation };

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
};

export const primaryNavigation: NavigationItem[] = [
  // «Inicio», como la primera pestaña del móvil.
  { href: '/dashboard', label: 'Inicio', icon: House },
  // Justo debajo del panel: es la pantalla que responde «¿me estoy acercando a
  // como quiero verme?», y enterrarla al final de la lista la convertiría en
  // una sección que nadie visita.
  { href: '/trayectoria', label: 'Tu senda', icon: Signpost },
  { href: '/workouts', label: 'Entrenamientos', icon: Activity },
  { href: '/plans', label: 'Mis planes', icon: CalendarCheck },
  { href: '/routines', label: 'Rutinas', icon: ClipboardList },
  { href: '/exercises', label: 'Ejercicios', icon: Dumbbell },
  { href: '/comunidad', label: 'Comunidad', icon: Users2 },
  // The confirmed gym (franja 7c): ranking and members, by affiliation.
  { href: '/mi-gimnasio', label: 'Mi gimnasio', icon: Building2 },
  // Pestaña del móvil (#74): ofertas y tiendas sin salir del portal.
  { href: '/marketplace', label: 'Marketplace', icon: Store },
  { href: '/reels', label: 'Reels', icon: Film },
  // Pegada a Comunidad: es lo que pasó ahí mientras no mirabas (likes, vistas
  // de perfil, next). Lleva el único indicador numérico de la navegación, así
  // que enterrarla al final la volvería una notificación que nadie atiende.
  { href: '/interacciones', label: 'Interacciones', icon: Sparkles },
  { href: '/chat', label: 'Mensajes', icon: MessageCircle },
  { href: '/entrenar-juntos', label: 'Entrenar juntos', icon: CalendarCheck },
  // Plans bought in the marketplace (franja 8e) and every order (franja 8d), under the profile.
  { href: '/profile/suscripciones', label: 'Mis suscripciones', icon: IdCard },
  { href: '/profile/compras', label: 'Mis compras', icon: ShoppingBag },
  { href: '/notifications', label: 'Avisos', icon: Bell },
  { href: '/profile', label: 'Mi perfil', icon: UserRound },
  { href: '/settings', label: 'Ajustes', icon: Settings },
  { href: '/tutorials', label: 'Centro de ayuda', icon: GraduationCap },
];

/**
 * Lo personal que conserva el equipo de moderación de REPP: su cuenta, sus
 * avisos y sus conversaciones, detrás de la cola y no mezclado con ella.
 */
export const accountNavigation: NavigationItem[] = [
  { href: '/profile/suscripciones', label: 'Mis suscripciones', icon: IdCard },
  { href: '/notifications', label: 'Avisos', icon: Bell },
  { href: '/chat', label: 'Mensajes', icon: MessageCircle },
  { href: '/profile', label: 'Mi perfil', icon: UserRound },
  { href: '/settings', label: 'Ajustes', icon: Settings },
  { href: '/tutorials', label: 'Centro de ayuda', icon: GraduationCap },
];

/**
 * The role alone decides, as in the backend (`RolesGuard`): the permission
 * catalog left with franja 7d (backend ADR-0029).
 */
export function canSee(item: NavigationItem, role: UserRole) {
  return !item.roles || item.roles.includes(role);
}

/** Un bloque de navegación con su rótulo; sin rótulo cuando hay uno solo. */
export type NavigationGroup = { label?: string; items: NavigationItem[] };

/**
 * Qué navegación le corresponde a cada audiencia.
 *
 * - `SYSTEM_ADMIN`: la plataforma, y debajo los módulos del gimnasio que opera
 *   (franja 7a: REPP opera los gimnasios; ver `platform-navigation.ts`).
 * - `MODERATOR`: the REPP moderation queue first, its own account after
 *   (ADR-0018). It does not come to train here.
 * - `CLIENTE`: la aplicación de la persona. A `NEGOCIO` mounts the business
 *   portal (`accountKind`), never this navigation.
 */
export function navigationFor(role: UserRole): NavigationGroup[] {
  const visible = (items: NavigationItem[]) => items.filter((item) => canSee(item, role));

  if (role === 'SYSTEM_ADMIN') {
    return [
      { label: 'Plataforma', items: visible(systemNavigation) },
      { label: 'Gimnasio', items: visible(adminNavigation) },
    ];
  }
  if (role === 'MODERATOR') {
    return [
      { label: 'Moderación REPP', items: visible(moderationNavigation) },
      { label: 'Tu cuenta', items: visible(accountNavigation) },
    ];
  }
  return [{ items: visible(primaryNavigation) }];
}
