import type { ReactNode } from 'react';
import { AmbientBackground } from '@/shared/components/background/ambient-background';
import { BrandLockup } from '@/shared/components/brand/brand-mark';
import { LogoutButton } from '@/shared/components/layout/logout-button';
import { BusinessNav } from '@/features/business-listings/components/business-nav';

/**
 * The business portal's chrome (ADR-0020): brand, account name and sign out.
 * No person navigation at all: Inicio, Publicaciones, Pedidos, Mensajes, Cobro
 * and Perfil (franjas 8c, 8d, 8f).
 */
export function BusinessShell({ accountName, children }: Readonly<{ accountName: string; children: ReactNode }>) {
  return (
    <div className="relative isolate min-h-dvh">
      <AmbientBackground fixed />
      <header className="sticky top-0 z-20 border-b border-[var(--border-subtle)] bg-[color-mix(in_srgb,var(--background)_82%,transparent)] backdrop-blur-md">
        <div className="mx-auto flex h-16 w-full max-w-3xl items-center justify-between gap-4 px-4 sm:px-6">
          <div className="flex min-w-0 items-center gap-3">
            <BrandLockup size={24} />
            <span className="data-label truncate">{accountName}</span>
          </div>
          <LogoutButton />
        </div>
        <div className="mx-auto w-full max-w-3xl px-4 pb-2 sm:px-6">
          <BusinessNav />
        </div>
      </header>
      <main className="mx-auto grid w-full max-w-3xl gap-6 px-4 py-8 sm:px-6 sm:py-10">{children}</main>
    </div>
  );
}
