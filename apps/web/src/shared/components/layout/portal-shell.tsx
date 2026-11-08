'use client';

import { roleLabel } from '@/shared/lib/roles';
import { usePathname } from 'next/navigation';
import type { ReactNode } from 'react';
import type { SessionPrincipal } from '@/shared/api/contracts';
import { AmbientBackground } from '@/shared/components/background/ambient-background';
import {
  TutorialLauncher,
  TutorialOverlay,
  TutorialProvider,
} from '@/features/tutorials';
import { Brand } from './brand';
import { LogoutButton } from './logout-button';
import { NavigationList } from './nav-links';
import { RouteProgress } from './route-progress';
import { TabBar } from './tab-bar';
import { ThemeToggle } from './theme-toggle';

export function PortalShell({
  session,
  children,
}: Readonly<{ session: SessionPrincipal; children: ReactNode }>) {
  const pathname = usePathname();
  return (
    <TutorialProvider role={session.role} userId={session.id}>
    <div className="relative isolate min-h-dvh lg:grid lg:grid-cols-[272px_minmax(0,1fr)]">
      <AmbientBackground variant="portal" fixed behind />
      <RouteProgress />
      <aside className="sticky top-0 hidden h-dvh bg-[var(--surface-sidebar)] px-4 py-6 shadow-[inset_-1px_0_0_var(--border-subtle)] lg:flex lg:flex-col">
        <div className="px-3">
          <Brand />
        </div>
        <div className="scrollbar-thin mt-8 flex-1 overflow-y-auto">
          <NavigationList session={session} />
        </div>
        <div className="mt-4 flex items-center gap-3 rounded-[var(--radius-lg)] bg-[var(--surface-low)] p-3 shadow-[var(--shadow-sm)]">
          <span
            aria-hidden
            className="grid size-10 shrink-0 place-items-center rounded-full bg-[var(--surface-highest)] text-[15px] font-semibold"
          >
            {initialsOf(session.nombreCompleto ?? session.email)}
          </span>
          <span className="min-w-0">
            <span className="block truncate text-[15px] font-semibold">
              {session.nombreCompleto ?? session.email}
            </span>
            <span className="block text-[13px] text-[var(--text-muted)]">{roleLabel(session.role)}</span>
          </span>
        </div>
      </aside>
      <div className="min-w-0 pl-[env(safe-area-inset-left)] pr-[env(safe-area-inset-right)]">
        <header className="glass-bar sticky top-0 z-40 border-b border-[var(--border-subtle)] pt-[env(safe-area-inset-top)]">
          <div className="flex h-14 items-center justify-between gap-3 px-4 sm:px-6 lg:h-16 lg:px-10">
            <div className="lg:hidden">
              <Brand />
            </div>
            <div className="ml-auto flex items-center gap-2">
              <TutorialLauncher />
              <ThemeToggle />
              <LogoutButton />
            </div>
          </div>
        </header>
        <main
          className="page-enter mx-auto w-full max-w-[1200px] px-6 pb-[calc(6.5rem+env(safe-area-inset-bottom))] pt-6 sm:px-8 sm:pt-8 lg:px-12 lg:pb-[calc(3rem+env(safe-area-inset-bottom))] lg:pt-10"
          key={pathname}
        >
          {children}
        </main>
      </div>
      <TabBar session={session} />
      <TutorialOverlay />
    </div>
    </TutorialProvider>
  );
}

/** Iniciales para el avatar del pie de la barra lateral (como `PersonAvatar`). */
function initialsOf(name: string): string {
  const parts = name.replace(/@.*/u, '').split(/[\s._-]+/u).filter(Boolean);
  return ((parts[0]?.[0] ?? '') + (parts[1]?.[0] ?? '')).toUpperCase() || '·';
}
