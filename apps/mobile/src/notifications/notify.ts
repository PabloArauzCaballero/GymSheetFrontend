import {
  NotificationEngine,
  ToastQueue,
  nativePolicy,
  setTelemetrySink,
} from '@gymsheet/notifications';
import * as Haptics from 'expo-haptics';
import { ApiError } from '@gymsheet/api-client';
import { consoleLogger } from '@gymsheet/observability';

/**
 * The visible toast stack. Two at a time: a phone screen has no room for the
 * three the web allows, and the top inset is shared with the status bar.
 */
export const toastQueue = new ToastQueue({ maxVisible: 2 });

// Failures reach the console in development only. Message bodies are never
// logged (they may carry user data) — the engine only emits kind/requestId.
// Production builds should install a Sentry sink here instead.
setTelemetrySink((event) => {
  if (!__DEV__) return;
  consoleLogger.error('[notifications]', {
    severity: event.severity,
    code: event.code,
    requestId: event.requestId,
    correlationId: event.correlationId,
    retryable: event.retryable,
  });
  // In development the thrown value goes to the console verbatim: a
  // ReferenceError/TypeError is a bug in our code, and its message and stack are
  // the only useful part. A production sink must keep sending the fields above
  // and never this — it can carry user data.
  if (event.cause instanceof Error && !(event.cause instanceof ApiError)) {
    console.error(event.cause);
  }
});

/** Canonical singleton used across the mobile app. */
export const notify = new NotificationEngine(toastQueue, nativePolicy);
