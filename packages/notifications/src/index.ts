/**
 * Shared engine behind every message GymSheet shows a user: toasts,
 * confirmations and error copy. Framework-agnostic on purpose — the web app
 * renders it with sonner + Radix, the Expo app with a native toast host +
 * `Modal`, and both share the same rules, copy and telemetry.
 *
 * Apps never import this package inside feature code; they expose it through
 * their own `shared/notifications` barrel, which adds the client's renderer.
 *
 * @example
 * import { NotificationEngine, ToastQueue } from '@gymsheet/notifications';
 *
 * export const toastQueue = new ToastQueue();
 * export const notify = new NotificationEngine(toastQueue, nativePolicy);
 */
export { NotificationEngine, type NotifyInput } from './notify';
export { confirm, confirmDelete, confirmStore, type ActiveConfirmation } from './confirm-store';
export { ToastQueue, type ToastItem, type ToastQueueOptions } from './toast-queue';
export { resolveError } from './messages';
export { Deduplicator } from './dedupe';
export {
  reportError,
  setTelemetrySink,
  type TelemetryEvent,
  type TelemetrySink,
} from './telemetry';
export { defaultPolicy, nativePolicy, type NotificationPolicy } from './policy';
export type {
  ConfirmationRequest,
  ConfirmationResult,
  ConfirmDeleteRequest,
  NotificationAction,
  NotificationDuration,
  NotificationPresentation,
  NotificationRequest,
  NotificationSeverity,
  PromiseMessages,
  ResolvedError,
  ToastAdapter,
} from './types';
