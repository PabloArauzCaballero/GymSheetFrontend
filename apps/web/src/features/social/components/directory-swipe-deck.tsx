'use client';

import { AnimatePresence } from 'framer-motion';
import { Heart, RotateCcw, X } from 'lucide-react';
import type { ReactNode } from 'react';
import type { GymDirectoryEntry, SwipeDirection } from '@/shared/api/schemas';
import { SwipeCard } from './swipe-card';

/**
 * Descubrimiento de socios: una tarjeta a la vez, se desliza o se decide con
 * los botones.
 *
 * Cada decisión viaja al servidor (`POST /me/discovery/swipes`): «paso» ya no
 * es un `slice()` local que se evaporaba al recargar, sino un descarte que el
 * backend recuerda y que se puede revertir desde «Me dieron next». El componente
 * es deliberadamente tonto —no sabe de red— para que la baraja visible y la
 * cola del servidor no acaben contando dos historias distintas: quien manda es
 * el contenedor.
 */
export function DirectorySwipeDeck({
  entries,
  onDecide,
  onUndo,
  canUndo,
  decidePending,
  undoPending,
}: Readonly<{
  entries: GymDirectoryEntry[];
  onDecide: (entry: GymDirectoryEntry, direction: SwipeDirection) => void;
  onUndo: () => void;
  canUndo: boolean;
  decidePending: boolean;
  undoPending: boolean;
}>) {
  const visible = entries.slice(0, 3);
  const top = visible[0];

  return (
    <div className="grid justify-items-center gap-6">
      <div className="relative h-[26rem] w-full max-w-sm sm:h-[30rem]">
        <AnimatePresence>
          {/* Se pintan en orden inverso para que la primera quede arriba en el
              apilado sin recurrir a `z-index` por tarjeta. */}
          {[...visible].reverse().map((entry, reversedPosition) => (
            <SwipeCard
              entry={entry}
              key={entry.userId}
              onDecide={(direction) => onDecide(entry, direction)}
              position={visible.length - 1 - reversedPosition}
            />
          ))}
        </AnimatePresence>
      </div>
      <div className="flex items-center gap-4">
        <DeckAction
          disabled={!canUndo || undoPending}
          label="Deshacer la última decisión"
          onClick={onUndo}
          size="sm"
        >
          <RotateCcw aria-hidden className="size-5" />
        </DeckAction>
        <DeckAction
          disabled={!top || decidePending}
          label="Paso"
          onClick={() => top && onDecide(top, 'PASS')}
        >
          <X aria-hidden className="size-6" />
        </DeckAction>
        <DeckAction
          disabled={!top || decidePending}
          label="Me gusta"
          onClick={() => top && onDecide(top, 'LIKE')}
          tone="accent"
        >
          <Heart aria-hidden className="size-7" />
        </DeckAction>
      </div>
      <p className="text-center text-xs text-[var(--text-muted)]">
        Arrastra la tarjeta o usa los botones. Tu decisión se guarda.
      </p>
    </div>
  );
}

function DeckAction({
  children,
  disabled,
  label,
  onClick,
  size = 'md',
  tone = 'neutral',
}: Readonly<{
  children: ReactNode;
  disabled: boolean;
  label: string;
  onClick: () => void;
  size?: 'sm' | 'md';
  tone?: 'neutral' | 'accent';
}>) {
  const dimension = size === 'sm' ? 'size-12' : tone === 'accent' ? 'size-16' : 'size-14';
  const palette =
    tone === 'accent'
      ? 'border-[var(--volt)] bg-[var(--volt)] text-[var(--accent-contrast)] hover:border-[var(--volt-dim)] hover:bg-[var(--volt-dim)]'
      : 'border-[var(--border)] bg-[var(--surface-low)] text-[var(--text-muted)] hover:text-[var(--text)]';
  return (
    <button
      aria-label={label}
      className={`hover-lift tap grid ${dimension} place-items-center rounded-full border ${palette} transition-colors duration-[var(--dur-2)] disabled:pointer-events-none disabled:opacity-40`}
      disabled={disabled}
      onClick={onClick}
      type="button"
    >
      {children}
    </button>
  );
}
