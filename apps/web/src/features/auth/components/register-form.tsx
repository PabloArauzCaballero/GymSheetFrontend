'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { register } from '@/features/auth/services/auth-client';
import { ApiError } from '@/shared/api/api-error';
import { Button } from '@/shared/components/ui/button';
import { Field } from '@/shared/components/ui/field';
import { Input } from '@/shared/components/ui/input';

const schema = z
  .object({
    nombreCompleto: z.string().trim().min(3, 'Ingresa tu nombre completo.').max(180),
    email: z.string().email('Ingresa un correo válido.').max(180),
    password: z.string().min(8, 'Usa al menos 8 caracteres.').max(128),
    confirmation: z.string(),
  })
  .refine((value) => value.password === value.confirmation, {
    path: ['confirmation'],
    message: 'Las contraseñas no coinciden.',
  });
type FormValues = z.infer<typeof schema>;

export function RegisterForm() {
  const router = useRouter();
  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { nombreCompleto: '', email: '', password: '', confirmation: '' },
  });

  async function submit(values: FormValues) {
    form.clearErrors('root');
    try {
      await register({
        nombreCompleto: values.nombreCompleto,
        email: values.email,
        password: values.password,
      });
      router.replace('/dashboard');
      router.refresh();
    } catch (error: unknown) {
      form.setError('root', {
        message: error instanceof ApiError ? error.message : 'No se pudo crear la cuenta.',
      });
    }
  }

  return (
    <form className="grid gap-5" method="post" onSubmit={form.handleSubmit(submit)}>
      <Field
        error={form.formState.errors.nombreCompleto?.message}
        htmlFor="nombreCompleto"
        label="Nombre completo"
      >
        <Input
          autoComplete="name"
          id="nombreCompleto"
          placeholder="Nombre y apellido"
          {...form.register('nombreCompleto')}
        />
      </Field>
      <Field
        error={form.formState.errors.email?.message}
        htmlFor="email"
        label="Correo electrónico"
      >
        <Input
          autoComplete="email"
          id="email"
          placeholder="tu@correo.com"
          type="email"
          {...form.register('email')}
        />
      </Field>
      <Field error={form.formState.errors.password?.message} htmlFor="password" label="Contraseña">
        <Input
          autoComplete="new-password"
          id="password"
          placeholder="Mínimo 8 caracteres"
          type="password"
          {...form.register('password')}
        />
      </Field>
      <Field
        error={form.formState.errors.confirmation?.message}
        htmlFor="confirmation"
        label="Confirmar contraseña"
      >
        <Input
          autoComplete="new-password"
          id="confirmation"
          placeholder="Repite la contraseña"
          type="password"
          {...form.register('confirmation')}
        />
      </Field>
      {form.formState.errors.root?.message ? (
        <p
          className="rounded-[4px] border border-[#63302c] bg-[#160c0b] p-3 text-sm text-[#ffb4ab]"
          role="alert"
        >
          {form.formState.errors.root.message}
        </p>
      ) : null}
      <Button
        className="mt-2 w-full"
        loading={form.formState.isSubmitting}
        size="lg"
        type="submit"
        variant="primary"
      >
        Crear cuenta
      </Button>
      <p className="text-center text-sm text-[var(--text-muted)]">
        ¿Ya tienes cuenta?{' '}
        <Link
          className="font-semibold text-white underline decoration-[var(--volt)] underline-offset-4"
          href="/login"
        >
          Inicia sesión
        </Link>
      </p>
    </form>
  );
}
