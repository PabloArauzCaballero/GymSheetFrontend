/**
 * Centralized user-communication surface for the mobile app.
 *
 * Screens import ONLY from here — never `Alert` from React Native, never
 * `@gymsheet/notifications` directly. The shared engine (copy, policy, dedupe,
 * confirmation queue) lives in the package; this barrel adds the native renderer.
 *
 * @example
 * import { notify, confirmDelete } from '@/notifications';
 *
 * const result = await confirmDelete({ entity: 'serie' });
 * if (!result.confirmed) return;
 * await notify.promise(workoutService.removeSet(id), {
 *   loading: 'Eliminando serie…',
 *   success: 'Serie eliminada.',
 * });
 */
export { notify, toastQueue } from './notify';
export { NotificationRoot } from './notification-root';
export { ToastHost } from './toast-host';
export { ConfirmRoot } from './confirm-root';
export {
  NotificationEngine,
  confirm,
  confirmDelete,
  resolveError,
  setTelemetrySink,
  nativePolicy,
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
  ToastItem,
} from '@gymsheet/notifications';
