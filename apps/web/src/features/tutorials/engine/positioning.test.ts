import { describe, expect, it } from 'vitest';
import { computeTooltipPosition } from './positioning';
import type { Rect } from './use-target-rect';

const viewport = { width: 1000, height: 800 };
const tooltip = { width: 300, height: 200 };

describe('computeTooltipPosition', () => {
  it('centers when there is no target', () => {
    const result = computeTooltipPosition(null, tooltip, viewport, 'auto');
    expect(result.side).toBe('center');
    expect(result.top).toBe((800 - 200) / 2);
    expect(result.left).toBe((1000 - 300) / 2);
    expect(result.arrow).toBeNull();
  });

  it('centers when placement is center even with a target', () => {
    const target: Rect = { top: 10, left: 10, width: 40, height: 40 };
    expect(computeTooltipPosition(target, tooltip, viewport, 'center').side).toBe('center');
  });

  it('places below a target near the top', () => {
    const target: Rect = { top: 20, left: 480, width: 40, height: 40 };
    const result = computeTooltipPosition(target, tooltip, viewport, 'auto');
    expect(result.side).toBe('bottom');
    expect(result.top).toBeGreaterThanOrEqual(target.top + target.height);
    expect(result.arrow).not.toBeNull();
  });

  it('keeps the tooltip inside the viewport (clamped)', () => {
    const target: Rect = { top: 400, left: 980, width: 20, height: 20 };
    const result = computeTooltipPosition(target, tooltip, viewport, 'right');
    expect(result.left + tooltip.width).toBeLessThanOrEqual(viewport.width);
    expect(result.left).toBeGreaterThanOrEqual(0);
  });

  it('honours an explicit top placement', () => {
    const target: Rect = { top: 500, left: 480, width: 40, height: 40 };
    const result = computeTooltipPosition(target, tooltip, viewport, 'top');
    expect(result.side).toBe('top');
    expect(result.top).toBeLessThan(target.top);
  });
});
