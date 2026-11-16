'use client';

import {
  accountClosureCopy,
  accountExportCopy,
  accountNameCopy,
  consentsSectionCopy,
  emailChangeCopy,
  privacySettingsCopy,
} from '@gymsheet/domain';
import { ShieldCheck } from 'lucide-react';
import { Section } from '@/shared/components/mobile/section';
import { AccountClosure } from './account-closure';
import { AccountExportCard } from './account-export-card';
import { AccountNameForm } from './account-name-form';
import { ConsentsList } from './consents-list';
import { EmailChangeForm } from './email-change-form';
import { PrivacyDisclosure } from './privacy-disclosure';

/**
 * «Privacidad y datos» in Ajustes: the consents first (always visible, they
 * are state), then the account rights, each opening in place. Closing the
 * account goes last and in red, like every destructive action.
 */
export function PrivacySection({ name }: Readonly<{ name?: string }>) {
  return (
    <Section icon={ShieldCheck} title={privacySettingsCopy.title}>
      <p className="t-subhead -mt-1 text-[var(--text-muted)]">{privacySettingsCopy.description}</p>
      <div className="grid gap-2">
        <h3 className="data-label text-[var(--text-muted)]">{consentsSectionCopy.title}</h3>
        <p className="t-footnote text-[var(--text-muted)]">{consentsSectionCopy.description}</p>
        <ConsentsList />
      </div>
      <div className="panel divide-y divide-[var(--border)] px-5 py-1">
        <PrivacyDisclosure title={accountExportCopy.title}>
          <AccountExportCard />
        </PrivacyDisclosure>
        <PrivacyDisclosure title={emailChangeCopy.title}>
          <EmailChangeForm />
        </PrivacyDisclosure>
        <PrivacyDisclosure title={accountNameCopy.title}>
          <AccountNameForm name={name} />
        </PrivacyDisclosure>
        <PrivacyDisclosure title={accountClosureCopy.title} tone="danger">
          <AccountClosure />
        </PrivacyDisclosure>
      </div>
    </Section>
  );
}
