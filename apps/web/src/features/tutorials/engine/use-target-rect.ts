'use client';

import { useEffect, useState } from 'react';

export type Rect = { top: number; left: number; width: number; height: number };

function readRect(element: HTMLElement): Rect {
  const rect = element.getBoundingClientRect();
  return { top: rect.top, left: rect.left, width: rect.width, height: rect.height };
}

function sameRect(a: Rect | null, b: Rect | null): boolean {
  if (a === b) return true;
  if (!a || !b) return false;
  return a.top === b.top && a.left === b.left && a.width === b.width && a.height === b.height;
}

/**
 * Tracks the viewport rect of a target element, following scroll, resize and
 * layout shifts (e.g. an async panel resizing). Uses a rAF loop that only
 * updates state when the rect actually changes, so it stays cheap.
 */
export function useTargetRect(element: HTMLElement | null): Rect | null {
  const [rect, setRect] = useState<Rect | null>(() => (element ? readRect(element) : null));

  useEffect(() => {
    let frame = 0;
    let previous: Rect | null = null;

    const tick = () => {
      const nextRect = element && element.isConnected ? readRect(element) : null;
      if (!sameRect(previous, nextRect)) {
        previous = nextRect;
        // setState here runs inside a rAF callback (not synchronously in the
        // effect body), following the target's layout as it moves.
        setRect(nextRect);
      }
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [element]);

  return rect;
}
