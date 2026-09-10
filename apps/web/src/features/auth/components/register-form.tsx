'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { register } from '@/features/auth/services/auth-client';
import { ApiError } from '@/shared/api/api-error';
import { Button } from '@/shared/components/ui/button';
import { Checkbox } from '@/shared/components/ui/checkbox';
import { Field } from '@/shared/components/ui/field';
import { Input } from '@/shared/components/ui/input';
import { Select } from '@/shared/components/ui/select';

const schema = z
  .object({
    nombreCompleto: z.string().trim().min(3, 'Ingresa tu nombre completo.').max(180),
    email: z.string().email('Ingresa un correo válido.').max(180),
    password: z.string().min(8, 'Usa al menos 8 caracteres.').max(128),
    confirmation: z.string(),
    /**
     * Solo sirve para elegir con qué arquetipos te habla la senda. Cadena vacía
     * = prefiero no decirlo, y se envía como `UNSPECIFIED` en vez de omitirse:
     * omitirlo dejaría la cuenta como «aún no preguntado» y la aplicación
     * volvería a preguntar. Se puede cambiar después desde el perfil.
     */
    genero: z.enum(['', 'MALE', 'FEMALE', 'UNSPECIFIED']),
    acceptedTerms: z.boolean(),
  })
  .refine((value) => value.password === value.confirmation, {
    path: ['confirmation'],
    message: 'Las contraseñas no coinciden.',
  })
  .refine((value) => value.acceptedTerms, {
    path: ['acceptedTerms'],
    message: 'Debes aceptar los términos y la política de privacidad.',
  });
type FormValues = z.infer<typeof schema>;

export function RegisterForm() {
  const router = useRouter();
  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      nombreCompleto: '',
      email: '',
      password: '',
      confirmation: '',
      genero: '',
      acceptedTerms: false,
    },
  });

  async function submit(values: FormValues) {
    form.clearErrors('root');
    try {
      await register({
        nombreCompleto: values.nombreCompleto,
        email: values.email,
        password: values.password,
        acceptedTerms: values.acceptedTerms,
        ...(values.genero === '' ? {} : { genero: values.genero }),
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
      <Field
        error={form.formState.errors.genero?.message}
        hint="Solo se usa para elegir los rangos e insignias con los que te habla la app. Puedes cambiarlo o dejarlo en blanco."
        htmlFor="genero"
        label="Género (opcional)"
      >
        <Select id="genero" {...form.register('genero')}>
          <option value="">Prefiero no decirlo</option>
          <option value="MALE">Hombre</option>
          <option value="FEMALE">Mujer</option>
        </Select>
      </Field>
      <div>
        <Checkbox
          label={
            <span>
              Acepto los{' '}
              <Link
                className="font-semibold text-[var(--text)] underline decoration-[var(--volt)] underline-offset-4"
                href="/terminos"
                target="_blank"
              >
                términos y condiciones
              </Link>{' '}
              y la{' '}
              <Link
                className="font-semibold text-[var(--text)] underline decoration-[var(--volt)] underline-offset-4"
                href="/privacidad"
                target="_blank"
              >
                política de privacidad
              </Link>
              .
            </span>
          }
          {...form.register('acceptedTerms')}
        />
        {form.formState.errors.acceptedTerms?.message ? (
          <p className="mt-1 text-xs text-[var(--danger-text)]">
            {form.formState.errors.acceptedTerms.message}
          </p>
        ) : null}
      </div>
      {form.formState.errors.root?.message ? (
        <p
          className="rounded-[4px] border border-[var(--danger-border)] bg-[var(--danger-surface)] p-3 text-sm text-[var(--danger-text)]"
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
          className="font-semibold text-[var(--text)] underline decoration-[var(--volt)] underline-offset-4"
          href="/login"
        >
          Inicia sesión
        </Link>
      </p>
    </form>
  );
}
