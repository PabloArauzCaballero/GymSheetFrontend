import { describe, expect, it } from 'vitest';
import { confirm, confirmDelete, confirmStore } from '@gymsheet/notifications';

describe('confirm store', () => {
  it('resolves with confirm when the active prompt is confirmed', async () => {
    const promise = confirm({ title: 'T', message: 'M' });
    expect(confirmStore.getSnapshot()?.title).toBe('T');
    confirmStore.resolveActive('confirm');
    await expect(promise).resolves.toEqual({ confirmed: true, action: 'confirm' });
    expect(confirmStore.getSnapshot()).toBeNull();
  });

  it('distinguishes cancel from dismiss', async () => {
    const cancelled = confirm({ title: 'A', message: 'M' });
    confirmStore.resolveActive('cancel');
    await expect(cancelled).resolves.toEqual({ confirmed: false, action: 'cancel' });

    const dismissed = confirm({ title: 'B', message: 'M' });
    confirmStore.resolveActive('dismiss');
    await expect(dismissed).resolves.toEqual({ confirmed: false, action: 'dismiss' });
  });

  it('queues concurrent requests and shows them one at a time', async () => {
    const first = confirm({ title: 'first', message: 'M' });
    const second = confirm({ title: 'second', message: 'M' });
    expect(confirmStore.getSnapshot()?.title).toBe('first');

    confirmStore.resolveActive('confirm');
    await first;
    expect(confirmStore.getSnapshot()?.title).toBe('second');
    confirmStore.resolveActive('cancel');
    await second;
    expect(confirmStore.getSnapshot()).toBeNull();
  });

  it('confirmDelete builds danger copy with the irreversibility warning', () => {
    void confirmDelete({ entity: 'serie', name: '#3' });
    const active = confirmStore.getSnapshot();
    expect(active?.severity).toBe('danger');
    expect(active?.title).toBe('Eliminar serie');
    expect(active?.confirmLabel).toBe('Eliminar');
    expect(active?.message).toContain('no se puede deshacer');
    expect(active?.message).toContain('«#3»');
    confirmStore.resolveActive('cancel');
  });
});
