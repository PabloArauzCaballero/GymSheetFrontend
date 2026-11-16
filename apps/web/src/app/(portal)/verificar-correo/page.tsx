import type { Metadata } from 'next';
import { EmailVerificationForm } from '@/features/account-security/components/email-verification-form';
import { requireSession } from '@/shared/server/session';

export const metadata: Metadata = { title: 'Verifica tu correo' };

export default async function VerifyEmailRoute() {
  const session = await requireSession();
  return (
    <div className="mx-auto grid w-full max-w-[480px] gap-6">
      <EmailVerificationForm email={session.email} verified={session.emailVerified === true} />
    </div>
  );
}
