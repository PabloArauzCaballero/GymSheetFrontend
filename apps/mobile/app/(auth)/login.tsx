import { useState } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { loginSchema, type LoginInput } from '@gymsheet/schemas';
import { ApiError } from '@gymsheet/api-client';
import { Link } from 'expo-router';
import { View } from 'react-native';
import { Screen, AppText, Button, Input } from '@/components/ui';
import { useAuthStore } from '@/state/auth-store';
import { spacing, colors } from '@/theme';

export default function LoginScreen() {
  const login = useAuthStore((state) => state.login);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const {
    control,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginInput>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: '', password: '' },
  });

  const onSubmit = handleSubmit(async (values) => {
    setSubmitError(null);
    try {
      await login(values);
    } catch (error) {
      setSubmitError(
        error instanceof ApiError ? error.message : 'No se pudo iniciar sesión. Intenta de nuevo.',
      );
    }
  });

  return (
    <Screen>
      <View style={{ gap: spacing.xs, marginBottom: spacing.lg }}>
        <AppText variant="title">GymSheet</AppText>
        <AppText variant="muted">Inicia sesión para continuar</AppText>
      </View>

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
      <Controller
        control={control}
        name="password"
        render={({ field: { onChange, onBlur, value } }) => (
          <Input
            label="Contraseña"
            secureTextEntry
            value={value}
            onBlur={onBlur}
            onChangeText={onChange}
            error={errors.password?.message}
          />
        )}
      />

      {submitError ? <AppText variant="muted">{submitError}</AppText> : null}

      <Button label="Iniciar sesión" onPress={onSubmit} loading={isSubmitting} />

      <Link href="/(auth)/recover-password" style={{ color: colors.volt, marginTop: spacing.sm }}>
        ¿Olvidaste tu contraseña?
      </Link>
    </Screen>
  );
}
