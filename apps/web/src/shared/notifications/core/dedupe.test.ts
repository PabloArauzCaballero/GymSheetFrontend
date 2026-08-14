import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { Deduplicator } from './dedupe';

describe('Deduplicator', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  const err = { severity: 'error' as const, message: 'Falló la operación.' };

  it('shows the first occurrence and suppresses a rapid repeat', () => {
    const dedupe = new Deduplicator(4000);
    expect(dedupe.shouldShow(err)).toBe(true);
    expect(dedupe.shouldShow(err)).toBe(false);
  });

  it('shows again once the window has elapsed', () => {
    const dedupe = new Deduplicator(4000);
    expect(dedupe.shouldShow(err)).toBe(true);
    vi.advanceTimersByTime(4001);
    expect(dedupe.shouldShow(err)).toBe(true);
  });

  it('does not collapse different messages', () => {
    const dedupe = new Deduplicator(4000);
    expect(dedupe.shouldShow(err)).toBe(true);
    expect(dedupe.shouldShow({ severity: 'error', message: 'Otro error.' })).toBe(true);
  });

  it('honours an explicit deduplication key', () => {
    const dedupe = new Deduplicator(4000);
    expect(dedupe.shouldShow({ ...err, deduplicationKey: 'k' })).toBe(true);
    expect(
      dedupe.shouldShow({ severity: 'error', message: 'distinta copia', deduplicationKey: 'k' }),
    ).toBe(false);
  });
});
