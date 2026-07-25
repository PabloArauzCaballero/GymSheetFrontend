import type { Metadata } from 'next';
import { Suspense } from 'react';
import { AuthFrame } from '@/features/auth/components/auth-frame';
import { LoginForm } from '@/features/auth/components/login-form';

export const metadata: Metadata = { title: 'Iniciar sesión' };

export default function LoginPage() {
  return (
    <AuthFrame
      eyebrow="Acceso seguro"
      title="Vuelve al trabajo."
      description="Accede a tu entrenamiento, historial y operaciones según tu rol."
    >
      <Suspense
        fallback={<div className="h-80 animate-pulse rounded-[8px] bg-[var(--surface-low)]" />}
      >
        <LoginForm />
      </Suspense>
    </AuthFrame>
  );
}
