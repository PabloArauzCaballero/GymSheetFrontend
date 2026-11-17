import { redirect } from 'next/navigation';

/**
 * The deck lives inside Comunidad (as in the mobile app); this route only keeps
 * old links and bookmarks working. Comunidad keeps its filters in local state
 * and reads no query params, so none are carried over.
 */
export default function DescubrirPage() {
  redirect('/comunidad');
}
