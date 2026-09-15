import { useState } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  registerDefaults,
  registerSchema,
  toRegisterPayload,
  type RegisterInput,
} from '@gymsheet/schemas';
import {
  authCopy,
  authDestination,
  authErrorMessage,
  genderOptions,
} from '@gymsheet/domain';
import type { UserGender } from '@gymsheet/types';
import { ApiError } from '@gymsheet/api-client';
import { Link, useRouter } from 'expo-router';
import { Text, View } from 'react-native';
import { Button, Input, textLinkStyle } from '@/components/ui';
import { AuthAlert, AuthShell } from '@/components/auth-shell';
import { Checkbox } from '@/components/checkbox';
import { Select } from '@/components/select';
import { useAuthStore } from '@/state/auth-store';
import { colors, fontSizes, spacing } from '@/theme';

export default function RegisterScreen() {
  const register = useAuthStore((state) => state.register);
  const router = useRouter();
  const [failure, setFailure] = useState<string | null>(null);
  const {
    control,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<RegisterInput>({
    resolver: zodResolver(registerSchema),
    defaultValues: registerDefaults,
  });

  const onSubmit = handleSubmit(async (values) => {
    setFailure(null);
    try {
      // La traducción a lo que espera el servidor —quitar la confirmación,
      // omitir el género vacío— la hace el paquete compartido, no esta
      // pantalla: era donde web y móvil se desviaban en silencio.
      await register(toRegisterPayload(values));
      // La cuenta nace sin onboarding: llevarla directo a completarlo evita un
      // panel vacío que no explica por qué lo está. Mismo destino que la web.
      router.replace(authDestination.mobile.afterRegister);
    } catch (error) {
      setFailure(
        error instanceof ApiError
          ? authErrorMessage(error.kind, 'register', error.message)
          : authErrorMessage(undefined, 'register'),
      );
    }
  });

  return (
    <AuthShell
      description={authCopy.register.description}
      eyebrow={authCopy.register.eyebrow}
      footer={
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.xs }}>
          <Text style={{ color: colors.textMuted, fontSize: fontSizes.sm }}>
            {authCopy.register.switchPrompt}
          </Text>
          <Link href="/(auth)/login" style={textLinkStyle()}>
            {authCopy.register.switchAction}
          </Link>
        </View>
      }
      title={authCopy.register.title}
    >
      <Controller
        control={control}
        name="nombreCompleto"
        render={({ field: { onChange, onBlur, value } }) => (
          <Input
            autoComplete="name"
            error={errors.nombreCompleto?.message}
            icon="person-outline"
            label={authCopy.fields.fullName.label}
            onBlur={onBlur}
            onChangeText={onChange}
            placeholder={authCopy.fields.fullName.placeholder}
            textContentType="name"
            value={value}
          />
        )}
      />
      <Controller
        control={control}
        name="email"
        render={({ field: { onChange, onBlur, value } }) => (
          <Input
            autoCapitalize="none"
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
            autoComplete="new-password"
            error={errors.password?.message}
            hideLabel={authCopy.hidePassword}
            icon="lock-closed-outline"
            label={authCopy.fields.password.label}
            onBlur={onBlur}
            onChangeText={onChange}
            placeholder={authCopy.fields.password.placeholder}
            revealable
            revealLabel={authCopy.showPassword}
            textContentType="newPassword"
            value={value}
          />
        )}
      />
      <Controller
        control={control}
        name="confirmation"
        render={({ field: { onChange, onBlur, value } }) => (
          <Input
            autoComplete="new-password"
            error={errors.confirmation?.message}
            hideLabel={authCopy.hidePassword}
            icon="shield-checkmark-outline"
            label={authCopy.fields.confirmation.label}
            onBlur={onBlur}
            onChangeText={onChange}
            placeholder={authCopy.fields.confirmation.placeholder}
            revealable
            revealLabel={authCopy.showPassword}
            textContentType="newPassword"
            value={value}
          />
        )}
      />

      <Controller
        control={control}
        name="genero"
        render={({ field: { onChange, value } }) => (
          // Campo de valores cerrados: selector, no chips. Las opciones son las
          // mismas que sirve la web, desde el paquete compartido.
          <Select<UserGender | ''>
            error={errors.genero?.message}
            hint={authCopy.fields.gender.hint}
            label={authCopy.fields.gender.label}
            onChange={onChange}
            options={genderOptions}
            value={value}
          />
        )}
      />

      <View style={{ gap: spacing.xs }}>
        <Controller
          control={control}
          name="acceptedTerms"
          render={({ field: { onChange, value } }) => (
            <Checkbox
              checked={value}
              label={authCopy.terms.plain}
              onChange={onChange}
            />
          )}
        />
        {errors.acceptedTerms?.message ? (
          <Text
            accessibilityLiveRegion="polite"
            accessibilityRole="alert"
            style={{ color: colors.danger, fontSize: fontSizes.xs }}
          >
            {errors.acceptedTerms.message}
          </Text>
        ) : null}
        <View style={{ flexDirection: 'row', gap: spacing.lg }}>
          <Link href="/(auth)/terminos" style={textLinkStyle()}>
            {authCopy.terms.readTerms}
          </Link>
          <Link href="/(auth)/privacidad" style={textLinkStyle()}>
            {authCopy.terms.readPrivacy}
          </Link>
        </View>
      </View>

      {failure ? <AuthAlert message={failure} /> : null}

      <Button label={authCopy.register.submit} loading={isSubmitting} onPress={onSubmit} />
    </AuthShell>
  );
}
