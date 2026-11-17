import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { VerificationFlow } from '@/features/verification/components/verification-flow';
import { requireSession } from '@/shared/server/session';
import { staffHomeFor } from '@/shared/server/staff-home';

export const metadata: Metadata = { title: 'Verifica tu perfil' };

/** Member-only: the backend answers 403 to staff, so staff goes to its own home. */
export default async function VerificacionPage() {
  const session = await requireSession();
  if (session.role !== 'CLIENTE') redirect(staffHomeFor(session.role) ?? '/dashboard');
  return <VerificationFlow />;
}
