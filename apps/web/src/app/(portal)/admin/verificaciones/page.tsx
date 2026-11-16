import { redirect } from 'next/navigation';

/**
 * Old address of the selfie review, from when the gym reviewed them. It now
 * lives in the REPP console; gym staff that follows an old link is turned away
 * there by the role guard.
 */
export default function AdminVerificacionesPage(): never {
  redirect('/moderacion/verificaciones');
}
