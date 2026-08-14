import type { NotificationSeverity, ResolvedError } from './types';

export interface TelemetryEvent {
  severity: NotificationSeverity;
  code?: string;
  requestId?: string;
  correlationId?: string;
  retryable?: boolean;
}

type TelemetrySink = (event: TelemetryEvent) => void;

/**
 * Records only meaningful failures — never every toast, never message bodies
 * (which could carry user data). Defaults to a dev-only console sink; the host
 * can replace it with @gymsheet/observability wiring.
 */
let sink: TelemetrySink = (event) => {
  if (process.env.NODE_ENV !== 'production') {
    console.error('[notifications]', event);
  }
};

export function setTelemetrySink(next: TelemetrySink): void {
  sink = next;
}

export function reportError(resolved: ResolvedError, correlationId?: string): void {
  sink({
    severity: 'error',
    code: resolved.code,
    requestId: resolved.requestId,
    correlationId,
    retryable: resolved.retryable,
  });
}
