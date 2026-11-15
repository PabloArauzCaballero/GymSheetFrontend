import type { LucideIcon } from 'lucide-react';
import Link from 'next/link';

type Action = { key: string; label: string; icon: LucideIcon; href: string; primary?: boolean };

/**
 * Las tres acciones bajo la cara, en círculo y con su nombre debajo (el patrón
 * de Tinder). La central —editar— es la única en relleno de acento.
 */
export function ProfileActions({ actions }: Readonly<{ actions: readonly Action[] }>) {
  return (
    <nav aria-label="Acciones del perfil" className="flex items-end justify-center gap-6">
      {actions.map(({ key, label, icon: Icon, href, primary }) => (
        <Link
          className="group grid min-w-19 justify-items-center gap-1 rounded-[var(--radius-lg)] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[var(--volt)]"
          href={href}
          key={key}
        >
          <span
            className={`grid place-items-center rounded-full transition-transform duration-[var(--dur-1)] group-active:scale-[0.94] motion-reduce:transition-none ${
              primary
                ? 'size-16 bg-[var(--volt)] text-[var(--accent-contrast)]'
                : 'size-13 border border-[var(--border)] bg-[var(--surface-high)] text-[var(--text)] group-hover:bg-[var(--surface-highest)]'
            }`}
          >
            <Icon aria-hidden className={primary ? 'size-6' : 'size-5'} />
          </span>
          <span className={`t-footnote ${primary ? 'font-semibold' : 'text-[var(--text-muted)]'}`}>{label}</span>
        </Link>
      ))}
    </nav>
  );
}
