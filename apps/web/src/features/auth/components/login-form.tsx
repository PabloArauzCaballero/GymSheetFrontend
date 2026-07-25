'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { login } from '@/features/auth/services/auth-client';
import { ApiError } from '@/shared/api/api-error';
import { Button } from '@/shared/components/ui/button';
import { Field } from '@/shared/components/ui/field';
import { Input } from '@/shared/components/ui/input';

const schema = z.object({
  email: z.string().email('Ingresa un correo válido.'),
  password: z.string().min(8, 'La contraseña debe tener al menos 8 caracteres.'),
});
type FormValues = z.infer<typeof schema>;

function safeReturnTo(value: string | null) {
  return value?.startsWith('/') && !value.startsWith('//') ? value : '/dashboard';
}

export function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { email: '', password: '' },
  });

  async function submit(values: FormValues) {
    form.clearErrors('root');
    try {
      await login(values);
      router.replace(safeReturnTo(searchParams.get('returnTo')));
      router.refresh();
    } catch (error: unknown) {
      form.setError('root', {
        message: error instanceof ApiError ? error.message : 'No se pudo iniciar sesión.',
      });
    }
  }

  return (
    <form className="grid gap-5" method="post" onSubmit={form.handleSubmit(submit)}>
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
          autoComplete="current-password"
          id="password"
          placeholder="••••••••"
          type="password"
          {...form.register('password')}
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
        Iniciar sesión
      </Button>
      <p className="text-center text-sm text-[var(--text-muted)]">
        ¿Aún no tienes cuenta?{' '}
        <Link
          className="font-semibold text-white underline decoration-[var(--volt)] underline-offset-4"
          href="/register"
        >
          Regístrate
        </Link>
      </p>
    </form>
  );
}
