import {
  NotificationEngine,
  ToastQueue,
  nativePolicy,
  setTelemetrySink,
} from '@gymsheet/notifications';
import { ApiError } from '@gymsheet/api-client';
import { consoleLogger } from '@gymsheet/observability';
import { isEmailVerificationRequired } from '@/features/email-verification/email-verification-logic';

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

/**
 * Like the shared engine, plus one rule: a 403 EMAIL_VERIFICATION_REQUIRED is
 * never toasted. The banner and the inline state already say what to do, the
 * same way the shared engine stays quiet on the legal block (428). Only thrown
 * errors carry the code; `notify.error(error.message)` call sites cannot be told
 * apart, which is why the rule belongs in `@gymsheet/notifications` eventually.
 */
class MobileNotificationEngine extends NotificationEngine {
  override error(...args: Parameters<NotificationEngine['error']>) {
    if (isEmailVerificationRequired(args[0])) return undefined;
    return super.error(...args);
  }
}

/** Canonical singleton used across the mobile app. */
export const notify = new MobileNotificationEngine(toastQueue, nativePolicy);
