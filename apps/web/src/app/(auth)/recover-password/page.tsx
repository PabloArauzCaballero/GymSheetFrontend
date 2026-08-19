import type { Metadata } from 'next';
import { AuthFrame } from '@/features/auth/components/auth-frame';
import { RecoverPasswordForm } from '@/features/auth/components/recover-password-form';

export const metadata: Metadata = { title: 'Recuperar contraseña' };

export default function RecoverPasswordPage() {
  return (
    <AuthFrame
      eyebrow="Acceso seguro"
      title="Vuelve a entrar."
      description="Te enviamos un código a tu correo. Con él eliges una contraseña nueva."
    >
      <RecoverPasswordForm />
    </AuthFrame>
  );
}
