import type { NotificationSeverity, ResolvedError } from './types';

export interface TelemetryEvent {
  severity: NotificationSeverity;
  code?: string;
  requestId?: string;
  correlationId?: string;
  retryable?: boolean;
  /**
   * The value that was actually thrown, for **development diagnosis only**.
   *
   * A `ReferenceError` or `TypeError` is a programming bug, not a backend
   * failure: reducing it to `code: 'ReferenceError'` hides the one thing that
   * would fix it. A remote sink must not forward this — it can carry user data.
   */
  cause?: unknown;
}

export type TelemetrySink = (event: TelemetryEvent) => void;

/**
 * Records only meaningful failures — never every toast, never message bodies
 * (which could carry user data).
 *
 * The default is a no-op: the package cannot tell whether it runs in a browser,
 * a Node render or a Hermes VM, so each host installs its own sink at startup
 * (dev console on both clients, @gymsheet/observability / Sentry in production).
 */
let sink: TelemetrySink = () => {};

export function setTelemetrySink(next: TelemetrySink): void {
  sink = next;
}

export function reportError(
  resolved: ResolvedError,
  correlationId?: string,
  cause?: unknown,
): void {
  sink({
    severity: 'error',
    code: resolved.code,
    requestId: resolved.requestId,
    correlationId,
    retryable: resolved.retryable,
    cause,
  });
}
