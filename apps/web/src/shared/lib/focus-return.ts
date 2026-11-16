'use client';

import { useState } from 'react';

/**
 * Focus goes back to whatever opened a dialog when it closes (Escape, ×, Cancel).
 *
 * Radix only restores focus to a `Dialog.Trigger`; dialogs opened from state —
 * the imperative `confirm()`, sheets opened by a row — dropped focus on <body>,
 * so a keyboard user lost their place. The element focused when the content
 * first renders (before Radix moves focus inside) is the opener.
 */
export function useFocusReturn() {
  const [opener] = useState(() => (typeof document === 'undefined' ? null : (document.activeElement as HTMLElement | null)));
  return (event: Event) => {
    if (!opener || opener === document.body || !opener.isConnected) return;
    event.preventDefault();
    opener.focus({ preventScroll: true });
  };
}
