import { useCallback, useEffect, useState } from 'react';
import { useForm, useWatch, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { loginDefaults, loginSchema, type LoginInput } from '@gymsheet/schemas';
import { authCopy, authErrorMessage } from '@gymsheet/domain';
import { ApiError } from '@gymsheet/api-client';
import { Link, useRouter } from 'expo-router';
import { Alert, Text, View } from 'react-native';
import { Button, Input, textLinkStyle } from '@/components/ui';
import { AuthAlert, AuthShell } from '@/components/auth-shell';
import { accountEmailTextProps } from '@/lib/credential-input';
import { EmailSuggestion } from '@/features/first-impression/field-hint';
import { emailTypoSuggestion } from '@/features/first-impression/signup-hints';
import { useAuthStore } from '@/state/auth-store';
import { colors, fontSizes, spacing } from '@/theme';
import {
  biometricKind,
  biometricLabel,
  forgetParkedToken,
  hasQuickLogin,
  markBiometricOffered,
  takeAutoPromptSkip,
  turnOnQuickLogin,
  wasBiometricOffered,
  type BiometricKind,
} from '@/storage/biometric-login';

export default function LoginScreen() {
  const login = useAuthStore((state) => state.login);
  const loginWithQuickLogin = useAuthStore((state) => state.loginWithQuickLogin);
  const router = useRouter();
  /**
   * El fallo del servidor se guarda aquí y se pinta junto al botón, no se manda
   * al sistema de avisos flotantes: un aviso que se desvanece a los pocos
   * segundos deja a quien lee despacio sin saber por qué no entró.
   */
  const [failure, setFailure] = useState<string | null>(null);
  const {
    control,
    handleSubmit,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<LoginInput>({
    resolver: zodResolver(loginSchema),
    defaultValues: __DEV__
      ? { email: 'athlete.mock@gymsheet.local', password: 'MockLocal2026!' }
      : loginDefaults,
  });

  // Una errata en el dominio es la causa más tonta de un acceso fallido: se
  // avisa antes de enviar, igual que en el alta.
  const email = useWatch({ control, name: 'email' });
  const suggestion = emailTypoSuggestion(email ?? '');

  const [bioKind, setBioKind] = useState<BiometricKind | null>(null);
  const [bioReady, setBioReady] = useState(false);

  // Turning it on stores nothing yet: the refresh token is parked behind the
  // biometric prompt when the person logs out (see `storage/quick-login.ts`).
  const offerBiometrics = useCallback(async (kind: BiometricKind) => {
    if (await wasBiometricOffered()) return;
    await markBiometricOffered();
    await new Promise<void>((resolve) => {
      Alert.alert(
        `¿Entrar con ${biometricLabel(kind)}?`,
        'Al volver después de cerrar sesión no tendrás que escribir tu contraseña.',
        [
          { text: 'Ahora no', style: 'cancel', onPress: () => resolve() },
          {
            text: 'Activar',
            onPress: () => {
              void turnOnQuickLogin().finally(resolve);
            },
          },
        ],
        { cancelable: false },
      );
    });
  }, []);

  const loginWithBiometrics = useCallback(async () => {
    setFailure(null);
    try {
      const outcome = await loginWithQuickLogin();
      if (outcome.kind === 'none' || outcome.kind === 'rejected') setBioReady(false);
      if (outcome.kind === 'rejected') {
        // Revoked from another device, expired, or already spent.
        setFailure('Tu acceso rápido caducó. Entra con tu contraseña.');
      }
    } catch (error) {
      setFailure(
        error instanceof ApiError
          ? authErrorMessage(error.kind, 'login', error.message)
          : authErrorMessage(undefined, 'login'),
      );
    }
  }, [loginWithQuickLogin]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const kind = await biometricKind();
      if (cancelled || !kind) return;
      setBioKind(kind);
      if (await hasQuickLogin()) {
        setBioReady(true);
        // Al abrir la pantalla se lanza solo, como en cualquier app bancaria.
        // Not right after a logout that parked the token: the person just
        // left (and on Android just confirmed with the fingerprint).
        if (!cancelled && !takeAutoPromptSkip()) await loginWithBiometrics();
      }
    })().catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [loginWithBiometrics]);

  const onSubmit = handleSubmit(async (values) => {
    setFailure(null);
    try {
      await login(values);
      // A token parked before is now orphaned: the next logout parks a fresh one.
      void forgetParkedToken();
      if (bioKind) void offerBiometrics(bioKind);
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
      footer={
        // Crear cuenta como botón secundario, no como enlace al final de una
        // frase: quien llega aquí sin cuenta tiene que verlo sin buscarlo.
        <View style={{ alignSelf: 'stretch', alignItems: 'center', gap: spacing.sm }}>
          <Text style={{ color: colors.textMuted, fontSize: fontSizes.sm }}>{authCopy.login.switchPrompt}</Text>
          <Button
            icon="person-add-outline"
            label="Crear cuenta"
            onPress={() => router.push('/(auth)/register')}
            style={{ alignSelf: 'stretch' }}
            variant="secondary"
          />
        </View>
      }
      title={authCopy.login.title}
    >
      <Controller
        control={control}
        name="email"
        render={({ field: { onChange, onBlur, value } }) => (
          <Input
            {...accountEmailTextProps}
            // iOS ofrece la credencial guardada en el Llavero sólo si el campo
            // declara qué contiene, y para emparejarla con la contraseña tiene
            // que ser `username`, no `emailAddress` (ver credential-input).
            error={errors.email?.message}
            icon="mail-outline"
            label={authCopy.fields.email.label}
            onBlur={onBlur}
            onChangeText={onChange}
            placeholder={authCopy.fields.email.placeholder}
            value={value}
          />
        )}
      />
      {suggestion && !errors.email ? (
        <EmailSuggestion
          onAccept={() => setValue('email', suggestion, { shouldValidate: true })}
          suggestion={suggestion}
        />
      ) : null}
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
            placeholder="Tu contraseña"
            // El ojo lo gestiona el propio campo, igual que en la web.
            revealable
            revealLabel={authCopy.showPassword}
            textContentType="password"
            value={value}
          />
        )}
      />

      {/* Junto al campo que se olvida, alineado a la derecha: donde se busca. */}
      <Link
        href="/(auth)/recover-password"
        style={[textLinkStyle(), { alignSelf: 'flex-end', marginTop: -spacing.xs, paddingVertical: spacing.xs }]}
      >
        {authCopy.login.forgotPassword}
      </Link>

      {failure ? <AuthAlert message={failure} /> : null}

      <Button icon="log-in-outline" label={authCopy.login.submit} loading={isSubmitting} onPress={onSubmit} />
      {bioKind && bioReady ? (
        <Button
          icon={bioKind === 'face' ? 'scan-outline' : 'finger-print-outline'}
          label={`Entrar con ${biometricLabel(bioKind)}`}
          onPress={() => void loginWithBiometrics()}
          variant="secondary"
        />
      ) : null}
    </AuthShell>
  );
}
