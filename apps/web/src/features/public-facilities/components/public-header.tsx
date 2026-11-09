'use client';

import Link from 'next/link';
import { BrandLockup } from '@/shared/components/brand/brand-mark';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import { useBrand } from '@/shared/theme/brand-provider';
import { cn } from '@/shared/lib/cn';
import { ButtonLink } from '@/shared/components/ui/button';

const NAV_LINKS = [
  { href: '/#producto', label: 'Producto' },
  { href: '/#planes', label: 'Planes' },
  { href: '/directorio', label: 'Directorio' },
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
          ? 'border-[var(--border-subtle)] glass-bar'
          : 'border-transparent bg-transparent',
      )}
    >
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-5 py-4 sm:px-8">
        {/* El mismo logotipo que el móvil (`ReppLogo`); un gimnasio con marca
            propia conserva su emblema y su rótulo. */}
        <Link aria-label={`${brand.name}, inicio`} className="group inline-flex items-center" href="/">
          <BrandLockup size={28} />
        </Link>
        <nav aria-label="Principal" className="flex items-center gap-1 sm:gap-3">
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
