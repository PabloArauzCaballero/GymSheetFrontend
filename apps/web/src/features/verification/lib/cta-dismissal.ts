'use client';

import { useSyncExternalStore } from 'react';

/**
 * «Ahora no» on the verification CTA lasts for this tab's session, in memory
 * only: a full reload brings the CTA back. Nothing goes to Web Storage.
 */
let dismissed = false;
const listeners = new Set<() => void>();

export function dismissVerificationCta(): void {
  dismissed = true;
  listeners.forEach((listener) => listener());
}

/** Test seam: the store is module state. */
export function resetVerificationCtaDismissal(): void {
  dismissed = false;
  listeners.forEach((listener) => listener());
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function useVerificationCtaDismissed(): boolean {
  return useSyncExternalStore(subscribe, () => dismissed, () => false);
}
