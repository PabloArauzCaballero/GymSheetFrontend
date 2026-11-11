import { useState } from 'react';
import { useForm, useWatch, Controller } from 'react-hook-form';
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
  onboardingSteps,
} from '@gymsheet/domain';
import type { UserGender } from '@gymsheet/types';
import { ApiError } from '@gymsheet/api-client';
import { Link, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Text, View } from 'react-native';
import { Button, Input, textLinkStyle } from '@/components/ui';
import { AuthAlert, AuthShell } from '@/components/auth-shell';
import { Checkbox } from '@/components/checkbox';
import { Select } from '@/components/select';
import { registerBenefits, registerFormTitle } from '@/features/first-impression/copy';
import { EmailSuggestion, FieldHint } from '@/features/first-impression/field-hint';
import { emailTypoSuggestion, passwordChecks } from '@/features/first-impression/signup-hints';
import { accountEmailTextProps } from '@/lib/credential-input';
import { useAuthStore } from '@/state/auth-store';
import { authLimits } from '@gymsheet/schemas';
import { colors, fontSizes, iconSizes, spacing } from '@/theme';

export default function RegisterScreen() {
  const register = useAuthStore((state) => state.register);
  const router = useRouter();
  const [failure, setFailure] = useState<string | null>(null);
  const {
    control,
    handleSubmit,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<RegisterInput>({
    resolver: zodResolver(registerSchema),
    defaultValues: registerDefaults,
  });
  // Lo que el envío va a exigir, adelantado mientras se escribe.
  const [email, password, confirmation] = useWatch({ control, name: ['email', 'password', 'confirmation'] });
  const suggestion = emailTypoSuggestion(email ?? '');
  const checks = passwordChecks(password ?? '', confirmation ?? '');

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
      benefits={registerBenefits}
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
      title={registerFormTitle}
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
            {...accountEmailTextProps}
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
            autoComplete="new-password"
            error={errors.password?.message}
            hideLabel={authCopy.hidePassword}
            icon="lock-closed-outline"
            label={authCopy.fields.password.label}
            onBlur={onBlur}
            onChangeText={onChange}
            // El requisito ya lo dice en vivo la línea de debajo; repetirlo aquí
            // cortaba el texto en un iPhone SE («Mínimo 8 cara»).
            placeholder="Tu contraseña"
            revealable
            revealLabel={authCopy.showPassword}
            textContentType="newPassword"
            value={value}
          />
        )}
      />
      {errors.password ? null : (
        <FieldHint
          label={`${authLimits.passwordMin} caracteres o más`}
          state={checks.longEnough ? 'ok' : 'pending'}
        />
      )}
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
            placeholder="Repítela"
            revealable
            revealLabel={authCopy.showPassword}
            textContentType="newPassword"
            value={value}
          />
        )}
      />
      {checks.matches === null || errors.confirmation ? null : (
        <FieldHint
          label={checks.matches ? 'Las contraseñas coinciden' : 'Aún no coinciden'}
          state={checks.matches ? 'ok' : 'off'}
        />
      )}

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
        {/* «Términos» y «Privacidad» a secas: la casilla de encima ya los nombra
            enteros, y en un iPhone SE «Leer términos» partía en dos líneas. El
            lector de pantalla oye la versión larga. */}
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', columnGap: spacing.lg, rowGap: spacing.xs }}>
          <Link accessibilityLabel={authCopy.terms.readTerms} href="/(auth)/terminos" numberOfLines={1} style={[textLinkStyle(), { flexShrink: 0 }]}>
            Términos
          </Link>
          <Link
            accessibilityLabel={authCopy.terms.readPrivacy}
            href="/(auth)/privacidad"
            numberOfLines={1}
            style={[textLinkStyle(), { flexShrink: 0 }]}
          >
            Privacidad
          </Link>
        </View>
      </View>

      {failure ? <AuthAlert message={failure} /> : null}

      <Button icon="person-add-outline" label={authCopy.register.submit} loading={isSubmitting} onPress={onSubmit} />

      {/* Qué pasa después y qué pasa con tus datos, junto al botón que decide
          (skill `signup`: quitar incertidumbre). Las dos frases son ciertas
          por construcción: el número sale de `onboardingSteps` y la segunda
          es la cláusula 2 de la política. */}
      <View style={{ gap: spacing.xs, alignSelf: 'stretch' }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.xs }}>
          <Ionicons
            accessibilityElementsHidden
            color={colors.textMuted}
            importantForAccessibility="no-hide-descendants"
            name="flash-outline"
            size={iconSizes.sm}
          />
          <Text style={{ color: colors.textMuted, fontSize: fontSizes.sm, flex: 1 }}>
            {`Luego, ${onboardingSteps.length} preguntas y eliges tu rutina.`}
          </Text>
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.xs }}>
          <Ionicons
            accessibilityElementsHidden
            color={colors.textMuted}
            importantForAccessibility="no-hide-descendants"
            name="lock-closed-outline"
            size={iconSizes.sm}
          />
          <Text style={{ color: colors.textMuted, fontSize: fontSizes.sm, flex: 1 }}>No vendemos tus datos a terceros.</Text>
        </View>
      </View>
    </AuthShell>
  );
}
