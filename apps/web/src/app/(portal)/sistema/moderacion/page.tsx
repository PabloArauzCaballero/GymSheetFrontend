import { redirect } from 'next/navigation';

/** The queue moved to `/moderacion`, shared with the REPP team (ADR-0018). */
export default function SistemaModeracionPage() {
  redirect('/moderacion');
}
