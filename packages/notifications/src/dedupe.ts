import type { NotificationRequest } from './types';

/**
 * Suppresses identical notifications fired within a short window so a burst of
 * the same failure (interceptor + service + component) shows once, not thrice.
 */
export class Deduplicator {
  private readonly seen = new Map<string, number>();

  constructor(private readonly windowMs = 4000) {}

  keyFor(request: Pick<NotificationRequest, 'severity' | 'message' | 'deduplicationKey'>): string {
    return request.deduplicationKey ?? `${request.severity}:${request.message}`;
  }

  /** True when the request should be shown; false when it's a recent duplicate. */
  shouldShow(
    request: Pick<NotificationRequest, 'severity' | 'message' | 'deduplicationKey'>,
  ): boolean {
    const key = this.keyFor(request);
    const now = Date.now();
    const last = this.seen.get(key);
    this.prune(now);
    if (last !== undefined && now - last < this.windowMs) {
      this.seen.set(key, now);
      return false;
    }
    this.seen.set(key, now);
    return true;
  }

  private prune(now: number): void {
    for (const [key, ts] of this.seen) {
      if (now - ts >= this.windowMs) this.seen.delete(key);
    }
  }

  reset(): void {
    this.seen.clear();
  }
}
