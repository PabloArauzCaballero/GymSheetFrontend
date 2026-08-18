import { useState } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { recoverPasswordSchema, type RecoverPasswordInput } from '@gymsheet/schemas';
import { ApiError } from '@gymsheet/api-client';
import { useRouter } from 'expo-router';
import { View } from 'react-native';
import { Screen, AppText, Button, Input } from '@/components/ui';
import { apiClient } from '@/api/client';
import { notify } from '@/notifications';
import { z } from 'zod';
import { spacing } from '@/theme';

export default function RecoverPasswordScreen() {
  const router = useRouter();
  const [sent, setSent] = useState(false);
  const {
    control,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<RecoverPasswordInput>({
    resolver: zodResolver(recoverPasswordSchema),
    defaultValues: { email: '' },
  });

  const onSubmit = handleSubmit(async (values) => {
    try {
      await apiClient.request('/auth/recover-password', z.object({}).passthrough(), {
        method: 'POST',
        body: values,
      });
    } catch (error) {
      // A request that never left the device must not claim success. Transport
      // failures say so; anything else stays neutral to avoid account enumeration.
      if (error instanceof ApiError && error.kind === 'network') {
        notify.error(error);
        return;
      }
    }
    setSent(true);
  });

  return (
    <Screen>
      <AppText variant="title">Recuperar contraseña</AppText>
      {sent ? (
        <>
          <AppText variant="muted">
            Si el correo existe, enviamos instrucciones para restablecer la contraseña.
          </AppText>
          <Button label="Volver al inicio de sesión" onPress={() => router.replace('/(auth)/login')} />
        </>
      ) : (
        <>
          <View style={{ height: spacing.md }} />
          <Controller
            control={control}
            name="email"
            render={({ field: { onChange, onBlur, value } }) => (
              <Input
                label="Correo electrónico"
                autoCapitalize="none"
                keyboardType="email-address"
                value={value}
                onBlur={onBlur}
                onChangeText={onChange}
                error={errors.email?.message}
              />
            )}
          />
          <Button label="Enviar instrucciones" onPress={onSubmit} loading={isSubmitting} />
        </>
      )}
    </Screen>
  );
}
