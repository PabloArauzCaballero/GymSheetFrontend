'use client';

import { AnimatePresence } from 'framer-motion';
import { Heart, RotateCcw, Star, X } from 'lucide-react';
import type { ReactNode } from 'react';
import type { DiscoveryCard, SwipeDirection } from '@/shared/api/schemas';
import { deckActions } from '@/shared/theme/metric-colors';
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
 * Cuatro botones: deshacer, paso, super like y me interesa. El backend no
 * distingue un «super like»: la estrella envía el mismo `LIKE` que el corazón,
 * igual que en el móvil. Los dos que deciden son mayores que los demás.
 *
 * There is no direct-message button: the backend only opens a chat once the
 * connection is accepted (403 otherwise), so it could never succeed here.
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
  entries: DiscoveryCard[];
  onDecide: (entry: DiscoveryCard, direction: SwipeDirection) => void;
  onInfo: (entry: DiscoveryCard) => void;
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
      {/* Deck actions: undo · pass · super like · like. */}
      <div className="flex items-center gap-3">
        <DeckAction disabled={!canUndo || undoPending} label="Deshacer la última decisión" onClick={onUndo} size="sm" tone="undo">
          <RotateCcw aria-hidden className="size-5" />
        </DeckAction>
        <DeckAction
          disabled={!top || decidePending}
          label={top ? `Pasar de ${top.displayName}` : 'No me interesa'}
          onClick={() => top && onDecide(top, 'PASS')}
          tone="pass"
        >
          <X aria-hidden className="size-8" />
        </DeckAction>
        <DeckAction
          disabled={!top || decidePending}
          label={top ? `Super like a ${top.displayName}` : 'Super like'}
          onClick={() => top && onDecide(top, 'LIKE')}
          size="sm"
          tone="star"
        >
          <Star aria-hidden className="size-5 fill-current" />
        </DeckAction>
        <DeckAction
          disabled={!top || decidePending}
          label={top ? `Me interesa entrenar con ${top.displayName}` : 'Me interesa entrenar'}
          onClick={() => top && onDecide(top, 'LIKE')}
          tone="like"
        >
          <Heart aria-hidden className="size-8 fill-current" />
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
  tone,
}: Readonly<{
  children: ReactNode;
  disabled: boolean;
  label: string;
  onClick: () => void;
  size?: 'sm' | 'md';
  tone: keyof typeof deckActions;
}>) {
  const look = deckActions[tone];
  return (
    <button
      aria-label={label}
      className={`tap grid ${size === 'sm' ? 'size-12 border-[1.5px]' : 'size-16 border-2'} place-items-center rounded-full shadow-[0_6px_16px_rgb(0_0_0/0.35)] transition-transform duration-[var(--dur-1)] active:scale-[0.94] disabled:pointer-events-none disabled:opacity-40 motion-reduce:active:scale-100`}
      disabled={disabled}
      onClick={onClick}
      style={{ background: look.bg, borderColor: look.edge, color: look.ink }}
      type="button"
    >
      {children}
    </button>
  );
}
