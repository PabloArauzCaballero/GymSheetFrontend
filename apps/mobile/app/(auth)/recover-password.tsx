import { useState } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { ApiError } from '@gymsheet/api-client';
import { useRouter } from 'expo-router';
import { View } from 'react-native';
import { z } from 'zod';
import { Screen, AppText, Button, Input } from '@/components/ui';
import { Checkbox } from '@/components/checkbox';
import { StepProgress, type FlowStep } from '@/components/step-flow';
import { apiClient } from '@/api/client';
import { notify } from '@/notifications';
import { spacing } from '@/theme';
import { numericInputProps } from '@/components/keyboard';

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
  const [passwordVisible, setPasswordVisible] = useState(false);

  const requestForm = useForm<RequestValues>({
    resolver: zodResolver(requestSchema),
    defaultValues: { email: '' },
  });
  const confirmForm = useForm<ConfirmValues>({
    resolver: zodResolver(confirmSchema),
    defaultValues: { pin: '', password: '' },
  });

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

  return (
    <Screen>
      <AppText variant="title">Recuperar contraseña</AppText>

      {step === 2 ? (
        <>
          <AppText variant="muted">
            Listo. Ya puedes entrar con tu contraseña nueva.
          </AppText>
          <Button
            icon="log-in-outline"
            label="Ir a iniciar sesión"
            onPress={() => router.replace('/(auth)/login')}
          />
        </>
      ) : (
        <>
          <View style={{ height: spacing.xs }} />
          <StepProgress current={step} steps={RESET_STEPS} />

          {step === 0 ? (
            <>
              <AppText variant="muted">
                Te enviamos un código de seis cifras al correo de tu cuenta.
              </AppText>
              <Controller
                control={requestForm.control}
                name="email"
                render={({ field: { onChange, onBlur, value } }) => (
                  <Input
                    autoCapitalize="none"
                    autoComplete="email"
                    error={requestForm.formState.errors.email?.message}
                    keyboardType="email-address"
                    label="Correo electrónico"
                    onBlur={onBlur}
                    onChangeText={onChange}
                    textContentType="emailAddress"
                    value={value}
                  />
                )}
              />
              <Button
                icon="paper-plane-outline"
                label="Enviar código"
                loading={requestForm.formState.isSubmitting}
                onPress={onRequest}
              />
            </>
          ) : (
            <>
              <AppText variant="muted">
                {`Escribe el código que enviamos a ${email} y elige tu contraseña nueva. Caduca en unos minutos.`}
              </AppText>
              <Controller
                control={confirmForm.control}
                name="pin"
                render={({ field: { onChange, onBlur, value } }) => (
                  <Input
                    error={confirmForm.formState.errors.pin?.message}
                    keyboardType="number-pad"
                    label="Código"
                    maxLength={6}
                    onBlur={onBlur}
                    onChangeText={onChange}
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
                  <Input
                    autoComplete="new-password"
                    error={confirmForm.formState.errors.password?.message}
                    label="Contraseña nueva"
                    onBlur={onBlur}
                    onChangeText={onChange}
                    secureTextEntry={!passwordVisible}
                    textContentType="newPassword"
                    value={value}
                  />
                )}
              />
              <Checkbox
                accessibilityHint="Muestra la contraseña en texto legible"
                checked={passwordVisible}
                label="Mostrar contraseña"
                onChange={setPasswordVisible}
              />
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
    </Screen>
  );
}
