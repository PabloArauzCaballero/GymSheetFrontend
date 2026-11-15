import type { LucideIcon } from 'lucide-react';
import Link from 'next/link';

type Action = { key: string; label: string; icon: LucideIcon; primary?: boolean } & (
  | { href: string }
  // `disabled` keeps the slot but makes it inert, so the row never reflows; `disabledLabel` says why.
  | { onClick: () => void; disabled?: boolean; disabledLabel?: string }
);

// Below 14rem of row (only with very large text: 14rem grows with the root font) each action becomes a full-width row, icon then label.
const ITEM =
  'group grid min-h-11 min-w-0 justify-items-center gap-1 rounded-[var(--radius-lg)] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[var(--volt)] @max-[14rem]:flex @max-[14rem]:items-center @max-[14rem]:gap-2 @max-[14rem]:text-left';

/**
 * Las acciones bajo la cara, en círculo y con su nombre debajo (el patrón de
 * Tinder). Columnas iguales: a 320 px ninguna etiqueta se corta ni empuja a la
 * de al lado; con texto grande pasan a dos líneas o, si ni así caben, a filas.
 * La principal —editar— es la única en relleno de acento.
 */
export function ProfileActions({ actions }: Readonly<{ actions: readonly Action[] }>) {
  return (
    <div className="@container w-full">
      <nav aria-label="Acciones del perfil" className="grid w-full auto-cols-fr grid-flow-col items-end @max-[14rem]:grid-flow-row @max-[14rem]:gap-2">
        {actions.map((action) => {
          const { key, label, icon: Icon, primary } = action;
          const body = (
            <>
              <span
                className={`grid shrink-0 place-items-center rounded-full transition-transform duration-[var(--dur-1)] group-active:scale-[0.94] motion-reduce:transition-none ${
                  primary
                    ? 'size-16 bg-[var(--volt)] text-[var(--accent-contrast)] @max-[14rem]:size-11'
                    : 'size-13 @max-[14rem]:size-11 border border-[var(--border)] bg-[var(--surface-high)] text-[var(--text)] group-hover:bg-[var(--surface-highest)]'
                }`}
              >
                <Icon aria-hidden className={primary ? 'size-6' : 'size-5'} />
              </span>
              <span className={`t-footnote max-w-full min-w-0 text-center text-balance @max-[14rem]:text-left @max-[14rem]:hyphens-auto @max-[14rem]:[overflow-wrap:anywhere] ${primary ? 'font-semibold' : 'text-[var(--text-muted)]'}`}>{label}</span>
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
    </div>
  );
}
