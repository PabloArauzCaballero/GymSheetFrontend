/**
 * Comunidad's column. While a deck is on screen it is at least the room `PortalShell` leaves between
 * its header and the tab bar, so the card can fill it. Mirrors the shell: header `h-14`/`lg:h-16`
 * + 1px border + top safe area; main `pt-6`/`sm:pt-8`/`lg:pt-10`; bottom `pb-[6.5rem]` over the tab
 * bar (`lg:pb-12` without it), of which the column takes 1.75rem (`-mb-[1.75rem]`): the bar is
 * ≈3.9rem tall (`min-h-14` + `pt-1.5` + border), so the actions end ≈0.75rem above it at any text
 * size instead of leaving a dead band. A minimum, not a height: when the card is already at its floor
 * (very large text, short phone) the column grows, the page scrolls, and the shell's bottom padding
 * (≥ the tab bar, both in rem) still lets the action row scroll clear of the bar.
 */
export const COMUNIDAD_COLUMN = [
  '@container has-[[data-deck]]:-mb-[1.75rem]',
  'has-[[data-deck]]:min-h-[calc(100dvh-9.75rem-1px-env(safe-area-inset-top)-env(safe-area-inset-bottom))]',
  'sm:has-[[data-deck]]:min-h-[calc(100dvh-10.25rem-1px-env(safe-area-inset-top)-env(safe-area-inset-bottom))]',
  'lg:has-[[data-deck]]:mb-0 lg:has-[[data-deck]]:min-h-[calc(100dvh-9.5rem-1px-env(safe-area-inset-top)-env(safe-area-inset-bottom))]',
].join(' ');

/** Gaps of the Comunidad column and deck: rem, but they stop growing at 16 px (the room goes to the card). */
export const COMUNIDAD_GAP = 'gap-[min(1rem,16px)]';

/** The card on its own (Descubrir, the skeleton): a 5:7 portrait as wide as the column, capped at 34rem. */
export const DECK_CARD = 'relative aspect-[5/7] max-h-[34rem] w-full max-w-md';

/**
 * The card inside Comunidad's column: it takes the free space (basis 0, grow) up to the same 5:7
 * portrait (140cqw of the deck) and 34rem. Its floor is what its face needs — the text band plus room
 * for the progress bars — measured by `useCardFloor` (`directory-swipe-deck.tsx`) and set inline; the
 * 12rem here only holds the first frame. So with large text the card gives up photo, not words, and the
 * page scrolls only when even that floor does not fit (a short phone at 200 %).
 */
export const DECK_CARD_FILL = 'relative w-full max-w-md flex-1 basis-0 max-h-[min(34rem,140cqw)] min-h-[12rem]';

/** Above the text band at the floor: the progress bars (12 px down, 3 px tall) and a strip of photo. */
export const CARD_FLOOR_TOP_ROOM = 24;
