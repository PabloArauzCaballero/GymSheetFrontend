import { NotificationEngine, setTelemetrySink } from '@gymsheet/notifications';
import { sonnerAdapter } from './adapters/toast-adapter';

// Errors reach the console in development only; message bodies never do (they
// may carry user data). Replace with @gymsheet/observability wiring in prod.
setTelemetrySink((event) => {
  if (process.env.NODE_ENV !== 'production') {
    console.error('[notifications]', event);
  }
});

/** Canonical singleton used across the web app. */
export const notify = new NotificationEngine(sonnerAdapter);
