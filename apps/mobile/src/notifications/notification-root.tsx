import { ConfirmRoot } from './confirm-root';
import { ToastHost } from './toast-host';

/**
 * Mounts both notification surfaces once, at the root of the app. The toast
 * host draws above the navigator; the confirmation dialog is a native modal, so
 * it always sits above the toasts — a critical prompt is never covered.
 */
export function NotificationRoot() {
  return (
    <>
      <ToastHost />
      <ConfirmRoot />
    </>
  );
}
