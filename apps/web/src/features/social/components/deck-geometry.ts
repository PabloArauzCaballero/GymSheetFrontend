/**
 * Comunidad's column. While a deck is on screen it is at least the room `PortalShell` leaves between
 * its header and the tab bar, so the card can fill it. Mirrors the shell: header `h-14`/`lg:h-16`
 * + 1px border + top safe area; main `pt-6`/`sm:pt-8`/`lg:pt-10`; bottom `pb-[6.5rem]` over the tab
 * bar (`lg:pb-12` without it), of which the column takes 1rem (`-mb-4`) so the actions sit closer to
 * the bar. A minimum, not a height: when the card is already at its floor (very large text, short
 * phone) the column grows, the page scrolls, and the shell's bottom padding (≥ the tab bar, both in
 * rem) still lets the action row scroll clear of the bar.
 */
export const COMUNIDAD_COLUMN = [
  '@container has-[[data-deck]]:-mb-4',
  'has-[[data-deck]]:min-h-[calc(100dvh-10.5rem-1px-env(safe-area-inset-top)-env(safe-area-inset-bottom))]',
  'sm:has-[[data-deck]]:min-h-[calc(100dvh-11rem-1px-env(safe-area-inset-top)-env(safe-area-inset-bottom))]',
  'lg:has-[[data-deck]]:mb-0 lg:has-[[data-deck]]:min-h-[calc(100dvh-9.5rem-1px-env(safe-area-inset-top)-env(safe-area-inset-bottom))]',
].join(' ');

/** The card on its own (Descubrir, the skeleton): a 5:7 portrait as wide as the column, capped at 34rem. */
export const DECK_CARD = 'relative aspect-[5/7] max-h-[34rem] w-full max-w-md';

/**
 * The card inside Comunidad's column: it takes the free space (basis 0, grow) up to the same 5:7
 * portrait (140cqw of the deck) and 34rem, and never goes below a floor that holds its content:
 * progress bars, the name and two detail lines (12rem); under a 14rem-wide deck (very large text)
 * those wrap into many more lines, so the floor rises to 24rem (the photo arrows then sit under the
 * progress bars, clear of the name). Rem, so it scales with the text.
 */
export const DECK_CARD_FILL =
  'relative w-full max-w-md flex-1 basis-0 max-h-[min(34rem,140cqw)] @min-[14rem]:min-h-[12rem] @max-[14rem]:min-h-[24rem]';
