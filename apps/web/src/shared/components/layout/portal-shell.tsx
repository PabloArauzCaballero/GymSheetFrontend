'use client';

import Link, { useLinkStatus } from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useRef, type ReactNode } from 'react';
import type { SessionPrincipal } from '@/shared/api/contracts';
import { cn } from '@/shared/lib/cn';
import { Brand } from './brand';
import { adminNavigation, canSee, primaryNavigation } from './nav-config';
import { LogoutButton } from './logout-button';
import { RouteProgress } from './route-progress';
import { ThemeToggle } from './theme-toggle';

/** Instant pending indicator for the link being navigated to. */
function LinkPending() {
  const { pending } = useLinkStatus();
  return pending ? <span aria-hidden className="link-pending ml-auto" /> : null;
}

function NavigationLinks({
  session,
  compact = false,
}: Readonly<{ session: SessionPrincipal; compact?: boolean }>) {
  const pathname = usePathname();
  const activeLinkRef = useRef<HTMLAnchorElement>(null);
  const items = [...primaryNavigation, ...adminNavigation].filter((item) =>
    canSee(item, session.role),
  );
  useEffect(() => {
    if (compact) {
      activeLinkRef.current?.scrollIntoView({
        behavior: 'smooth',
        block: 'nearest',
        inline: 'center',
      });
    }
  }, [compact, pathname]);

  return (
    <nav
      aria-label="Navegación principal"
      className={cn(
        'flex gap-2',
        compact ? 'nav-scroll snap-x snap-mandatory overflow-x-auto px-4 py-0.5' : 'flex-col gap-1',
      )}
    >
      {items.map((item) => {
        const active =
          pathname === item.href ||
          (item.href !== '/dashboard' && pathname.startsWith(`${item.href}/`));
        const Icon = item.icon;
        if (compact) {
          return (
            <Link
              aria-current={active ? 'page' : undefined}
              className={cn(
                'tap flex min-h-11 shrink-0 snap-start items-center gap-2 rounded-full border px-4 text-sm font-semibold',
                active
                  ? 'border-[var(--volt)] bg-[var(--volt)] text-black shadow-[0_6px_20px_-8px_rgb(195_244_0/0.6)]'
                  : 'border-[var(--border-subtle)] bg-[var(--surface-low)] text-[var(--text-muted)]',
              )}
              href={item.href}
              key={item.href}
              ref={active ? activeLinkRef : undefined}
            >
              <Icon
                aria-hidden
                className={cn('size-4 transition-transform', active && 'animate-pop')}
              />
              {item.label}
              <LinkPending />
            </Link>
          );
        }
        return (
          <Link
            aria-current={active ? 'page' : undefined}
            className={cn(
              'group/nav relative flex min-h-10 items-center gap-3 overflow-hidden rounded-[6px] border border-transparent px-3 text-sm font-semibold text-[var(--text-muted)] transition-all duration-200 hover:translate-x-1 hover:bg-[var(--surface-low)] hover:text-[var(--text)]',
              active &&
                'border-[var(--border)] bg-[var(--surface-low)] text-[var(--text)] before:absolute before:left-0 before:top-1/2 before:h-5 before:w-[3px] before:-translate-y-1/2 before:rounded-full before:bg-[var(--volt)] before:shadow-[0_0_10px_var(--volt)] before:content-[""]',
            )}
            href={item.href}
            key={item.href}
            ref={active ? activeLinkRef : undefined}
          >
            <Icon
              aria-hidden
              className={cn(
                'size-4 transition-all duration-200 group-hover/nav:scale-110',
                active ? 'text-[var(--accent-ink)]' : 'group-hover/nav:text-[var(--accent-ink)]',
              )}
            />
            {item.label}
            <LinkPending />
          </Link>
        );
      })}
    </nav>
  );
}

export function PortalShell({
  session,
  children,
}: Readonly<{ session: SessionPrincipal; children: ReactNode }>) {
  const pathname = usePathname();
  return (
    <div className="min-h-dvh lg:grid lg:grid-cols-[260px_minmax(0,1fr)]">
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
      <div className="min-w-0">
        <header className="sticky top-0 z-40 border-b border-[var(--border-subtle)] bg-[var(--header-bg)] backdrop-blur-lg">
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
              <ThemeToggle />
              <LogoutButton />
            </div>
          </div>
          <div className="border-t border-[var(--border-subtle)] py-2 lg:hidden">
            <NavigationLinks compact session={session} />
          </div>
        </header>
        <main
          className="page-enter mx-auto w-full max-w-[1440px] px-4 py-7 sm:px-8 sm:py-10 lg:px-12 lg:py-12"
          key={pathname}
        >
          {children}
        </main>
      </div>
    </div>
  );
}
