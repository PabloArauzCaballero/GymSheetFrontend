'use client';

import { type RefObject, useLayoutEffect, useState } from 'react';

/** Below this the face stops reading as a person: scroll instead of shrinking further. */
const MIN_WIDTH = 240;
/** Breathing room between the CTA and the tab bar (or the viewport edge). */
const MARGIN = 16;

function visibleHeight(selector: string): number {
  const element = document.querySelector<HTMLElement>(selector);
  return element && getComputedStyle(element).display !== 'none' ? element.getBoundingClientRect().height : 0;
}

/**
 * Width of a 4:5 card so that the card AND what follows it (`after`, e.g. its CTA) fit above the
 * bottom tab bar: first from where the card starts on load; when that leaves too little room (short
 * phones), from the top bar, so it fits once scrolled to. `null` until measured (CSS fallback).
 */
export function useFitCardWidth(card: RefObject<HTMLElement | null>, after: RefObject<HTMLElement | null>): number | null {
  const [width, setWidth] = useState<number | null>(null);
  useLayoutEffect(() => {
    const measure = () => {
      const element = card.current;
      if (!element?.parentElement) return;
      const bottomChrome = visibleHeight('[data-tab-bar]');
      const below = (after.current?.getBoundingClientRect().height ?? 0) + MARGIN * 2;
      const available = element.parentElement.getBoundingClientRect().width;
      const top = element.getBoundingClientRect().top + window.scrollY;
      const onLoad = (window.innerHeight - top - bottomChrome - below) * 0.8;
      const scrolled = (window.innerHeight - visibleHeight('header') - bottomChrome - below) * 0.8;
      const fit = onLoad >= MIN_WIDTH ? onLoad : scrolled;
      setWidth(Math.round(Math.min(available, Math.max(fit, MIN_WIDTH))));
    };
    measure();
    window.addEventListener('resize', measure);
    return () => window.removeEventListener('resize', measure);
  }, [card, after]);
  return width;
}
