import type { LucideIcon } from 'lucide-react';
import Link from 'next/link';

type Action = { key: string; label: string; icon: LucideIcon; primary?: boolean } & (
  | { href: string }
  // `disabled` keeps the slot but makes it inert, so the row never reflows; `disabledLabel` says why.
  | { onClick: () => void; disabled?: boolean; disabledLabel?: string }
);

const ITEM = 'group grid min-h-11 min-w-0 justify-items-center gap-1 rounded-[var(--radius-lg)] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[var(--volt)]';

/**
 * Las acciones bajo la cara, en círculo y con su nombre debajo (el patrón de
 * Tinder). Columnas iguales: a 320 px ninguna etiqueta se corta ni empuja a la
 * de al lado. La principal —editar— es la única en relleno de acento.
 */
export function ProfileActions({ actions }: Readonly<{ actions: readonly Action[] }>) {
  return (
    <nav aria-label="Acciones del perfil" className="grid w-full auto-cols-fr grid-flow-col items-end">
      {actions.map((action) => {
        const { key, label, icon: Icon, primary } = action;
        const body = (
          <>
            <span
              className={`grid place-items-center rounded-full transition-transform duration-[var(--dur-1)] group-active:scale-[0.94] motion-reduce:transition-none ${
                primary
                  ? 'size-16 bg-[var(--volt)] text-[var(--accent-contrast)]'
                  : 'size-13 border border-[var(--border)] bg-[var(--surface-high)] text-[var(--text)] group-hover:bg-[var(--surface-highest)]'
              }`}
            >
              <Icon aria-hidden className={primary ? 'size-6' : 'size-5'} />
            </span>
            <span className={`t-footnote max-w-full truncate text-center ${primary ? 'font-semibold' : 'text-[var(--text-muted)]'}`}>{label}</span>
          </>
        );
        return 'href' in action ? (
          <Link className={ITEM} href={action.href} key={key}>
            {body}
          </Link>
        ) : (
          <button
            aria-label={action.disabled ? (action.disabledLabel ?? label) : undefined}
            className={`${ITEM} cursor-pointer disabled:cursor-not-allowed disabled:opacity-45`}
            disabled={action.disabled}
            key={key}
            onClick={action.onClick}
            type="button"
          >
            {body}
          </button>
        );
      })}
    </nav>
  );
}
