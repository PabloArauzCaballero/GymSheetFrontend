'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/shared/lib/cn';
import { usePendingOrdersCount } from '@/features/orders/components/business/orders-badge';
import { usePendingAffiliationsCount } from '@/features/affiliations/components/gym/socios-badge';

type Section = { href: string; label: string };

const SECTIONS: readonly Section[] = [
  { href: '/negocio', label: 'Inicio' },
  { href: '/negocio/publicaciones', label: 'Publicaciones' },
  { href: '/negocio/pedidos', label: 'Pedidos' },
  { href: '/negocio/cobro', label: 'Cobro' },
  { href: '/negocio/perfil', label: 'Perfil' },
];

/** The section only one business type has (franja 7b): a gym's «Socios», a coach's «Mis gimnasios». */
const BY_TYPE: Readonly<Record<string, Section>> = {
  GYM: { href: '/negocio/socios', label: 'Socios' },
  COACH: { href: '/negocio/gimnasios', label: 'Gimnasios' },
};

function Count({ value, label }: Readonly<{ value: number; label: string }>) {
  if (value <= 0) return null;
  return (
    <span className="ml-2 inline-grid min-w-6 place-items-center rounded-full bg-[var(--text)] px-1.5 text-xs font-semibold tabular-nums text-[var(--background)]">
      {value}
      <span className="sr-only"> {label}</span>
    </span>
  );
}

/**
 * Sections of the business portal (plan §4.2). «Pedidos» carries the «Por
 * confirmar» count and a gym's «Socios» its pending requests; Mensajes joins with 8f.
 */
export function BusinessNav({ entityType = null }: Readonly<{ entityType?: string | null }>) {
  const pathname = usePathname();
  const pending = usePendingOrdersCount();
  const requests = usePendingAffiliationsCount(entityType === 'GYM');
  const extra = entityType ? BY_TYPE[entityType] : undefined;
  const sections = extra ? [...SECTIONS.slice(0, 3), extra, ...SECTIONS.slice(3)] : SECTIONS;
  return (
    <nav aria-label="Secciones de tu negocio" className="nav-scroll -mx-1 flex gap-1 overflow-x-auto px-1">
      {sections.map((section) => {
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
            {section.href === '/negocio/pedidos' ? <Count label="por confirmar" value={pending} /> : null}
            {section.href === '/negocio/socios' ? <Count label="solicitudes" value={requests} /> : null}
          </Link>
        );
      })}
    </nav>
  );
}
