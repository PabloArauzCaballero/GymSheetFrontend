'use client';

import { useState } from 'react';
import { kycCopy, kycLegalParts, legalPartProgress, type KycLegalPart } from '@gymsheet/domain';
import type { BusinessMe, KycSubmission, LegalKind } from '@/shared/api/schemas';
import { KycBusinessChangeForm } from './kyc-business-change-form';
import { KycCompanyForm } from './kyc-company-form';
import { KycIdentityForm } from './kyc-identity-form';

/**
 * Step 5, «Datos legales», in parts of at most four fields: company →
 * representative, or the individual's own data. Each part saves the draft on
 * the server before moving on (autosave per screen), so a reload resumes here.
 */
export function KycLegalStep({
  legalKind,
  submission,
  me,
  startPart,
  onNext,
  onBack,
}: Readonly<{
  legalKind: LegalKind;
  submission: KycSubmission | null;
  me: BusinessMe | undefined;
  startPart?: KycLegalPart;
  onNext: () => void;
  onBack: () => void;
}>) {
  const parts = kycLegalParts(legalKind, submission?.purpose);
  const [index, setIndex] = useState(() => Math.max(0, startPart ? parts.indexOf(startPart) : 0));
  const part = parts[Math.min(index, parts.length - 1)]!;
  const copy = kycCopy.legal.parts[part];
  const advance = () => (index + 1 < parts.length ? setIndex(index + 1) : onNext());
  const back = () => (index > 0 ? setIndex(index - 1) : onBack());
  // A new part remounts its form with the fresh draft as defaults.
  const key = `${part}-${submission?.id ?? 'new'}`;

  return (
    <div className="grid gap-5">
      <div className="grid gap-0.5" aria-live="polite">
        <h2 className="t-headline">{legalPartProgress(part, parts)}</h2>
        <p className="t-subhead text-[var(--text-muted)]">{copy.description}</p>
      </div>
      {part === 'business' && me ? (
        <KycBusinessChangeForm
          current={{ name: me.entity.name, primaryCategoryId: me.entity.primaryCategoryId }}
          entityType={me.entity.entityType}
          key={key}
          onBack={back}
          onSaved={advance}
          submission={submission}
        />
      ) : null}
      {part === 'company' ? <KycCompanyForm key={key} onBack={back} onSaved={advance} submission={submission} /> : null}
      {part === 'representative' || part === 'person' ? (
        <KycIdentityForm key={key} onBack={back} onSaved={advance} submission={submission} variant={part} />
      ) : null}
    </div>
  );
}
