/**
 * Centralized user-communication engine for the web app.
 *
 * Feature code imports ONLY from here — never from `sonner` or a Radix dialog
 * directly. That keeps the visual provider swappable behind a single boundary.
 *
 * @example
 * import { notify, confirmDelete } from '@/shared/notifications';
 *
 * const result = await confirmDelete({ entity: 'serie' });
 * if (!result.confirmed) return;
 * await notify.promise(workoutService.removeSet(id), {
 *   loading: 'Eliminando serie…',
 *   success: 'Serie eliminada.',
 * });
 */
export { notify, NotificationEngine } from './notify';
export { confirm, confirmDelete } from './confirm/confirm-store';
export { ConfirmRoot } from './confirm/confirm-root';
export { resolveError } from './core/messages';
export { setTelemetrySink } from './core/telemetry';
export { defaultPolicy, type NotificationPolicy } from './core/policy';
export type {
  ConfirmationRequest,
  ConfirmationResult,
  ConfirmDeleteRequest,
  NotificationRequest,
  NotificationSeverity,
  PromiseMessages,
  ResolvedError,
} from './core/types';
