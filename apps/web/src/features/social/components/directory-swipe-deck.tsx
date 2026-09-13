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
 * Cada decisión viaja al servidor (`POST /me/discovery/swipes`): «paso» no es
 * un `slice()` local que se evapora al recargar, sino un descarte que el
 * backend recuerda y que se puede revertir desde «Me dieron next». El
 * componente es deliberadamente tonto —no sabe de red— para que la baraja
 * visible y la cola del servidor no acaben contando dos historias distintas:
 * quien manda es el contenedor.
 *
 * Tres botones y no cinco: no hay «super like» ni «boost» en el backend, y un
 * botón que no hace nada cuesta más confianza de la que gana en parecido. Los
 * dos que deciden son mayores que el que corrige, porque esa es la jerarquía
 * real de la pantalla.
 */
export function DirectorySwipeDeck({
  entries,
  onDecide,
  onInfo,
  onUndo,
  canUndo,
  decidePending,
  undoPending,
}: Readonly<{
  entries: GymDirectoryEntry[];
  onDecide: (entry: GymDirectoryEntry, direction: SwipeDirection) => void;
  onInfo: (entry: GymDirectoryEntry) => void;
  onUndo: () => void;
  canUndo: boolean;
  decidePending: boolean;
  undoPending: boolean;
}>) {
  const visible = entries.slice(0, 3);
  const top = visible[0];

  return (
    <div className="grid justify-items-center gap-6">
      <div className="relative h-[28rem] w-full max-w-md sm:h-[34rem]">
        <AnimatePresence>
          {/* Se pintan en orden inverso para que la primera quede arriba en el
              apilado sin recurrir a `z-index` por tarjeta. */}
          {[...visible].reverse().map((entry, reversedPosition) => (
            <SwipeCard
              entry={entry}
              key={entry.userId}
              onDecide={(direction) => onDecide(entry, direction)}
              onInfo={() => onInfo(entry)}
              position={visible.length - 1 - reversedPosition}
            />
          ))}
        </AnimatePresence>
      </div>
      <div className="flex items-center gap-4">
        <DeckAction
          disabled={!top || decidePending}
          label={top ? `Pasar de ${top.displayName}` : 'Paso'}
          onClick={() => top && onDecide(top, 'PASS')}
          tone="danger"
        >
          <X aria-hidden className="size-7" />
        </DeckAction>
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
          label={top ? `Me interesa ${top.displayName}` : 'Me interesa'}
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
  tone?: 'neutral' | 'accent' | 'danger';
}>) {
  const dimension = size === 'sm' ? 'size-12' : 'size-16';
  const palette =
    tone === 'accent'
      ? // Acento como tinta sobre superficie, no como relleno: el mismo trato
        // que recibe el sello de «me interesa» sobre la foto, para que un solo
        // significado no se pinte de dos colores distintos.
        'border-[var(--volt)] bg-[var(--surface-low)] text-[var(--accent-ink)] hover:bg-[var(--surface)]'
      : tone === 'danger'
        ? 'border-[var(--danger-border)] bg-[var(--surface-low)] text-[var(--danger-text)] hover:bg-[var(--surface)]'
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
