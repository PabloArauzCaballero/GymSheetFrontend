import { describe, expect, it, vi } from 'vitest';
import { createDirtyRegistry } from './dirty-registry';

describe('dirty registry', () => {
  it('is dirty while any section is, and tells subscribers only on real changes', () => {
    const registry = createDirtyRegistry();
    const listener = vi.fn();
    registry.subscribe(listener);
    registry.set('bio', true);
    registry.set('bio', true);
    registry.set('training', true);
    expect(registry.any()).toBe(true);
    expect(registry.keys()).toEqual(['bio', 'training']);
    registry.set('bio', false);
    expect(registry.any()).toBe(true);
    registry.set('training', false);
    expect(registry.any()).toBe(false);
    expect(listener).toHaveBeenCalledTimes(4);
  });

  it('clears everything at once (after the person chose to leave)', () => {
    const registry = createDirtyRegistry();
    registry.set('data', true);
    registry.clear();
    expect(registry.any()).toBe(false);
  });
});
