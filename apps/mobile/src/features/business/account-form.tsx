import { Controller, type Control, type FieldErrors } from 'react-hook-form';
import { Link } from 'expo-router';
import { Text, View } from 'react-native';
import { authCopy, businessTermsCopy, businessWizardCopy } from '@gymsheet/domain';
import { Checkbox } from '@/components/checkbox';
import { Input, textLinkStyle } from '@/components/ui';
import { legalDocumentRoutes } from '@/features/legal/legal-logic';
import { accountEmailTextProps } from '@/lib/credential-input';
import { colors, fontSizes, spacing } from '@/theme';

export type AccountValues = { businessName: string; email: string; password: string; acceptedTerms: boolean };

/** Step 1, «Tu cuenta»: business name, email, password and the business legal checkbox. */
export function AccountForm({ control, errors }: { control: Control<AccountValues>; errors: FieldErrors<AccountValues> }) {
  return (
    <View style={{ gap: spacing.md }}>
      <Controller
        control={control}
        name="businessName"
        render={({ field: { onChange, onBlur, value } }) => (
          <Input
            error={errors.businessName?.message}
            icon="storefront-outline"
            label={businessWizardCopy.fields.businessName.label}
            onBlur={onBlur}
            onChangeText={onChange}
            placeholder={businessWizardCopy.fields.businessName.placeholder}
            textContentType="organizationName"
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
            placeholder="Tu contraseña"
            revealable
            revealLabel={authCopy.showPassword}
            textContentType="newPassword"
            value={value}
          />
        )}
      />
      <Controller
        control={control}
        name="acceptedTerms"
        render={({ field: { onChange, value } }) => (
          <View style={{ gap: spacing.xs }}>
            <Checkbox
              checked={value}
              label={`${businessTermsCopy.prefix} ${businessTermsCopy.businessTermsLabel} ${businessTermsCopy.connector} ${businessTermsCopy.businessDpaLabel}`}
              onChange={onChange}
            />
            <Text style={{ color: colors.textMuted, fontSize: fontSizes.xs }}>{businessTermsCopy.helper}</Text>
            {errors.acceptedTerms?.message ? (
              <Text accessibilityLiveRegion="polite" accessibilityRole="alert" style={{ color: colors.danger, fontSize: fontSizes.xs }}>
                {errors.acceptedTerms.message}
              </Text>
            ) : null}
            {/* A native checkbox takes a plain label: the two documents open from links under it. */}
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', columnGap: spacing.lg, rowGap: spacing.xs }}>
              <Link href={legalDocumentRoutes.BUSINESS_TERMS.href} style={textLinkStyle()}>
                {businessTermsCopy.businessTermsLabel}
              </Link>
              <Link href={legalDocumentRoutes.BUSINESS_DPA.href} style={textLinkStyle()}>
                {businessTermsCopy.businessDpaLabel}
              </Link>
            </View>
          </View>
        )}
      />
    </View>
  );
}
