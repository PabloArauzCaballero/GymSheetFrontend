import type { Metadata } from 'next';
import Link from 'next/link';
import { Suspense } from 'react';
import { authCopy } from '@gymsheet/domain';
import { AuthFrame } from '@/features/auth/components/auth-frame';
import { LoginForm } from '@/features/auth/components/login-form';

export const metadata: Metadata = { title: 'Iniciar sesión' };

export default function LoginPage() {
  return (
    <AuthFrame
      description={authCopy.login.description}
      eyebrow={authCopy.login.eyebrow}
      footer={
        <p className="text-[var(--text-muted)]">
          {authCopy.login.switchPrompt}{' '}
          <Link
            className="font-semibold text-[var(--text)] underline decoration-[var(--volt)] underline-offset-4"
            href="/register"
          >
            {authCopy.login.switchAction}
          </Link>
        </p>
      }
      title={authCopy.login.title}
    >
      <Suspense
        fallback={
          <div className="h-72 animate-pulse rounded-[var(--radius-lg)] bg-[var(--surface-low)]" />
        }
      >
        <LoginForm />
      </Suspense>
    </AuthFrame>
  );
}
