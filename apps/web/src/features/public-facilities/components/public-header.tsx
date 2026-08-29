'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import { useBrand } from '@/shared/theme/brand-provider';
import { cn } from '@/shared/lib/cn';
import { ButtonLink } from '@/shared/components/ui/button';

const NAV_LINKS = [
  { href: '/#producto', label: 'Producto' },
  { href: '/#planes', label: 'Planes' },
  { href: '/gimnasios', label: 'Gimnasios' },
  { href: '/#preguntas', label: 'Preguntas' },
];

/** Chrome de las páginas públicas (landing, directorio): sin sesión, sin sidebar del portal. */
export function PublicHeader() {
  const brand = useBrand();
  const pathname = usePathname();
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <header
      className={cn(
        'sticky top-0 z-50 border-b transition-[background-color,border-color,box-shadow] duration-300',
        scrolled
          ? 'border-[var(--border-subtle)] bg-[color-mix(in_srgb,var(--background)_82%,transparent)] shadow-[0_1px_0_var(--border-subtle),0_16px_32px_-24px_rgb(0_0_0/0.5)] backdrop-blur-md'
          : 'border-transparent bg-transparent',
      )}
    >
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-5 py-4 sm:px-8">
        <Link className="group inline-flex items-center gap-2.5" href="/">
          <span className="grid size-8 place-items-center rounded-[6px] bg-[var(--volt)] text-xs font-bold text-[var(--accent-contrast)] shadow-[0_6px_18px_-6px_rgb(var(--accent-channels)/0.65)] transition-transform duration-300 group-hover:scale-105">
            {brand.monogram}
          </span>
          <span className="text-lg font-bold tracking-[-0.02em] text-[var(--text)]">
            {brand.wordmark}
          </span>
        </Link>
        <nav className="flex items-center gap-1 sm:gap-3">
          {NAV_LINKS.map((link) => {
            const active = pathname === link.href;
            return (
              <Link
                className={cn(
                  'relative hidden px-1 py-2 text-sm font-medium transition-colors sm:inline-block',
                  active ? 'text-[var(--text)]' : 'text-[var(--text-muted)] hover:text-[var(--text)]',
                )}
                href={link.href}
                key={link.href}
              >
                {link.label}
                <span
                  className={cn(
                    'absolute inset-x-0 -bottom-[1px] h-[2px] rounded-full bg-[var(--volt)] transition-transform duration-300',
                    active ? 'scale-x-100' : 'scale-x-0',
                  )}
                />
              </Link>
            );
          })}
          <ButtonLink href="/login" size="sm" variant="ghost">
            Iniciar sesión
          </ButtonLink>
          <ButtonLink href="/register" size="sm" variant="primary">
            Crear cuenta
          </ButtonLink>
        </nav>
      </div>
    </header>
  );
}
