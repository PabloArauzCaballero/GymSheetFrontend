import { useMutation } from '@tanstack/react-query';
import type { ReactNode } from 'react';
import { View } from 'react-native';
import {
  ciExtensionLabels,
  kycCopy,
  kycDocumentSlots,
  kycFailure,
  legalPartForMissing,
  stepForMissing,
  type BusinessWizardStep,
  type KycLegalPart,
} from '@gymsheet/domain';
import type { BusinessMe, CiExtension, KycState, KycSubmitResult } from '@gymsheet/schemas';
import { AuthAlert } from '@/components/auth-shell';
import { Card, Divider } from '@/components/layout';
import { Text } from '@/components/text';
import { Button } from '@/components/ui';
import { spacing } from '@/theme';
import { kycService } from './kyc-service';
import { StepNav } from './step-nav';

function Section({ title, onEdit, children }: { title: string; onEdit: () => void; children: ReactNode }) {
  return (
    <View style={{ gap: spacing.xs }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.sm }}>
        <Text accessibilityRole="header" strong variant="body">{title}</Text>
        <Button accessibilityLabel={`${kycCopy.review.edit}: ${title}`} label={kycCopy.review.edit} onPress={onEdit} size="sm" variant="ghost" />
      </View>
      {children}
    </View>
  );
}

function Item({ label, value }: { label: string; value: string | null | undefined }) {
  if (!value) return null;
  return (
    <Text variant="subhead">
      <Text tone="secondary" variant="subhead">{label}: </Text>
      {value}
    </Text>
  );
}

/** Step 7, «Revisa y envía»: one summary with «Editar» per step, the unreadable-photo warning and the submit. */
export function ReviewStep({
  state,
  me,
  onEdit,
  onSubmitted,
  onBack,
}: {
  state: KycState;
  me: BusinessMe | undefined;
  onEdit: (step: BusinessWizardStep, part?: KycLegalPart, notice?: string) => void;
  onSubmitted: (result: KycSubmitResult) => void;
  onBack: () => void;
}) {
  const fields = state.submission?.fields;
  const legalKind = state.submission?.legalKind ?? me?.account.legalKind ?? 'COMPANY';
  const documents = state.submission?.documents ?? [];
  const required = kycDocumentSlots(legalKind).filter((slot) => slot.required && slot.key !== 'LOGO').length;
  const unreadable = documents.filter((document) => !document.readable).length;
  const submit = useMutation({
    mutationFn: kycService.submit,
    onSuccess: onSubmitted,
    onError: (error) => {
      const failure = kycFailure(error);
      const step = failure.missing ? stepForMissing(failure.missing) : null;
      if (step !== null && failure.missing) onEdit(step, legalPartForMissing(legalKind, failure.missing), failure.message);
    },
  });
  const ci = fields?.repCiMasked
    ? [fields.repCiMasked, fields.repCiComplement, fields.repCiExtension ? ciExtensionLabels[fields.repCiExtension as CiExtension] : null].filter(Boolean).join(' · ')
    : null;
  const phone = state.phone ? (state.phone.verified ? kycCopy.phone.verified(state.phone.phoneMasked) : kycCopy.phone.saved(state.phone.phoneMasked)) : kycCopy.review.phoneMissing;

  return (
    <View style={{ gap: spacing.md }}>
      <Card>
        <Section onEdit={() => onEdit(3)} title={kycCopy.review.sections.business}>
          <Item label="Nombre" value={fields?.tradeName ?? me?.entity.name} />
          <Item label="@usuario" value={me?.handle ? `@${me.handle.handle}` : null} />
          <Item label="Ciudad" value={me?.entity.city} />
        </Section>
        <Divider />
        <Section onEdit={() => onEdit(4)} title={kycCopy.review.sections.phone}>
          <Item label="Celular" value={phone} />
        </Section>
        <Divider />
        <Section onEdit={() => onEdit(5)} title={kycCopy.review.sections.legal}>
          <Item label={kycCopy.legal.legalName} value={fields?.legalName} />
          <Item label={kycCopy.legal.nit} value={fields?.nitMasked} />
          <Item label={kycCopy.legal.address} value={fields?.address} />
          <Item label={kycCopy.legal.repFullName} value={fields?.repFullName} />
          <Item label="Carnet" value={ci} />
          <Item label={kycCopy.legal.specialty} value={fields?.specialty} />
        </Section>
        <Divider />
        <Section onEdit={() => onEdit(6)} title={kycCopy.review.sections.documents}>
          <Item label="Fotos" value={kycCopy.review.documentsSummary(documents.filter((document) => document.readable).length, required)} />
          <Item label="Logo" value={legalKind === 'COMPANY' ? (me?.entity.logoUrl ? kycCopy.documents.logoReady : kycCopy.documents.missing) : null} />
        </Section>
      </Card>
      {unreadable > 0 ? (
        <Card>
          <Text strong tone="warning" variant="body">{kycCopy.review.unreadable(unreadable)}</Text>
          <Text tone="secondary" variant="subhead">{kycCopy.review.fixFirst}</Text>
          <Button label={kycCopy.documents.retake} onPress={() => onEdit(6)} size="sm" variant="ghost" />
        </Card>
      ) : null}
      <Text tone="secondary" variant="footnote">{kycCopy.review.terms}</Text>
      {submit.error ? <AuthAlert message={kycFailure(submit.error).message} /> : null}
      <StepNav loading={submit.isPending} nextLabel={submit.isPending ? kycCopy.review.submitting : kycCopy.review.submit} onBack={onBack} onNext={() => submit.mutate()} />
    </View>
  );
}
