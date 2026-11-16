'use client';

import { useRef } from 'react';

/**
 * Focus goes back to whatever opened a dialog when it closes (Escape, ×, Cancel, a pick).
 *
 * Radix only restores focus to a `Dialog.Trigger`; dialogs opened from state —
 * the imperative `confirm()`, the photo picker, sheets opened by a row — dropped
 * focus on <body>, so a keyboard user lost their place. The opener is read when
 * the content mounts (`capture` in `onOpenAutoFocus`, before Radix moves focus
 * inside): `DialogContent` itself is rendered while closed, so its first render
 * is no clue to who opens it later.
 */
export function useFocusReturn() {
  const opener = useRef<HTMLElement | null>(null);
  return {
    capture: () => {
      opener.current = document.activeElement as HTMLElement | null;
    },
    restore: (event: Event) => {
      const target = opener.current;
      if (!target || target === document.body || !target.isConnected) return;
      event.preventDefault();
      target.focus({ preventScroll: true });
    },
  };
}
