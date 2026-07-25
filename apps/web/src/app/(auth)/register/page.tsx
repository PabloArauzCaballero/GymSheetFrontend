import type { Metadata } from 'next';
import { AuthFrame } from '@/features/auth/components/auth-frame';
import { RegisterForm } from '@/features/auth/components/register-form';

export const metadata: Metadata = { title: 'Crear cuenta' };

export default function RegisterPage() {
  return (
    <AuthFrame
      eyebrow="Nuevo atleta"
      title="Construye tu registro."
      description="Crea una cuenta para empezar a documentar cada sesión con datos consistentes."
    >
      <RegisterForm />
    </AuthFrame>
  );
}
