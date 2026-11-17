import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook } from '@testing-library/react';
import type { ReactNode } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useHandleAvailability } from './use-handle-availability';

const availability = vi.hoisted(() => vi.fn());
vi.mock('../services/business-client', () => ({
  businessService: { handleAvailability: availability },
}));

function renderCheck(initial: string) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  );
  return renderHook(({ value }) => useHandleAvailability(value), { wrapper, initialProps: { value: initial } });
}

/** Lets the debounce elapse and the query settle. */
async function settle() {
  // Two rounds: the debounce fires, then the query it enabled resolves and notifies.
  for (const ms of [450, 50]) {
    await act(async () => {
      await vi.advanceTimersByTimeAsync(ms);
    });
  }
}

beforeEach(() => vi.useFakeTimers());
afterEach(() => {
  vi.useRealTimers();
  vi.clearAllMocks();
});

describe('useHandleAvailability', () => {
  it('asks the server once, after the person stops typing', async () => {
    availability.mockResolvedValue({ handle: 'topfit', available: true, reason: null });
    const { result, rerender } = renderCheck('');
    rerender({ value: 'top' });
    rerender({ value: 'topf' });
    rerender({ value: 'topfit' });
    expect(result.current).toEqual({ state: 'checking' });
    await settle();
    expect(availability).toHaveBeenCalledTimes(1);
    expect(availability.mock.calls[0]?.[0]).toBe('topfit');
    expect(result.current).toEqual({ state: 'available', handle: 'topfit' });
  });

  it('answers format problems locally, without a request', async () => {
    const { result } = renderCheck('ab');
    await settle();
    expect(result.current).toMatchObject({ state: 'invalid', message: 'Usa al menos 3 caracteres.' });
    expect(availability).not.toHaveBeenCalled();
  });

  it('normalizes before asking (@ and capitals)', async () => {
    availability.mockResolvedValue({ handle: 'topfit', available: false, reason: 'TAKEN' });
    const { result } = renderCheck('@TopFit');
    await settle();
    expect(availability.mock.calls[0]?.[0]).toBe('topfit');
    expect(result.current).toMatchObject({ state: 'unavailable', reason: 'TAKEN', message: 'Ese nombre ya está en uso.' });
  });

  it('does not block when the check fails', async () => {
    availability.mockRejectedValue(new Error('429'));
    const { result } = renderCheck('topfit');
    await settle();
    expect(result.current).toMatchObject({ state: 'error' });
  });

  it('stays idle while empty', async () => {
    const { result } = renderCheck('   ');
    await settle();
    expect(result.current).toEqual({ state: 'idle' });
  });
});
