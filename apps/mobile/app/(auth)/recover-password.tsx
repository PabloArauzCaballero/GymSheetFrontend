import { useState } from 'react';
import { useForm, useWatch, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { ApiError } from '@gymsheet/api-client';
import { Link, useRouter } from 'expo-router';
import { z } from 'zod';
import { authCopy } from '@gymsheet/domain';
import { authLimits } from '@gymsheet/schemas';
import { Button, Input, textLinkStyle } from '@/components/ui';
import { AuthShell } from '@/components/auth-shell';
import { EmailSuggestion, FieldHint } from '@/features/first-impression/field-hint';
import { emailTypoSuggestion, passwordChecks } from '@/features/first-impression/signup-hints';
import { StepProgress, type FlowStep } from '@/components/step-flow';
import { apiClient } from '@/api/client';
import { notify } from '@/notifications';
import { numericInputProps } from '@/components/keyboard';
import { accountEmailTextProps } from '@/lib/credential-input';

const requestSchema = z.object({
  email: z.string().trim().email('Ingresa un correo válido.'),
});

const confirmSchema = z.object({
  pin: z
    .string()
    .trim()
    .regex(/^[0-9]{6}$/u, 'El código son seis dígitos.'),
  password: z.string().min(8, 'La contraseña debe tener al menos 8 caracteres.').max(128),
});

type RequestValues = z.infer<typeof requestSchema>;
type ConfirmValues = z.infer<typeof confirmSchema>;

/**
 * Dos pasos y no dos pantallas.
 *
 * El código llega al correo mientras esta pantalla sigue abierta, y quien lo
 * recibe vuelve a la app con seis cifras en la cabeza. Mandarle a otra pantalla
 * —o peor, obligarle a abrir un enlace— es donde se pierde la mitad de la
 * gente: el segundo paso tiene que estar donde dejó el primero.
 */
const RESET_STEPS: readonly FlowStep[] = [
  { label: 'Tu correo', icon: 'mail-outline' },
  { label: 'Código', icon: 'keypad-outline' },
];

export default function RecoverPasswordScreen() {
  const router = useRouter();
  /** 0 pedir el código · 1 canjearlo · 2 hecho. */
  const [step, setStep] = useState(0);
  const [email, setEmail] = useState('');

  const requestForm = useForm<RequestValues>({
    resolver: zodResolver(requestSchema),
    defaultValues: { email: '' },
  });
  const confirmForm = useForm<ConfirmValues>({
    resolver: zodResolver(confirmSchema),
    defaultValues: { pin: '', password: '' },
  });
  const watchedEmail = useWatch({ control: requestForm.control, name: 'email' });
  const watchedPassword = useWatch({ control: confirmForm.control, name: 'password' });

  const onRequest = requestForm.handleSubmit(async (values) => {
    try {
      await apiClient.request('/auth/password-reset/request', z.object({}).passthrough(), {
        method: 'POST',
        body: values,
      });
    } catch (error) {
      // Una petición que nunca salió del teléfono no puede afirmar que se envió
      // nada. El resto de errores se traga a propósito: el backend responde
      // igual exista la cuenta o no, y distinguirlo aquí desharía esa garantía.
      if (error instanceof ApiError && error.kind === 'network') {
        notify.error(error);
        return;
      }
    }
    setEmail(values.email);
    setStep(1);
  });

  const onConfirm = confirmForm.handleSubmit(async (values) => {
    try {
      await apiClient.request('/auth/password-reset/confirm', z.object({}).passthrough(), {
        method: 'POST',
        body: { email, pin: values.pin, password: values.password },
      });
    } catch (error) {
      if (error instanceof ApiError) {
        // Aquí sí se dice qué pasó: el código es de quien lo pidió, y no saber
        // si falló por caducado o por mal escrito convierte el paso en una
        // adivinanza.
        confirmForm.setError('pin', {
          message:
            error.kind === 'network'
              ? 'Sin conexión. Inténtalo de nuevo.'
              : 'El código no es válido o ha caducado.',
        });
        return;
      }
      throw error;
    }
    setStep(2);
  });

  const typo = emailTypoSuggestion(watchedEmail ?? '');
  const longEnough = passwordChecks(watchedPassword ?? '', '').longEnough;
  const title = step === 2 ? 'Contraseña cambiada' : step === 1 ? 'Escribe el código' : 'Recupera tu acceso';
  const description =
    step === 2
      ? 'Ya puedes entrar con tu contraseña nueva.'
      : step === 1
        ? `Lo enviamos a ${email}. Caduca en unos minutos.`
        : 'Te enviamos un código de seis cifras al correo de tu cuenta.';

  return (
    // El mismo marco que el acceso y el alta (antes era una pantalla suelta, sin
    // marca ni salida). Sin titular comercial: quien llega aquí ya sabe qué es
    // la app y solo quiere volver a entrar.
    <AuthShell
      description={description}
      footer={
        step === 2 ? null : (
          <Link href="/(auth)/login" style={textLinkStyle()}>
            Volver a iniciar sesión
          </Link>
        )
      }
      pitch={false}
      title={title}
    >
      {step === 2 ? (
        <Button
          icon="log-in-outline"
          label="Ir a iniciar sesión"
          onPress={() => router.replace('/(auth)/login')}
        />
      ) : (
        <>
          <StepProgress current={step} steps={RESET_STEPS} />

          {step === 0 ? (
            <>
              <Controller
                control={requestForm.control}
                name="email"
                render={({ field: { onChange, onBlur, value } }) => (
                  <Input
                    {...accountEmailTextProps}
                    error={requestForm.formState.errors.email?.message}
                    icon="mail-outline"
                    label="Correo electrónico"
                    onBlur={onBlur}
                    onChangeText={onChange}
                    // La tecla de retorno envía el formulario. Es el único
                    // campo de la pantalla, así que pedir que se cierre el
                    // teclado para alcanzar el botón --que en un teléfono
                    // pequeño queda debajo-- es un paso que no tiene por qué
                    // existir.
                    onSubmitEditing={() => void onRequest()}
                    placeholder="tu@correo.com"
                    returnKeyType="send"
                    value={value}
                  />
                )}
              />
              {typo && !requestForm.formState.errors.email ? (
                <EmailSuggestion
                  onAccept={() => requestForm.setValue('email', typo, { shouldValidate: true })}
                  suggestion={typo}
                />
              ) : null}
              <Button
                icon="paper-plane-outline"
                label="Enviar código"
                loading={requestForm.formState.isSubmitting}
                onPress={onRequest}
              />
            </>
          ) : (
            <>
              <Controller
                control={confirmForm.control}
                name="pin"
                render={({ field: { onChange, onBlur, value } }) => (
                  <Input
                    error={confirmForm.formState.errors.pin?.message}
                    icon="keypad-outline"
                    keyboardType="number-pad"
                    label="Código"
                    maxLength={6}
                    onBlur={onBlur}
                    onChangeText={onChange}
                    placeholder="6 cifras"
                    // Autorrelleno del código que iOS ofrece sobre el teclado
                    // en cuanto llega: teclear seis cifras a mano es el paso
                    // donde la gente se equivoca.
                    textContentType="oneTimeCode"
                    value={value}
                    {...numericInputProps}
                  />
                )}
              />
              <Controller
                control={confirmForm.control}
                name="password"
                render={({ field: { onChange, onBlur, value } }) => (
                  // El ojo del propio campo, como en el acceso y el alta (antes,
                  // una casilla «Mostrar contraseña» aparte).
                  <Input
                    autoComplete="new-password"
                    error={confirmForm.formState.errors.password?.message}
                    hideLabel={authCopy.hidePassword}
                    icon="lock-closed-outline"
                    label="Contraseña nueva"
                    onBlur={onBlur}
                    onChangeText={onChange}
                    placeholder="Tu contraseña nueva"
                    revealable
                    revealLabel={authCopy.showPassword}
                    textContentType="newPassword"
                    value={value}
                  />
                )}
              />
              {confirmForm.formState.errors.password ? null : (
                <FieldHint label={`${authLimits.passwordMin} caracteres o más`} state={longEnough ? 'ok' : 'pending'} />
              )}
              <Button
                icon="checkmark-circle-outline"
                label="Cambiar contraseña"
                loading={confirmForm.formState.isSubmitting}
                onPress={onConfirm}
              />
              <Button
                icon="refresh-outline"
                label="Pedir otro código"
                onPress={() => setStep(0)}
                variant="ghost"
              />
            </>
          )}
        </>
      )}
    </AuthShell>
  );
}
