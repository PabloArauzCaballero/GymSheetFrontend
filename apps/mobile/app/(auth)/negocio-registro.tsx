import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'expo-router';
import { Text, View } from 'react-native';
import { z } from 'zod';
import {
  businessKindProblem,
  businessSignupFailures,
  businessWizardCopy,
  legalGateCopy,
} from '@gymsheet/domain';
import { queryKeys } from '@gymsheet/hooks';
import { businessAccountFormSchema, businessLimits } from '@gymsheet/schemas';
import { AuthAlert, AuthShell } from '@/components/auth-shell';
import { Button, textLinkStyle } from '@/components/ui';
import { AccountForm, type AccountValues } from '@/features/business/account-form';
import { fetchBusinessLegal } from '@/features/business/business-service';
import { TypeCards, type BusinessKind } from '@/features/business/type-cards';
import { isTermsVersionOutdated } from '@/features/legal/legal-logic';
import { needsFreshTicket } from '@/features/signup/signup-logic';
import { useRegisterTicket } from '@/features/signup/use-register-ticket';
import { useAuthStore } from '@/state/auth-store';
import { colors, fontSizes, spacing } from '@/theme';

const accountSchema = businessAccountFormSchema.extend({
  businessName: z
    .string()
    .trim()
    .min(businessLimits.nameMin, 'Escribe el nombre de tu negocio.')
    .max(businessLimits.nameMax, 'El nombre es demasiado largo.'),
});

/**
 * Business signup, steps 0–1 (ADR-0020). Creating the account opens the
 * session; `(auth)/_layout` then hands over to the business shell, which
 * resumes at «Verifica tu correo» from `nextSteps`.
 */
export default function BusinessSignupScreen() {
  const registerBusiness = useAuthStore((state) => state.registerBusiness);
  const legal = useQuery({ queryKey: queryKeys.business.legalCurrent, queryFn: fetchBusinessLegal, staleTime: 5 * 60_000 });
  const ticket = useRegisterTicket();
  const [step, setStep] = useState<0 | 1>(0);
  const [kind, setKind] = useState<BusinessKind>({ type: null, legalKind: null });
  const [failure, setFailure] = useState<string | null>(null);
  const { control, handleSubmit, setError, setValue, formState } = useForm<AccountValues>({
    resolver: zodResolver(accountSchema),
    defaultValues: { businessName: '', email: '', password: '', acceptedTerms: false },
  });
  const copy = businessWizardCopy.steps[step];

  const next = () => {
    const problem = businessKindProblem(kind.type, kind.legalKind);
    setFailure(problem);
    if (!problem) setStep(1);
  };

  const submit = handleSubmit(async (values) => {
    setFailure(null);
    const documents = legal.data ?? (await legal.refetch()).data;
    if (!documents?.length || !kind.type) return setFailure(legalGateCopy.versionUnavailable);
    try {
      await registerBusiness({
        email: values.email.trim().toLowerCase(),
        password: values.password,
        businessName: values.businessName.trim(),
        entityType: kind.type,
        ...(kind.legalKind ? { legalKind: kind.legalKind } : {}),
        acceptances: documents.map(({ document, version, contentSha256 }) => ({
          document,
          version,
          ...(contentSha256 ? { contentSha256 } : {}),
        })),
        ticket: await ticket.current(),
      });
    } catch (error) {
      if (needsFreshTicket(error)) ticket.renew();
      if (isTermsVersionOutdated(error)) {
        void legal.refetch();
        setValue('acceptedTerms', false);
      }
      for (const { field, message } of businessSignupFailures(error)) {
        if (field === 'root') setFailure(message);
        else setError(field, { message }, { shouldFocus: true });
      }
    }
  });

  return (
    <AuthShell
      description={`${businessWizardCopy.progress(step)} · ${copy.description}`}
      footer={
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: spacing.xs }}>
          <Link href="/(auth)/login" style={textLinkStyle()}>
            {businessWizardCopy.signIn}
          </Link>
          <Text style={{ color: colors.textMuted, fontSize: fontSizes.sm }}>{businessWizardCopy.signInSuffix}</Text>
        </View>
      }
      pitch={false}
      title={copy.title}
    >
      {step === 0 ? (
        <TypeCards
          onChange={(value) => {
            setKind(value);
            setFailure(null);
          }}
          value={kind}
        />
      ) : (
        <AccountForm control={control} errors={formState.errors} />
      )}
      {failure ? <AuthAlert message={failure} /> : null}
      {step === 0 ? (
        <Button icon="arrow-forward" iconPosition="end" label={businessWizardCopy.next} onPress={next} />
      ) : (
        <View style={{ gap: spacing.sm }}>
          <Button icon="storefront-outline" label={businessWizardCopy.createAccount} loading={formState.isSubmitting} onPress={submit} />
          <Button disabled={formState.isSubmitting} label={businessWizardCopy.back} onPress={() => setStep(0)} variant="ghost" />
        </View>
      )}
    </AuthShell>
  );
}
