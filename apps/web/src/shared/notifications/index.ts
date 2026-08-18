/**
 * Centralized user-communication surface for the web app.
 *
 * Feature code imports ONLY from here — never from `sonner`, a Radix dialog or
 * `@gymsheet/notifications` directly. The shared engine (copy, policy, dedupe,
 * confirmation queue) lives in the package; this barrel adds the web renderer.
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
export { notify } from './notify';
export { ConfirmRoot } from './confirm/confirm-root';
export {
  NotificationEngine,
  confirm,
  confirmDelete,
  resolveError,
  setTelemetrySink,
  defaultPolicy,
  type NotificationPolicy,
} from '@gymsheet/notifications';
export type {
  ConfirmationRequest,
  ConfirmationResult,
  ConfirmDeleteRequest,
  NotificationRequest,
  NotificationSeverity,
  PromiseMessages,
  ResolvedError,
} from '@gymsheet/notifications';
