'use client';

import { useQuery } from '@tanstack/react-query';
import Link, { useLinkStatus } from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useRef, type ReactNode, type RefObject } from 'react';
import {
  interactionKeys,
  interactionsService,
} from '@/features/interactions/services/interactions-service';
import type { SessionPrincipal } from '@/shared/api/contracts';
import { cn } from '@/shared/lib/cn';
import { AmbientBackground } from '@/shared/components/background/ambient-background';
import {
  TutorialLauncher,
  TutorialOverlay,
  TutorialProvider,
} from '@/features/tutorials';
import { Brand } from './brand';
import { navigationFor, type NavigationItem } from './nav-config';
import { LogoutButton } from './logout-button';
import { RouteProgress } from './route-progress';
import { ThemeToggle } from './theme-toggle';

/**
 * Novedades sin atender: likes recibidos y visitas al perfil sin revisar.
 *
 * El fallo se traga a propósito. Es un indicador, no contenido: si la consulta
 * revienta, lo correcto es que el punto no aparezca, no que el portal entero
 * salude con un aviso de error en cada carga de página (la red global de
 * `providers.tsx` avisaría de cualquier consulta caída sin datos).
 */
function useInteractionAlerts() {
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

function NavLink({
  item,
  active,
  compact,
  alerts,
  linkRef,
}: Readonly<{
  item: NavigationItem;
  active: boolean;
  compact: boolean;
  alerts: number;
  linkRef?: RefObject<HTMLAnchorElement | null>;
}>) {
  const Icon = item.icon;
  return (
    <Link
      aria-current={active ? 'page' : undefined}
      className={cn(
        compact
          ? 'tap flex min-h-11 shrink-0 snap-start items-center gap-2 rounded-full border px-4 text-sm font-medium'
          : 'group/nav relative flex min-h-10 items-center gap-3 rounded-[var(--radius-md)] border border-transparent px-3 text-sm font-medium text-[var(--text-muted)] transition-colors duration-[var(--dur-2)] hover:bg-[var(--surface-low)] hover:text-[var(--text)]',
        compact &&
          (active
            ? 'border-[var(--volt)] bg-[var(--volt)] font-semibold text-[var(--accent-contrast)]'
            : 'border-[var(--border-subtle)] bg-[var(--surface-low)] text-[var(--text-muted)]'),
        !compact &&
          active &&
          'border-[var(--border)] bg-[var(--surface-low)] font-semibold text-[var(--text)] before:absolute before:left-0 before:top-1/2 before:h-5 before:w-[3px] before:-translate-y-1/2 before:rounded-full before:bg-[var(--volt)] before:content-[""]',
      )}
      data-tutorial-id={`nav:${item.href}`}
      href={item.href}
      ref={linkRef}
    >
      <Icon
        aria-hidden
        className={cn('size-4', !compact && active && 'text-[var(--accent-ink)]')}
      />
      {item.label}
      <NavAlert count={alerts} />
      <LinkPending />
    </Link>
  );
}

function NavigationLinks({
  session,
  compact = false,
}: Readonly<{ session: SessionPrincipal; compact?: boolean }>) {
  const pathname = usePathname();
  const activeLinkRef = useRef<HTMLAnchorElement>(null);
  const interactionAlerts = useInteractionAlerts();
  // Cada audiencia recibe su navegación y su orden; la decisión vive en
  // `navigationFor` para que la barra lateral y la tira móvil no puedan
  // discrepar.
  const groups = navigationFor(session.role, session.permissions);
  useEffect(() => {
    if (compact) {
      activeLinkRef.current?.scrollIntoView({
        behavior: 'smooth',
        block: 'nearest',
        inline: 'center',
      });
    }
  }, [compact, pathname]);

  // Se ilumina el destino MÁS específico que cubre la ruta, no todos los que
  // la prefijan: en `/admin/operacion` encendían a la vez «Panel del gimnasio»
  // y «Operaciones» (`/admin`), y dos entradas activas no dicen dónde estás.
  // El prefijo sigue valiendo para las páginas de detalle —`/workouts/:id`
  // mantiene encendido «Entrenamientos»—, que es para lo que estaba.
  const activeHref = groups
    .flatMap((group) => group.items)
    .map((item) => item.href)
    .filter(
      (href) =>
        pathname === href || (href !== '/dashboard' && pathname.startsWith(`${href}/`)),
    )
    .reduce<string | null>(
      (best, href) => (best === null || href.length > best.length ? href : best),
      null,
    );

  const renderItem = (item: NavigationItem) => {
    const active = item.href === activeHref;
    return (
      <NavLink
        active={active}
        alerts={item.href === '/interacciones' ? interactionAlerts : 0}
        compact={compact}
        item={item}
        key={item.href}
        linkRef={active ? activeLinkRef : undefined}
      />
    );
  };

  // En móvil la navegación es una tira horizontal: los rótulos de grupo
  // ocuparían el ancho que necesitan los destinos, así que ahí se aplanan y el
  // orden —gimnasio primero— es lo que comunica la separación.
  if (compact) {
    return (
      <nav
        aria-label="Navegación principal"
        className="nav-scroll flex snap-x snap-mandatory gap-2 overflow-x-auto px-4 py-0.5"
      >
        {groups.flatMap((group) => group.items).map(renderItem)}
      </nav>
    );
  }

  return (
    <nav aria-label="Navegación principal" className="flex flex-col gap-5">
      {groups.map((group, index) => (
        <div className="flex flex-col gap-1" key={group.label ?? `grupo-${index}`}>
          {group.label ? (
            <p className="px-3 pb-1 text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--text-disabled)]">
              {group.label}
            </p>
          ) : null}
          {group.items.map(renderItem)}
        </div>
      ))}
    </nav>
  );
}

/** El número, no un punto: «3 personas» y «una» no piden lo mismo. */
function NavAlert({ count }: Readonly<{ count: number }>) {
  if (count <= 0) return null;
  return (
    <span
      aria-label={`${count} novedades`}
      className="ml-auto grid min-w-5 place-items-center rounded-full bg-[var(--volt)] px-1.5 text-[11px] font-semibold text-[var(--accent-contrast)]"
    >
      {count > 99 ? '99+' : count}
    </span>
  );
}

export function PortalShell({
  session,
  children,
}: Readonly<{ session: SessionPrincipal; children: ReactNode }>) {
  const pathname = usePathname();
  return (
    <TutorialProvider role={session.role} userId={session.id}>
    <div className="relative isolate min-h-dvh lg:grid lg:grid-cols-[260px_minmax(0,1fr)]">
      <AmbientBackground variant="portal" fixed behind />
      <RouteProgress />
      <aside className="sticky top-0 hidden h-dvh border-r border-[var(--border-subtle)] bg-[var(--surface-sidebar)] p-5 lg:flex lg:flex-col">
        <Brand />
        <div className="mt-10 flex-1 overflow-y-auto">
          <NavigationLinks session={session} />
        </div>
        <div className="mt-5 border-t border-[var(--border-subtle)] pt-5">
          <p className="truncate text-sm font-semibold">
            {session.nombreCompleto ?? session.email}
          </p>
          <p className="mt-1 text-xs text-[var(--text-muted)]">{session.role}</p>
        </div>
      </aside>
      <div className="min-w-0 pl-[env(safe-area-inset-left)] pr-[env(safe-area-inset-right)]">
        <header className="sticky top-0 z-40 border-b border-[var(--border-subtle)] bg-[var(--header-bg)] pt-[env(safe-area-inset-top)] backdrop-blur-lg">
          <div className="flex h-16 items-center justify-between px-5 lg:px-8">
            <div className="lg:hidden">
              <Brand />
            </div>
            <div className="ml-auto flex items-center gap-3">
              <div className="hidden text-right sm:block">
                <p className="text-sm font-semibold">{session.nombreCompleto ?? session.email}</p>
                <p className="text-[11px] uppercase tracking-[0.08em] text-[var(--text-muted)]">
                  {session.role}
                </p>
              </div>
              <TutorialLauncher />
              <ThemeToggle />
              <LogoutButton />
            </div>
          </div>
          <div className="border-t border-[var(--border-subtle)] py-2 lg:hidden">
            <NavigationLinks compact session={session} />
          </div>
        </header>
        <main
          className="page-enter mx-auto w-full max-w-[1440px] px-4 py-7 pb-[calc(1.75rem+env(safe-area-inset-bottom))] sm:px-8 sm:py-10 sm:pb-[calc(2.5rem+env(safe-area-inset-bottom))] lg:px-12 lg:py-12 lg:pb-[calc(3rem+env(safe-area-inset-bottom))]"
          key={pathname}
        >
          {children}
        </main>
      </div>
      <TutorialOverlay />
    </div>
    </TutorialProvider>
  );
}
