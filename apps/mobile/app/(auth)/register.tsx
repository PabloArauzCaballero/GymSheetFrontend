import { useState } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { registerSchema, type RegisterInput as RegisterFormValues } from '@gymsheet/schemas';
import type { UserGender } from '@gymsheet/types';
import { ApiError } from '@gymsheet/api-client';
import { Link, useRouter } from 'expo-router';
import { Pressable, Text, View } from 'react-native';
import { Screen, AppText, Button, Input } from '@/components/ui';
import { Checkbox } from '@/components/checkbox';
import { notify } from '@/notifications';
import { useAuthStore } from '@/state/auth-store';
import { spacing, colors, fontSizes, radii, semibold, useActiveTenant } from '@/theme';

const GENDER_OPTIONS: ReadonlyArray<{ value: UserGender | ''; label: string }> = [
  { value: '', label: 'Prefiero no decirlo' },
  { value: 'MALE', label: 'Hombre' },
  { value: 'FEMALE', label: 'Mujer' },
];

export default function RegisterScreen() {
  const register = useAuthStore((state) => state.register);
  const router = useRouter();
  const tenant = useActiveTenant();
  const {
    control,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<RegisterFormValues>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      nombreCompleto: '',
      email: '',
      password: '',
      confirmation: '',
      genero: '',
      acceptedTerms: false,
    },
  });

  const onSubmit = handleSubmit(async (values) => {
    try {
      await register({
        nombreCompleto: values.nombreCompleto,
        email: values.email,
        password: values.password,
        acceptedTerms: true,
        ...(values.genero ? { genero: values.genero as UserGender } : {}),
      });
      // La cuenta nace sin onboarding: llevarla directo a completarlo evita un
      // panel vacío que no explica por qué lo está. Mismo cuestionario que en
      // la web (objetivo, medidas, cómo entrena, equipo).
      router.replace('/onboarding');
    } catch (error) {
      notify.error(error instanceof ApiError ? error.message : 'No se pudo crear la cuenta.');
    }
  });

  return (
    <Screen>
      <View style={{ gap: spacing.xs, marginBottom: spacing.lg }}>
        <AppText variant="title">{tenant.name}</AppText>
        <AppText variant="muted">Crea tu cuenta para empezar</AppText>
      </View>

      <Controller
        control={control}
        name="nombreCompleto"
        render={({ field: { onChange, onBlur, value } }) => (
          <Input
            autoComplete="name"
            error={errors.nombreCompleto?.message}
            label="Nombre completo"
            onBlur={onBlur}
            onChangeText={onChange}
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
            keyboardType="email-address"
            label="Correo electrónico"
            onBlur={onBlur}
            onChangeText={onChange}
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
            label="Contraseña"
            onBlur={onBlur}
            onChangeText={onChange}
            secureTextEntry
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
            label="Confirmar contraseña"
            onBlur={onBlur}
            onChangeText={onChange}
            secureTextEntry
            textContentType="newPassword"
            value={value}
          />
        )}
      />

      <Controller
        control={control}
        name="genero"
        render={({ field: { onChange, value } }) => (
          <View style={{ gap: spacing.xs, marginBottom: spacing.md }}>
            <Text style={{ color: colors.textMuted, fontSize: fontSizes.xs }}>
              Género (opcional) — solo para elegir con qué arquetipos te habla la senda.
            </Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs }}>
              {GENDER_OPTIONS.map((option) => {
                const active = (value ?? '') === option.value;
                return (
                  <Pressable
                    key={option.label}
                    onPress={() => onChange(option.value)}
                    style={{
                      paddingHorizontal: spacing.md,
                      paddingVertical: spacing.sm,
                      borderRadius: radii.full,
                      borderWidth: 1,
                      borderColor: active ? colors.volt : colors.border,
                      backgroundColor: active ? colors.surfaceHigh : colors.surfaceLow,
                    }}
                  >
                    <Text
                      style={{
                        color: active ? colors.text : colors.textMuted,
                        fontSize: fontSizes.sm,
                        fontWeight: active ? semibold : '400',
                      }}
                    >
                      {option.label}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </View>
        )}
      />

      <View style={{ gap: spacing.xs, marginBottom: spacing.sm }}>
        <Link href="/(auth)/terminos" style={{ color: colors.volt, fontSize: fontSizes.sm }}>
          Leer términos y condiciones
        </Link>
        <Link href="/(auth)/privacidad" style={{ color: colors.volt, fontSize: fontSizes.sm }}>
          Leer política de privacidad
        </Link>
      </View>
      <Controller
        control={control}
        name="acceptedTerms"
        render={({ field: { onChange, value } }) => (
          <Checkbox
            checked={value}
            label="Acepto los términos y la política de privacidad"
            onChange={onChange}
          />
        )}
      />
      {errors.acceptedTerms?.message ? (
        <Text style={{ color: colors.danger, fontSize: fontSizes.xs, marginTop: spacing.xs }}>
          {errors.acceptedTerms.message}
        </Text>
      ) : null}

      <Button
        label="Crear cuenta"
        loading={isSubmitting}
        onPress={onSubmit}
        style={{ marginTop: spacing.md }}
      />

      <Link href="/(auth)/login" style={{ color: colors.volt, marginTop: spacing.sm }}>
        ¿Ya tienes cuenta? Inicia sesión
      </Link>
    </Screen>
  );
}
