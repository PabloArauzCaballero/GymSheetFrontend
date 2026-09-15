import { useState } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { loginDefaults, loginSchema, type LoginInput } from '@gymsheet/schemas';
import { authCopy, authErrorMessage } from '@gymsheet/domain';
import { ApiError } from '@gymsheet/api-client';
import { Link } from 'expo-router';
import { Text, View } from 'react-native';
import { Button, Input, textLinkStyle } from '@/components/ui';
import { AuthAlert, AuthShell } from '@/components/auth-shell';
import { useAuthStore } from '@/state/auth-store';
import { colors, fontSizes, spacing } from '@/theme';

export default function LoginScreen() {
  const login = useAuthStore((state) => state.login);
  /**
   * El fallo del servidor se guarda aquí y se pinta junto al botón, no se manda
   * al sistema de avisos flotantes: un aviso que se desvanece a los pocos
   * segundos deja a quien lee despacio sin saber por qué no entró.
   */
  const [failure, setFailure] = useState<string | null>(null);
  const {
    control,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginInput>({
    resolver: zodResolver(loginSchema),
    defaultValues: loginDefaults,
  });

  const onSubmit = handleSubmit(async (values) => {
    setFailure(null);
    try {
      await login(values);
    } catch (error) {
      // El mapeo vive en `@gymsheet/domain`, así que la web dice exactamente lo
      // mismo ante el mismo fallo. Un 401 aquí es contraseña incorrecta, no
      // sesión caducada.
      setFailure(
        error instanceof ApiError
          ? authErrorMessage(error.kind, 'login', error.message)
          : authErrorMessage(undefined, 'login'),
      );
    }
  });

  return (
    <AuthShell
      description={authCopy.login.description}
      eyebrow={authCopy.login.eyebrow}
      footer={
        <>
          <Link href="/(auth)/recover-password" style={textLinkStyle()}>
            {authCopy.login.forgotPassword}
          </Link>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.xs }}>
            <Text style={{ color: colors.textMuted, fontSize: fontSizes.sm }}>
              {authCopy.login.switchPrompt}
            </Text>
            <Link href="/(auth)/register" style={textLinkStyle()}>
              {authCopy.login.switchAction}
            </Link>
          </View>
        </>
      }
      title={authCopy.login.title}
    >
      <Controller
        control={control}
        name="email"
        render={({ field: { onChange, onBlur, value } }) => (
          <Input
            autoCapitalize="none"
            // iOS ofrece la credencial guardada en el Llavero sólo si el campo
            // declara qué contiene. Sin esto, el sistema pide guardar la
            // contraseña al entrar pero luego no la sabe rellenar, que es la
            // mitad peor de las dos. `autoComplete` cubre a Android.
            autoComplete="email"
            error={errors.email?.message}
            icon="mail-outline"
            keyboardType="email-address"
            label={authCopy.fields.email.label}
            onBlur={onBlur}
            onChangeText={onChange}
            placeholder={authCopy.fields.email.placeholder}
            textContentType="emailAddress"
            value={value}
          />
        )}
      />
      <Controller
        control={control}
        name="password"
        render={({ field: { onChange, onBlur, value } }) => (
          <Input
            autoComplete="current-password"
            error={errors.password?.message}
            hideLabel={authCopy.hidePassword}
            icon="lock-closed-outline"
            label={authCopy.fields.password.label}
            onBlur={onBlur}
            onChangeText={onChange}
            // El ojo lo gestiona el propio campo, igual que en la web.
            revealable
            revealLabel={authCopy.showPassword}
            textContentType="password"
            value={value}
          />
        )}
      />

      {failure ? <AuthAlert message={failure} /> : null}

      <Button label={authCopy.login.submit} loading={isSubmitting} onPress={onSubmit} />
    </AuthShell>
  );
}
