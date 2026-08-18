import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ToastQueue } from '@gymsheet/notifications';

/**
 * The headless queue backs the React Native toast host (apps/mobile). It is
 * tested here because apps/web owns the only test runner in the monorepo.
 */
describe('ToastQueue', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it('shows a toast and auto-dismisses it when its duration elapses', () => {
    const queue = new ToastQueue();
    queue.show({ severity: 'success', message: 'Guardado.', duration: 3000 });
    expect(queue.getSnapshot()).toHaveLength(1);

    vi.advanceTimersByTime(3000);
    expect(queue.getSnapshot()).toHaveLength(0);
  });

  it('keeps a persistent toast on screen', () => {
    const queue = new ToastQueue();
    queue.show({ severity: 'info', message: 'Guardando…', duration: 'persistent' });
    vi.advanceTimersByTime(60_000);
    expect(queue.getSnapshot()).toHaveLength(1);
    expect(queue.getSnapshot()[0]!.pending).toBe(true);
  });

  it('replaces a toast reused by id instead of stacking a second one', () => {
    const queue = new ToastQueue();
    const id = queue.show({ severity: 'info', message: 'Guardando…', duration: 'persistent' });
    queue.show({ severity: 'success', id, message: 'Guardado.', duration: 3000 });

    const items = queue.getSnapshot();
    expect(items).toHaveLength(1);
    expect(items[0]).toMatchObject({ severity: 'success', message: 'Guardado.', pending: false });

    // The replacement brings its own timer; the persistent one is gone.
    vi.advanceTimersByTime(3000);
    expect(queue.getSnapshot()).toHaveLength(0);
  });

  it('caps the visible stack, dropping the oldest toast', () => {
    const queue = new ToastQueue({ maxVisible: 2 });
    queue.show({ severity: 'info', message: 'uno', duration: 5000 });
    queue.show({ severity: 'info', message: 'dos', duration: 5000 });
    queue.show({ severity: 'info', message: 'tres', duration: 5000 });

    expect(queue.getSnapshot().map((item) => item.message)).toEqual(['dos', 'tres']);
  });

  it('notifies subscribers and hands out a stable snapshot reference', () => {
    const queue = new ToastQueue();
    const listener = vi.fn();
    const unsubscribe = queue.subscribe(listener);

    const before = queue.getSnapshot();
    expect(queue.getSnapshot()).toBe(before);

    queue.show({ severity: 'error', message: 'Falló.', duration: 5000 });
    expect(listener).toHaveBeenCalledTimes(1);
    expect(queue.getSnapshot()).not.toBe(before);

    unsubscribe();
    queue.dismiss();
    expect(listener).toHaveBeenCalledTimes(1);
  });

  it('dismiss() without an id clears every toast and its timers', () => {
    const queue = new ToastQueue();
    queue.show({ severity: 'info', message: 'uno', duration: 5000 });
    queue.show({ severity: 'info', message: 'dos', duration: 'persistent' });

    queue.dismiss();
    expect(queue.getSnapshot()).toHaveLength(0);
    expect(vi.getTimerCount()).toBe(0);
  });
});
