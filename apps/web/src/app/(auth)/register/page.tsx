import type { Metadata } from 'next';
import Link from 'next/link';
import { authCopy } from '@gymsheet/domain';
import { AuthFrame } from '@/features/auth/components/auth-frame';
import { BusinessEntryLink } from '@/features/business/components/business-entry-link';
import { GoogleSignIn } from '@/features/auth/components/google-sign-in';
import { RegisterForm } from '@/features/auth/components/register-form';

export const metadata: Metadata = { title: 'Crear cuenta' };

export default function RegisterPage() {
  return (
    <AuthFrame
      wide
      description={authCopy.register.description}
      eyebrow={authCopy.register.eyebrow}
      footer={
        <>
        <p className="text-[var(--text-muted)]">
          {authCopy.register.switchPrompt}{' '}
          <Link
            className="font-semibold text-[var(--text)] underline decoration-[var(--volt)] underline-offset-4"
            href="/login"
          >
            {authCopy.register.switchAction}
          </Link>
        </p>
        <BusinessEntryLink />
        </>
      }
      title={authCopy.register.title}
    >
      <div className="grid gap-6">
        <RegisterForm />
        <GoogleSignIn />
      </div>
    </AuthFrame>
  );
}
