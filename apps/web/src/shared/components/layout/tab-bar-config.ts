import type { UserRole } from '@/shared/api/contracts';
import { navigationFor, type NavigationItem } from './nav-config';

/**
 * La barra de pestañas inferior, como la del móvil (`app/(app)/(tabs)`): sus
 * cinco destinos siempre a un toque. El resto (Inicio incluido) vive en «Más»,
 * que el móvil no necesita porque llega a todo desde sus pantallas.
 *
 * - Socio y coach: Mensajes · Comunidad · Marketplace · Rutinas · Perfil, el
 *   orden del móvil desde el 08/11/2026 (#74).
 * - Personal y plataforma: sus tres primeros módulos y su perfil, para que la
 *   barra nunca enseñe la aplicación del socio a quien no viene a entrenar.
 */
/** Rótulos cortos de la barra del móvil (`Tabs.Screen` → `title`). */
const tabLabels: Record<string, string> = {
  '/chat': 'Mensajes',
  '/profile': 'Perfil',
  // El personal: rótulos de una palabra, que no partan en dos líneas.
  '/admin/operacion': 'Panel',
  '/admin': 'Módulos',
  '/admin/usuarios': 'Usuarios',
  '/sistema': 'Sistema',
};

function withTabLabel(item: NavigationItem): NavigationItem {
  const label = tabLabels[item.href];
  return label ? { ...item, label } : item;
}

const memberTabs = ['/chat', '/comunidad', '/marketplace', '/routines', '/profile'] as const;

export function tabBarFor(role: UserRole, permissions?: readonly string[]): NavigationItem[] {
  const all = navigationFor(role, permissions).flatMap((group) => group.items);
  const byHref = new Map(all.map((item) => [item.href, item]));
  const member = memberTabs
    .map((href) => byHref.get(href))
    .filter((item): item is NavigationItem => Boolean(item));
  if (member.length === memberTabs.length) return member.map(withTabLabel);
  const profile = byHref.get('/profile');
  const work = all.filter((item) => item.href !== '/profile').slice(0, profile ? 3 : 4);
  // El personal mantiene cuatro: sus módulos no caben en cinco rótulos cortos.
  return (profile ? [...work, profile] : work).map(withTabLabel);
}
