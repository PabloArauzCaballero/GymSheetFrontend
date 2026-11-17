'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/shared/lib/cn';
import { usePendingOrdersCount } from '@/features/orders/components/business/orders-badge';

const SECTIONS = [
  { href: '/negocio', label: 'Inicio' },
  { href: '/negocio/publicaciones', label: 'Publicaciones' },
  { href: '/negocio/pedidos', label: 'Pedidos' },
  { href: '/negocio/mensajes', label: 'Mensajes' },
  { href: '/negocio/cobro', label: 'Cobro' },
  { href: '/negocio/perfil', label: 'Perfil' },
] as const;

/** Sections of the business portal (plan §4.2). «Pedidos» carries the «Por confirmar» count; Mensajes since franja 8f. */
export function BusinessNav() {
  const pathname = usePathname();
  const pending = usePendingOrdersCount();
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
            {section.href === '/negocio/pedidos' && pending > 0 ? (
              <span className="ml-2 inline-grid min-w-6 place-items-center rounded-full bg-[var(--text)] px-1.5 text-xs font-semibold tabular-nums text-[var(--background)]">
                {pending}
                <span className="sr-only"> por confirmar</span>
              </span>
            ) : null}
          </Link>
        );
      })}
    </nav>
  );
}
