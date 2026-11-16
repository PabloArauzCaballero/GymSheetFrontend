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
        {/* Points 7 and 8 of the summary: numbering continues after the six rules. */}
        <ol className="grid gap-2" start={communityRules.length + 1}>
          {communityRulesCopy.enforcement.map((line, index) => (
            <li className="text-sm leading-6 text-[var(--text-muted)]" key={line}>
              {`${communityRules.length + index + 1}. ${line}`}
            </li>
          ))}
        </ol>
      </section>
      <p className="rounded-[var(--radius-md)] bg-[var(--surface)] px-4 py-3 text-sm leading-6 text-[var(--text-muted)]" role="note">
        {communityRulesCopy.summaryNote}
      </p>
    </LegalDocument>
  );
}
