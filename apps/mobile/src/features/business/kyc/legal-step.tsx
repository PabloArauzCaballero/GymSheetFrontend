import { useState } from 'react';
import { View } from 'react-native';
import { kycCopy, kycLegalParts, legalPartProgress, type KycLegalPart } from '@gymsheet/domain';
import type { BusinessMe, KycSubmission, LegalKind } from '@gymsheet/schemas';
import { Text } from '@/components/text';
import { spacing } from '@/theme';
import { ChangeForm } from './change-form';
import { CompanyForm } from './company-form';
import { IdentityForm } from './identity-form';

/** Step 5, «Datos legales», in parts of at most four fields, each saved on the server before moving on. */
export function LegalStep({
  legalKind,
  submission,
  me,
  startPart,
  onNext,
  onBack,
}: {
  legalKind: LegalKind;
  submission: KycSubmission | null;
  me: BusinessMe | undefined;
  startPart?: KycLegalPart;
  onNext: () => void;
  onBack: () => void;
}) {
  const parts = kycLegalParts(legalKind, submission?.purpose);
  const [index, setIndex] = useState(() => Math.max(0, startPart ? parts.indexOf(startPart) : 0));
  const part = parts[Math.min(index, parts.length - 1)]!;
  const advance = () => (index + 1 < parts.length ? setIndex(index + 1) : onNext());
  const back = () => (index > 0 ? setIndex(index - 1) : onBack());
  const key = `${part}-${submission?.id ?? 'new'}`;

  return (
    <View style={{ gap: spacing.md }}>
      <View accessibilityLiveRegion="polite" style={{ gap: spacing.xxs }}>
        <Text accessibilityRole="header" variant="headline">{legalPartProgress(part, parts)}</Text>
        <Text tone="secondary" variant="subhead">{kycCopy.legal.parts[part].description}</Text>
      </View>
      {part === 'business' && me ? (
        <ChangeForm
          current={{ name: me.entity.name, primaryCategoryId: me.entity.primaryCategoryId }}
          entityType={me.entity.entityType}
          key={key}
          onBack={back}
          onSaved={advance}
          submission={submission}
        />
      ) : null}
      {part === 'company' ? <CompanyForm key={key} onBack={back} onSaved={advance} submission={submission} /> : null}
      {part === 'representative' || part === 'person' ? (
        <IdentityForm key={key} onBack={back} onSaved={advance} submission={submission} variant={part} />
      ) : null}
    </View>
  );
}
