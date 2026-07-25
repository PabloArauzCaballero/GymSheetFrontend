/**
 * Platform-agnostic observability contracts. Web wires these to its logging
 * pipeline; mobile wires them to Sentry + a console fallback. Neither platform
 * is allowed to log the redacted keys below.
 */
export type AnalyticsEvent =
  | 'login_success'
  | 'login_failed'
  | 'screen_view'
  | 'primary_action_completed'
  | 'validation_error'
  | 'network_error'
  | 'flow_abandoned'
  | 'update_required';

export interface Analytics {
  track(event: AnalyticsEvent, properties?: Record<string, unknown>): void;
  identify(userId: string | null): void;
}

export interface Logger {
  debug(message: string, context?: Record<string, unknown>): void;
  info(message: string, context?: Record<string, unknown>): void;
  warn(message: string, context?: Record<string, unknown>): void;
  error(error: unknown, context?: Record<string, unknown>): void;
}

/** Keys whose values must never reach logs or analytics. */
export const REDACTED_KEYS = [
  'password',
  'token',
  'accessToken',
  'refreshToken',
  'authorization',
  'cookie',
  'pin',
  'secret',
] as const;

const REDACTED = '[REDACTED]';

export function redact<T>(value: T): T {
  if (Array.isArray(value)) return value.map((item) => redact(item)) as unknown as T;
  if (value && typeof value === 'object') {
    const output: Record<string, unknown> = {};
    for (const [key, item] of Object.entries(value)) {
      output[key] = (REDACTED_KEYS as readonly string[]).includes(key.toLowerCase())
        ? REDACTED
        : redact(item);
    }
    return output as T;
  }
  return value;
}

export const consoleLogger: Logger = {
  debug: (message, context) => console.debug(message, context ? redact(context) : ''),
  info: (message, context) => console.info(message, context ? redact(context) : ''),
  warn: (message, context) => console.warn(message, context ? redact(context) : ''),
  error: (error, context) => console.error(error, context ? redact(context) : ''),
};

export const noopAnalytics: Analytics = {
  track: () => {},
  identify: () => {},
};
