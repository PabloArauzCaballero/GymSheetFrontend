'use client';

import * as DialogPrimitive from '@radix-ui/react-dialog';
import { Menu, X } from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState } from 'react';
import type { SessionPrincipal } from '@/shared/api/contracts';
import { cn } from '@/shared/lib/cn';
import { navigationFor } from './nav-config';
import { activeHrefFor, NavAlert, NavigationList, useInteractionAlerts } from './nav-links';
import { tabBarFor } from './tab-bar-config';

/**
 * Barra de pestañas inferior, la del móvil: vidrio oscuro, cuatro destinos con
 * icono y rótulo, y la píldora jade suave detrás del activo. Lo que no cabe
 * vive en «Más», como Ajustes vive detrás de Perfil en la app.
 */
export function TabBar({ session }: Readonly<{ session: SessionPrincipal }>) {
  const pathname = usePathname();
  const interactionAlerts = useInteractionAlerts();
  const [moreOpen, setMoreOpen] = useState(false);
  const tabs = tabBarFor(session.role, session.permissions);
  const all = navigationFor(session.role, session.permissions).flatMap((group) => group.items);
  const ownHref = activeHrefFor(pathname, all.map((item) => item.href));
  // Pantallas que en el móvil se abren DESDE una pestaña y la dejan encendida:
  // Mensajes, Descubrir e Interacciones cuelgan de Comunidad; Entrenos, de Inicio.
  const parentTab: Record<string, string> = {
    '/chat': '/comunidad',
    '/descubrir': '/comunidad',
    '/interacciones': '/comunidad',
    '/reels': '/comunidad',
    '/workouts': '/dashboard',
    '/exercises': '/routines',
  };
  const parent = ownHref ? parentTab[ownHref] : undefined;
  const activeHref = parent && tabs.some((tab) => tab.href === parent) ? parent : ownHref;
  const tabActive = tabs.some((tab) => tab.href === activeHref);

  const tabClasses =
    'tap relative flex min-h-14 flex-1 flex-col items-center justify-center gap-1 text-xs font-semibold leading-none';

  return (
    <nav
      aria-label="Pestañas"
      className="glass-bar fixed inset-x-0 bottom-0 z-40 border-t border-[var(--border-subtle)] pb-[env(safe-area-inset-bottom)] pl-[env(safe-area-inset-left)] pr-[env(safe-area-inset-right)] lg:hidden"
    >
      <div className="mx-auto flex max-w-xl items-stretch px-2 pt-1.5">
        {tabs.map((tab) => {
          const active = tab.href === activeHref;
          const Icon = tab.icon;
          return (
            <Link
              aria-current={active ? 'page' : undefined}
              className={cn(tabClasses, active ? 'text-[var(--accent-ink)]' : 'text-[var(--text-muted)] hover:text-[var(--text)]')}
              data-tutorial-id={`tab:${tab.href}`}
              href={tab.href}
              key={tab.href}
            >
              <span className="relative grid h-8 w-14 place-items-center">
                <span
                  aria-hidden
                  className={cn(
                    'absolute inset-0 rounded-full bg-[color-mix(in_srgb,var(--volt)_20%,transparent)] transition-[opacity,transform] duration-[var(--dur-3)] ease-[var(--ease-out)] motion-reduce:transition-none',
                    active ? 'scale-100 opacity-100' : 'scale-x-[0.55] scale-y-[0.8] opacity-0',
                  )}
                />
                <Icon
                  aria-hidden
                  className="relative size-6"
                  strokeWidth={active ? 2.25 : 1.75}
                />
                {tab.href === '/comunidad' ? (
                  <NavAlert count={interactionAlerts} floating />
                ) : null}
              </span>
              {tab.label}
            </Link>
          );
        })}
        <DialogPrimitive.Root onOpenChange={setMoreOpen} open={moreOpen}>
          <DialogPrimitive.Trigger
            className={cn(
              tabClasses,
              !tabActive && activeHref ? 'text-[var(--accent-ink)]' : 'text-[var(--text-muted)] hover:text-[var(--text)]',
            )}
          >
            <span className="relative grid h-8 w-14 place-items-center">
              <span
                aria-hidden
                className={cn(
                  'absolute inset-0 rounded-full bg-[color-mix(in_srgb,var(--volt)_20%,transparent)] transition-opacity duration-[var(--dur-3)]',
                  !tabActive && activeHref ? 'opacity-100' : 'opacity-0',
                )}
              />
              <Menu aria-hidden className="relative size-6" strokeWidth={1.75} />
            </span>
            Más
          </DialogPrimitive.Trigger>
          <DialogPrimitive.Portal>
            <DialogPrimitive.Overlay className="dialog-overlay fixed inset-0 z-50 bg-[var(--overlay)]" />
            <DialogPrimitive.Content className="sheet-panel fixed inset-x-0 bottom-0 z-50 max-h-[85dvh] overflow-y-auto overscroll-contain rounded-t-[var(--radius-2xl)] bg-[var(--surface-high)] px-4 pb-[calc(1.5rem+env(safe-area-inset-bottom))] pt-3 shadow-[var(--shadow-dialog)] focus:outline-none">
              <span aria-hidden className="mx-auto mb-4 block h-1.5 w-10 rounded-full bg-[var(--border)]" />
              <div className="mb-4 flex items-center justify-between gap-3 px-1">
                <DialogPrimitive.Title className="title-text">Más</DialogPrimitive.Title>
                <DialogPrimitive.Close
                  aria-label="Cerrar"
                  className="grid size-11 place-items-center rounded-full bg-[var(--surface-highest)] text-[var(--text)]"
                >
                  <X aria-hidden className="size-5" />
                </DialogPrimitive.Close>
              </div>
              <DialogPrimitive.Description className="sr-only">
                Todos los destinos del portal.
              </DialogPrimitive.Description>
              <NavigationList onNavigate={() => setMoreOpen(false)} session={session} />
            </DialogPrimitive.Content>
          </DialogPrimitive.Portal>
        </DialogPrimitive.Root>
      </div>
    </nav>
  );
}
