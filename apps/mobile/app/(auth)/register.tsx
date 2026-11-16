import { useState } from 'react';
import { useForm, useWatch, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  registerDefaults,
  registerSchema,
  toRegisterPayload,
  type RegisterInput,
} from '@gymsheet/schemas';
import { authCopy, onboardingFlowSteps } from '@gymsheet/domain';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Link } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Text, View } from 'react-native';
import { Button, Input, textLinkStyle } from '@/components/ui';
import { AuthAlert, AuthShell } from '@/components/auth-shell';
import { Checkbox } from '@/components/checkbox';
import { registerBenefits, registerFormTitle } from '@/features/first-impression/copy';
import { EmailSuggestion, FieldHint } from '@/features/first-impression/field-hint';
import { emailTypoSuggestion, passwordChecks } from '@/features/first-impression/signup-hints';
import { accountEmailTextProps } from '@/lib/credential-input';
import {
  isTermsVersionOutdated,
  legalGateCopy,
  outdatedCurrentDocuments,
  termsVersionOf,
} from '@/features/legal/legal-logic';
import { legalQueryKeys, legalService } from '@/features/legal/legal-service';
import { BirthDateField } from '@/features/signup/birth-date-field';
import { SexField } from '@/features/signup/sex-field';
import { signupServerErrors } from '@/features/signup/signup-logic';
import { useAuthStore } from '@/state/auth-store';
import { authLimits } from '@gymsheet/schemas';
import { colors, fontSizes, iconSizes, spacing } from '@/theme';

export default function RegisterScreen() {
  const register = useAuthStore((state) => state.register);
  const queryClient = useQueryClient();
  const legal = useQuery({ queryKey: legalQueryKeys.current, queryFn: legalService.current, staleTime: 5 * 60_000 });
  const [failure, setFailure] = useState<string | null>(null);
  const {
    control,
    handleSubmit,
    setValue,
    setError,
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
    // The version the person is accepting; the server rejects a stale one (409).
    const termsVersion = termsVersionOf(legal.data ?? (await legal.refetch()).data);
    if (!termsVersion) {
      setFailure(legalGateCopy.versionUnavailable);
      return;
    }
    try {
      // La traducción a lo que espera el servidor —quitar la confirmación—
      // la hace el paquete compartido, no esta pantalla: era donde web y
      // móvil se desviaban en silencio.
      // No redirect here: the session flips to authenticated and the onboarding
      // guard in `(app)/_layout.tsx` sends the new CLIENTE to `/onboarding`.
      await register(toRegisterPayload(values, termsVersion));
    } catch (error) {
      if (isTermsVersionOutdated(error)) {
        // The terms changed while the form was open: show the new ones, ask again.
        const fresh = outdatedCurrentDocuments(error.details);
        if (fresh) queryClient.setQueryData(legalQueryKeys.current, fresh);
        else void legal.refetch();
        setValue('acceptedTerms', false);
        setFailure(legalGateCopy.outdatedAtSignup);
        return;
      }
      // A 400 points at its fields (as on web); only what no field explains is a banner.
      const { fields, banner } = signupServerErrors(error);
      fields.forEach(([field, message], index) => setError(field, { message }, { shouldFocus: index === 0 }));
      setFailure(banner);
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
        name="fechaNacimiento"
        render={({ field: { onChange } }) => (
          <BirthDateField error={errors.fechaNacimiento?.message} onChange={onChange} />
        )}
      />
      <Controller
        control={control}
        name="genero"
        render={({ field: { onChange, value } }) => (
          <SexField error={errors.genero?.message} onChange={onChange} value={value} />
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
          por construcción: el número sale de `onboardingFlowSteps` y la segunda
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
            {`Luego, ${onboardingFlowSteps.length} pasos y eliges tu rutina.`}
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
