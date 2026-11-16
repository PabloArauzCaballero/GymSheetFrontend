import { communityRules, communityRulesCopy } from '@gymsheet/domain';
import type { Metadata } from 'next';
import { LegalDocument } from '@/shared/components/layout/legal-document';

export const metadata: Metadata = { title: communityRulesCopy.title };

/** Community rules (legal document COMMUNITY), from the shared text in `@gymsheet/domain`. */
export default function CommunityRulesPage() {
  return (
    <LegalDocument title={communityRulesCopy.title} updatedAt="25 de agosto de 2026">
      <p className="text-sm leading-6 text-[var(--text-muted)]">{communityRulesCopy.intro}</p>
      <ol className="grid gap-5">
        {communityRules.map((rule, index) => (
          <li className="grid gap-1" key={rule.title}>
            <h2 className="text-lg font-semibold text-[var(--text)]">{`${index + 1}. ${rule.title}`}</h2>
            <p className="text-sm leading-6 text-[var(--text-muted)]">{rule.text}</p>
          </li>
        ))}
      </ol>
      <section className="grid gap-2">
        <h2 className="text-lg font-semibold text-[var(--text)]">{communityRulesCopy.enforcementTitle}</h2>
        {communityRulesCopy.enforcement.map((line) => (
          <p className="text-sm leading-6 text-[var(--text-muted)]" key={line}>
            {line}
          </p>
        ))}
      </section>
      <p className="rounded-[var(--radius-md)] bg-[var(--surface)] px-4 py-3 text-sm leading-6 text-[var(--text-muted)]" role="note">
        {communityRulesCopy.pendingNote}
      </p>
    </LegalDocument>
  );
}
