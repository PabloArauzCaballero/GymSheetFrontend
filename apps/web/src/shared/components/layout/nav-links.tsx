'use client';

import { useQuery } from '@tanstack/react-query';
import Link, { useLinkStatus } from 'next/link';
import { usePathname } from 'next/navigation';
import {
  interactionKeys,
  interactionsService,
} from '@/features/interactions/services/interactions-service';
import type { SessionPrincipal } from '@/shared/api/contracts';
import { cn } from '@/shared/lib/cn';
import { navigationFor, type NavigationItem } from './nav-config';

/**
 * Novedades sin atender: likes recibidos y visitas al perfil sin revisar.
 *
 * El fallo se traga a propósito. Es un indicador, no contenido: si la consulta
 * revienta, lo correcto es que el punto no aparezca, no que el portal entero
 * salude con un aviso de error en cada carga de página (la red global de
 * `providers.tsx` avisaría de cualquier consulta caída sin datos).
 */
export function useInteractionAlerts() {
  const counts = useQuery({
    queryKey: interactionKeys.counts,
    queryFn: () => interactionsService.counts().catch(() => null),
    staleTime: 60_000,
  });
  const data = counts.data;
  return data ? data.likesReceived + data.profileViewsNew : 0;
}

/** Instant pending indicator for the link being navigated to. */
function LinkPending() {
  const { pending } = useLinkStatus();
  return pending ? <span aria-hidden className="link-pending ml-auto" /> : null;
}

/**
 * Se ilumina el destino MÁS específico que cubre la ruta, no todos los que la
 * prefijan: en `/admin/operacion` encendían a la vez «Panel del gimnasio» y
 * «Operaciones» (`/admin`), y dos entradas activas no dicen dónde estás. El
 * prefijo sigue valiendo para las páginas de detalle —`/workouts/:id` mantiene
 * encendido «Entrenamientos»—, que es para lo que estaba.
 */
export function activeHrefFor(pathname: string, hrefs: readonly string[]): string | null {
  return hrefs
    .filter((href) => pathname === href || (href !== '/dashboard' && pathname.startsWith(`${href}/`)))
    .reduce<string | null>(
      (best, href) => (best === null || href.length > best.length ? href : best),
      null,
    );
}

/**
 * Fila de la barra lateral y de la hoja «Más». El destino activo lleva la
 * píldora jade suave de la barra de pestañas del móvil (`alpha(volt, 0.2)`),
 * no una franja lateral.
 */
function NavLink({
  item,
  active,
  alerts,
  onNavigate,
}: Readonly<{
  item: NavigationItem;
  active: boolean;
  alerts: number;
  onNavigate?: () => void;
}>) {
  const Icon = item.icon;
  return (
    <Link
      aria-current={active ? 'page' : undefined}
      className={cn(
        'tap relative flex min-h-11 items-center gap-3 rounded-[var(--radius-md)] px-3 text-[15px] font-medium transition-colors duration-[var(--dur-2)]',
        active
          ? 'bg-[color-mix(in_srgb,var(--volt)_20%,transparent)] font-semibold text-[var(--text)]'
          : 'text-[var(--text-muted)] hover:bg-[var(--surface-low)] hover:text-[var(--text)]',
      )}
      data-tutorial-id={`nav:${item.href}`}
      href={item.href}
      onClick={onNavigate}
    >
      <Icon
        aria-hidden
        className={cn('size-5 shrink-0', active && 'text-[var(--accent-ink)]')}
        strokeWidth={active ? 2.25 : 1.75}
      />
      <span className="truncate">{item.label}</span>
      <NavAlert count={alerts} />
      <LinkPending />
    </Link>
  );
}

export function NavigationList({
  session,
  onNavigate,
}: Readonly<{ session: SessionPrincipal; onNavigate?: () => void }>) {
  const pathname = usePathname();
  const interactionAlerts = useInteractionAlerts();
  // Cada audiencia recibe su navegación y su orden; la decisión vive en
  // `navigationFor` para que la barra lateral y la de pestañas no discrepen.
  const groups = navigationFor(session.role, session.permissions);
  const activeHref = activeHrefFor(
    pathname,
    groups.flatMap((group) => group.items).map((item) => item.href),
  );

  return (
    <nav aria-label="Navegación principal" className="flex flex-col gap-6">
      {groups.map((group, index) => (
        <div className="flex flex-col gap-0.5" key={group.label ?? `grupo-${index}`}>
          {group.label ? (
            <p className="px-3 pb-1.5 text-[13px] font-semibold text-[var(--text-muted)]">
              {group.label}
            </p>
          ) : null}
          {group.items.map((item) => (
            <NavLink
              active={item.href === activeHref}
              alerts={item.href === '/interacciones' ? interactionAlerts : 0}
              item={item}
              key={item.href}
              onNavigate={onNavigate}
            />
          ))}
        </div>
      ))}
    </nav>
  );
}

/** El número, no un punto: «3 personas» y «una» no piden lo mismo. */
export function NavAlert({ count, floating = false }: Readonly<{ count: number; floating?: boolean }>) {
  if (count <= 0) return null;
  return (
    <span
      aria-label={`${count} novedades`}
      className={cn(
        'grid min-w-5 place-items-center rounded-full bg-[var(--danger)] px-1.5 text-xs font-semibold leading-5 text-[var(--background)]',
        floating ? 'absolute -right-2.5 -top-1.5' : 'ml-auto',
      )}
    >
      {count > 99 ? '99+' : count}
    </span>
  );
}
