'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/shared/lib/cn';

const SECTIONS = [
  { href: '/negocio', label: 'Inicio' },
  { href: '/negocio/publicaciones', label: 'Publicaciones' },
  { href: '/negocio/mensajes', label: 'Mensajes' },
  { href: '/negocio/perfil', label: 'Perfil' },
] as const;

/** Sections of the business portal (plan §4.2). Mensajes since franja 8f; Pedidos joins with 8d. */
export function BusinessNav() {
  const pathname = usePathname();
  return (
    <nav aria-label="Secciones de tu negocio" className="nav-scroll -mx-1 flex gap-1 overflow-x-auto px-1">
      {SECTIONS.map((section) => {
        const active = section.href === '/negocio' ? pathname === '/negocio' : pathname.startsWith(section.href);
        return (
          <Link
            aria-current={active ? 'page' : undefined}
            className={cn(
              'inline-flex min-h-11 shrink-0 items-center rounded-full px-4 text-[15px] font-semibold transition-colors duration-[var(--dur-1)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--volt)]',
              active ? 'bg-[var(--surface-highest)] text-[var(--text)]' : 'text-[var(--text-muted)] hover:text-[var(--text)]',
            )}
            href={section.href}
            key={section.href}
          >
            {section.label}
          </Link>
        );
      })}
    </nav>
  );
}
