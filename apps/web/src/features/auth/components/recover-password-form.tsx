'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import Link from 'next/link';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { ApiError } from '@/shared/api/api-error';
import { Button } from '@/shared/components/ui/button';
import { Checkbox } from '@/shared/components/ui/checkbox';
import { Field } from '@/shared/components/ui/field';
import { Input } from '@/shared/components/ui/input';
import { confirmPasswordReset, requestPasswordReset } from '@/features/auth/services/auth-client';

const requestSchema = z.object({
  email: z.string().email('Ingresa un correo válido.'),
});
const confirmSchema = z.object({
  pin: z.string().regex(/^[0-9]{6}$/u, 'El código son seis dígitos.'),
  password: z.string().min(8, 'La contraseña debe tener al menos 8 caracteres.'),
});

type RequestValues = z.infer<typeof requestSchema>;
type ConfirmValues = z.infer<typeof confirmSchema>;

/**
 * Recuperación en dos pasos, en la misma página.
 *
 * El código llega al correo mientras esta pantalla sigue abierta. Quien lo
 * recibe vuelve a la pestaña con seis cifras en la cabeza, así que el segundo
 * paso tiene que estar donde dejó el primero: mandarlo a otra URL —o hacerle
 * depender de pinchar un enlace del correo, que es donde los clientes de correo
 * reescriben direcciones y rompen sesiones— es donde se pierde a la gente.
 */
export function RecoverPasswordForm() {
  const [step, setStep] = useState<0 | 1 | 2>(0);
  const [email, setEmail] = useState('');
  const [passwordVisible, setPasswordVisible] = useState(false);

  const requestForm = useForm<RequestValues>({
    resolver: zodResolver(requestSchema),
    defaultValues: { email: '' },
  });
  const confirmForm = useForm<ConfirmValues>({
    resolver: zodResolver(confirmSchema),
    defaultValues: { pin: '', password: '' },
  });

  async function submitRequest(values: RequestValues) {
    requestForm.clearErrors('root');
    try {
      await requestPasswordReset(values);
    } catch (error) {
      // Sólo un fallo de red merece detener el avance: cualquier otra respuesta
      // es la misma exista la cuenta o no, y tratarla distinto revelaría cuál
      // de las dos ocurrió.
      if (error instanceof ApiError && error.status === 0) {
        requestForm.setError('root', { message: 'Sin conexión. Inténtalo de nuevo.' });
        return;
      }
    }
    setEmail(values.email);
    setStep(1);
  }

  async function submitConfirm(values: ConfirmValues) {
    confirmForm.clearErrors('root');
    try {
      await confirmPasswordReset({ email, ...values });
    } catch (error) {
      confirmForm.setError('root', {
        message:
          error instanceof ApiError
            ? 'El código no es válido o ha caducado.'
            : 'No se pudo cambiar la contraseña.',
      });
      return;
    }
    setStep(2);
  }

  if (step === 2) {
    return (
      <div className="flex flex-col gap-4">
        <p className="text-sm text-[var(--text-muted)]">
          Listo. Ya puedes entrar con tu contraseña nueva.
        </p>
        <Link
          className="inline-flex h-11 w-full items-center justify-center rounded-[6px] border border-[var(--volt)] bg-[var(--volt)] text-sm font-semibold text-[var(--accent-contrast)]"
          href="/login"
        >
          Ir a iniciar sesión
        </Link>
      </div>
    );
  }

  return step === 0 ? (
    <form className="flex flex-col gap-4" onSubmit={requestForm.handleSubmit(submitRequest)}>
      <p className="text-sm text-[var(--text-muted)]">
        Te enviamos un código de seis cifras al correo de tu cuenta.
      </p>
      <Field
        error={requestForm.formState.errors.email?.message}
        htmlFor="reset-email"
        label="Correo electrónico"
      >
        <Input
          autoComplete="email"
          id="reset-email"
          placeholder="tu@correo.com"
          type="email"
          {...requestForm.register('email')}
        />
      </Field>
      {requestForm.formState.errors.root?.message ? (
        <p
          className="rounded-[4px] border border-[var(--danger-border)] bg-[var(--danger-surface)] p-3 text-sm text-[var(--danger-text)]"
          role="alert"
        >
          {requestForm.formState.errors.root.message}
        </p>
      ) : null}
      <Button className="w-full" disabled={requestForm.formState.isSubmitting} type="submit">
        {requestForm.formState.isSubmitting ? 'Enviando…' : 'Enviar código'}
      </Button>
    </form>
  ) : (
    <form className="flex flex-col gap-4" onSubmit={confirmForm.handleSubmit(submitConfirm)}>
      <p className="text-sm text-[var(--text-muted)]">
        {`Escribe el código que enviamos a ${email} y elige tu contraseña nueva. Caduca en unos minutos.`}
      </p>
      <Field error={confirmForm.formState.errors.pin?.message} htmlFor="reset-pin" label="Código">
        <Input
          // `one-time-code` es lo que hace que el gestor de contraseñas y el
          // teléfono ofrezcan el código en cuanto llega, en vez de obligar a
          // copiarlo a mano entre dos ventanas.
          autoComplete="one-time-code"
          id="reset-pin"
          inputMode="numeric"
          maxLength={6}
          placeholder="000000"
          {...confirmForm.register('pin')}
        />
      </Field>
      <Field
        error={confirmForm.formState.errors.password?.message}
        htmlFor="reset-password"
        label="Contraseña nueva"
      >
        <Input
          autoComplete="new-password"
          id="reset-password"
          placeholder="••••••••"
          type={passwordVisible ? 'text' : 'password'}
          {...confirmForm.register('password')}
        />
        <Checkbox
          checked={passwordVisible}
          className="mt-2"
          label="Mostrar contraseña"
          onChange={(event) => setPasswordVisible(event.target.checked)}
        />
      </Field>
      {confirmForm.formState.errors.root?.message ? (
        <p
          className="rounded-[4px] border border-[var(--danger-border)] bg-[var(--danger-surface)] p-3 text-sm text-[var(--danger-text)]"
          role="alert"
        >
          {confirmForm.formState.errors.root.message}
        </p>
      ) : null}
      <Button className="w-full" disabled={confirmForm.formState.isSubmitting} type="submit">
        {confirmForm.formState.isSubmitting ? 'Cambiando…' : 'Cambiar contraseña'}
      </Button>
      <button
        className="text-sm text-[var(--text-muted)] underline-offset-4 hover:underline"
        onClick={() => setStep(0)}
        type="button"
      >
        Pedir otro código
      </button>
    </form>
  );
}
