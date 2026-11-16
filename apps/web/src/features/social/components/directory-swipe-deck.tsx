'use client';

import { AnimatePresence } from 'framer-motion';
import { Heart, MessageCircle, Star, Undo2, X } from 'lucide-react';
import { useLayoutEffect, useRef, useState, type ReactNode, type RefObject } from 'react';
import type { GymDirectoryEntry, SwipeDirection } from '@/shared/api/schemas';
import { ChatDot } from '@/features/chat/components/chat-dot';
import { deckActions } from '@/shared/theme/metric-colors';
import { CARD_FLOOR_TOP_ROOM, COMUNIDAD_GAP, DECK_CARD, DECK_CARD_FILL } from './deck-geometry';
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
 * Cinco botones, como la baraja del móvil (`(tabs)/comunidad.tsx`): deshacer,
 * paso, super like, me interesa y mensaje directo. El backend no distingue un
 * «super like»: la estrella envía el mismo `LIKE` que el corazón, igual que en
 * el móvil. El rayo abre una conversación de verdad (`startConversation`).
 * Los dos que deciden son mayores que los demás.
 */
export function DirectorySwipeDeck({
  entries,
  onDecide,
  onInfo,
  onUndo,
  canUndo,
  decidePending,
  undoPending,
  onMessage,
  messagePending = false,
  showHint = true,
  fill = false,
}: Readonly<{
  /** Inside Comunidad's column: the card fills the free height instead of keeping its natural size. */
  fill?: boolean;
  /** The how-to line under the buttons. Off when the page header already says it. */
  showHint?: boolean;
  /** Rayo: abre un chat directo con la persona de arriba. */
  onMessage?: (entry: GymDirectoryEntry) => void;
  messagePending?: boolean;
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
  const cardRef = useRef<HTMLDivElement>(null);
  const floor = useCardFloor(cardRef, fill, top?.userId);

  return (
    // A flex column: the card is the only item that gives way, so the actions always fit under it.
    // `@container` lets the buttons size against the deck's width (cqw), not just the text size.
    <div className={`@container flex min-h-0 w-full flex-1 flex-col items-center justify-[safe_center] ${COMUNIDAD_GAP}`} data-deck>
      <div className={fill ? DECK_CARD_FILL : DECK_CARD} ref={cardRef} style={floor ? { minHeight: floor } : undefined}>
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
      {/* La botonera del móvil: deshacer · paso · super like · me interesa · mensaje. */}
      {/* 48/64 rem buttons that scale with text but never outgrow the deck: each is capped at a share of
          its width (5 buttons + 4 gaps ≤ 97 cqw), and the small ones never drop under 44 px. */}
      <div className="flex w-full max-w-md shrink-0 items-center justify-center gap-[min(0.75rem,2.5cqw)]">
        <DeckAction disabled={!canUndo || undoPending} label="Deshacer la última decisión" onClick={onUndo} size="sm" tone="undo">
          <Undo2 aria-hidden className="size-5" />
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
        {onMessage ? (
          <DeckAction
            disabled={!top || messagePending}
            label={top ? `Enviar mensaje directo a ${top.displayName}` : 'Enviar mensaje directo'}
            onClick={() => top && onMessage(top)}
            size="sm"
            tone="chat"
          >
            <MessageCircle aria-hidden className="size-5 fill-current" />
            {/* The glowing tip is decoration (Chat ink, no figure): the alert pink stays for «someone is waiting». */}
            {top && !messagePending ? <ChatDot className="absolute top-0.5 right-0.5" halo="var(--background)" tone="spark" /> : null}
          </DeckAction>
        ) : null}
      </div>
      {showHint ? (
        <p className="shrink-0 text-center text-xs text-[var(--text-muted)] max-[359px]:hidden @max-[14rem]:hidden [@media(max-height:700px)]:hidden">
          Arrastra la tarjeta o usa los botones. Tu decisión se guarda.
        </p>
      ) : null}
    </div>
  );
}

/**
 * The filling card's floor, from its content: the cards' text band (`data-card-band`, absolutely placed
 * at the bottom, so its height does not depend on the card's) plus room for the progress bars. Re-measured
 * when the band changes size (text scale, a longer name, the next card) — never a guess in rem.
 */
function useCardFloor(cardRef: RefObject<HTMLDivElement | null>, fill: boolean, topId: string | undefined) {
  const [floor, setFloor] = useState<number>();
  useLayoutEffect(() => {
    const card = cardRef.current;
    if (!fill || !card || typeof ResizeObserver === 'undefined') return undefined;
    // Every stacked card's band (the top one, the ones under it, one still leaving): the floor holds them all.
    const bands = [...card.querySelectorAll<HTMLElement>('[data-card-band]')];
    if (bands.length === 0) return undefined;
    // The band's top padding is only the gradient's lead-in: at the floor the top room takes its place.
    const content = (band: HTMLElement) => band.offsetHeight - parseFloat(getComputedStyle(band).paddingTop);
    const measure = () => setFloor(Math.ceil(Math.max(...bands.map(content)) + CARD_FLOOR_TOP_ROOM));
    measure();
    const observer = new ResizeObserver(measure);
    for (const band of bands) observer.observe(band);
    return () => observer.disconnect();
  }, [cardRef, fill, topId]);
  return floor;
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
  // Disabled is announced (aria-disabled keeps it focusable, so a screen reader still finds it) and drawn
  // dashed in --text-disabled (≥3:1 on --surface-low), never faded below legibility.
  return (
    <button
      aria-disabled={disabled || undefined}
      aria-label={label}
      className={`tap relative grid shrink-0 ${size === 'sm' ? 'size-[max(44px,min(3rem,16.5cqw))] [&>svg:first-child]:size-[42%]' : 'size-[min(4rem,20cqw)] [&>svg:first-child]:size-[48%]'} place-items-center rounded-full border ${tone === 'chat' ? 'shadow-[0_6px_18px_-6px_var(--chat-fill-from)]' : ''} transition-transform duration-[var(--dur-1)] motion-reduce:active:scale-100 ${disabled ? 'cursor-not-allowed border-dashed' : 'active:scale-[0.94]'}`}
      onClick={disabled ? undefined : onClick}
      style={disabled ? { background: 'var(--surface-low)', borderColor: 'var(--text-disabled)', color: 'var(--text-disabled)' } : { background: look.bg, borderColor: look.edge, color: look.ink }}
      type="button"
    >
      {children}
    </button>
  );
}
