import { useQuery } from '@tanstack/react-query';
import { communityRules, communityRulesCopy, legalVersionLabel } from '@gymsheet/domain';
import { LegalDocument, type LegalClause, type LegalEssential, type LegalIcon } from '@/components/legal-document';
import { legalQueryKeys, legalService } from '@/features/legal/legal-service';

/**
 * Las normas de la comunidad (documento legal COMMUNITY), con el mismo texto
 * que la web: sale de `@gymsheet/domain`. Se enlaza desde el registro y desde
 * el bloqueo legal, como Términos y Privacidad.
 */
const RULE_ICONS: readonly LegalIcon[] = [
  'id-card-outline',
  'person-circle-outline',
  'people-outline',
  'eye-off-outline',
  'ban-outline',
  'barbell-outline',
  'mail-unread-outline',
  'copy-outline',
];

const CLAUSES: readonly LegalClause[] = [
  { title: 'Dónde valen', icon: 'information-circle-outline', body: communityRulesCopy.intro },
  ...communityRules.map((rule, index) => ({
    title: rule.title,
    icon: RULE_ICONS[index] ?? 'checkmark-circle-outline',
    body: rule.text,
  })),
  {
    title: communityRulesCopy.enforcementTitle,
    icon: 'flag-outline',
    body: communityRulesCopy.enforcement.join(' '),
  },
];

/** Lo esencial: los tres primeros títulos, que ya dicen lo que más pesa. */
const ESSENTIALS: readonly LegalEssential[] = communityRules.slice(0, 3).map((rule, index) => ({
  icon: RULE_ICONS[index] ?? 'checkmark-circle-outline',
  label: `${rule.title}. ${rule.text}`,
}));

export default function NormasScreen() {
  const legal = useQuery({ queryKey: legalQueryKeys.current, queryFn: legalService.current, staleTime: 5 * 60_000 });
  const version = legal.data?.find((entry) => entry.document === 'COMMUNITY')?.version;
  return (
    <LegalDocument
      clauses={CLAUSES}
      essentials={ESSENTIALS}
      icon="people"
      title={communityRulesCopy.title}
      updated={version ? legalVersionLabel(version) : 'Normas vigentes'}
    />
  );
}
