'use client';

import { cn } from '@/shared/lib/cn';
import { SPOTLIGHT_PADDING, TUTORIAL_Z } from '../constants';
import type { Rect } from '../engine/use-target-rect';

/**
 * Draws the dimmed backdrop with a cut-out around the target. Instead of one
 * full overlay (which would block the target), it renders four panels around
 * the target rect, leaving the target itself uncovered and interactive. When
 * there is no target the whole viewport is dimmed.
 */
export function TutorialSpotlight({
  rect,
  onBackdropClick,
  reducedMotion,
}: Readonly<{
  rect: Rect | null;
  onBackdropClick?: () => void;
  reducedMotion: boolean;
}>) {
  const panelClass = cn(
    'fixed bg-[var(--overlay)]',
    !reducedMotion && 'animate-fade-in',
  );
  const style = { zIndex: TUTORIAL_Z } as const;

  if (!rect) {
    return (
      <div
        aria-hidden
        className={cn('inset-0', panelClass)}
        onClick={onBackdropClick}
        style={style}
      />
    );
  }

  const pad = SPOTLIGHT_PADDING;
  const top = Math.max(0, rect.top - pad);
  const left = Math.max(0, rect.left - pad);
  const width = rect.width + pad * 2;
  const height = rect.height + pad * 2;
  const bottom = top + height;
  const right = left + width;

  return (
    <>
      {/* Top */}
      <div
        aria-hidden
        className={panelClass}
        onClick={onBackdropClick}
        style={{ ...style, top: 0, left: 0, right: 0, height: top }}
      />
      {/* Bottom */}
      <div
        aria-hidden
        className={panelClass}
        onClick={onBackdropClick}
        style={{ ...style, top: bottom, left: 0, right: 0, bottom: 0 }}
      />
      {/* Left */}
      <div
        aria-hidden
        className={panelClass}
        onClick={onBackdropClick}
        style={{ ...style, top, left: 0, width: left, height }}
      />
      {/* Right */}
      <div
        aria-hidden
        className={panelClass}
        onClick={onBackdropClick}
        style={{ ...style, top, left: right, right: 0, height }}
      />
      {/* Highlight ring — non-interactive so clicks reach the real element */}
      <div
        aria-hidden
        className={cn(
          'pointer-events-none fixed rounded-[8px]',
          'ring-2 ring-[var(--volt)] shadow-[0_0_0_4px_rgba(195,244,0,0.18)]',
          !reducedMotion && 'transition-all duration-200 ease-out',
        )}
        style={{ zIndex: TUTORIAL_Z + 1, top, left, width, height }}
      />
    </>
  );
}
