import type { Rect } from './use-target-rect';
import type { StepPlacement } from '../model/types';

export type Size = { width: number; height: number };
export type Viewport = { width: number; height: number };
export type Side = 'top' | 'bottom' | 'left' | 'right' | 'center';

export type PositionedTooltip = {
  top: number;
  left: number;
  side: Side;
  /** Arrow offset (px) along the tooltip edge, or null for centered steps. */
  arrow: { top: number; left: number } | null;
};

const MARGIN = 8;

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

/** Picks the side with the most available space when placement is 'auto'. */
function autoSide(target: Rect, tooltip: Size, viewport: Viewport, gap: number): Side {
  const space = {
    bottom: viewport.height - (target.top + target.height),
    top: target.top,
    right: viewport.width - (target.left + target.width),
    left: target.left,
  };
  if (space.bottom >= tooltip.height + gap) return 'bottom';
  if (space.top >= tooltip.height + gap) return 'top';
  if (space.right >= tooltip.width + gap) return 'right';
  if (space.left >= tooltip.width + gap) return 'left';
  // Nothing fits comfortably: use the side with the most room.
  const sorted = Object.entries(space).sort((a, b) => b[1] - a[1]);
  return (sorted[0]?.[0] as Side | undefined) ?? 'bottom';
}

/**
 * Computes where to place the tooltip relative to a target, clamped to the
 * viewport. Pure so it can be unit-tested without a DOM.
 */
export function computeTooltipPosition(
  target: Rect | null,
  tooltip: Size,
  viewport: Viewport,
  placement: StepPlacement = 'auto',
  gap = 14,
): PositionedTooltip {
  if (!target || placement === 'center') {
    return {
      top: Math.max(MARGIN, (viewport.height - tooltip.height) / 2),
      left: Math.max(MARGIN, (viewport.width - tooltip.width) / 2),
      side: 'center',
      arrow: null,
    };
  }

  const side: Side = placement === 'auto' ? autoSide(target, tooltip, viewport, gap) : placement;
  const targetCenterX = target.left + target.width / 2;
  const targetCenterY = target.top + target.height / 2;
  const maxLeft = viewport.width - tooltip.width - MARGIN;
  const maxTop = viewport.height - tooltip.height - MARGIN;

  let top: number;
  let left: number;
  switch (side) {
    case 'top':
      top = target.top - tooltip.height - gap;
      left = clamp(targetCenterX - tooltip.width / 2, MARGIN, maxLeft);
      break;
    case 'bottom':
      top = target.top + target.height + gap;
      left = clamp(targetCenterX - tooltip.width / 2, MARGIN, maxLeft);
      break;
    case 'left':
      top = clamp(targetCenterY - tooltip.height / 2, MARGIN, maxTop);
      left = target.left - tooltip.width - gap;
      break;
    default:
      top = clamp(targetCenterY - tooltip.height / 2, MARGIN, maxTop);
      left = target.left + target.width + gap;
      break;
  }
  top = clamp(top, MARGIN, Math.max(MARGIN, maxTop));
  left = clamp(left, MARGIN, Math.max(MARGIN, maxLeft));

  const arrow =
    side === 'top' || side === 'bottom'
      ? { left: clamp(targetCenterX - left, 16, tooltip.width - 16), top: 0 }
      : { top: clamp(targetCenterY - top, 16, tooltip.height - 16), left: 0 };

  return { top, left, side, arrow };
}
