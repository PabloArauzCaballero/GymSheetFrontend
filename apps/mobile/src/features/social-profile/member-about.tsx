import { View } from 'react-native';
import type { SocialAbout } from '@gymsheet/schemas';
import { FactChips } from '@/components/fact-chips';
import { Card, Section } from '@/components/layout';
import { Text } from '@/components/text';
import { spacing } from '@/theme';
import { aboutFacts, hasAbout } from './about-facts';
import { useInterestLabels } from './use-interest-catalog';

/**
 * «Sobre mí» of another member: bio, interests and habits, in that order — the
 * bio is their own voice, the rest is detail. Renders nothing when empty.
 */
export function MemberAbout({ about }: { about: SocialAbout | undefined }) {
  const interests = useInterestLabels(about?.interests);
  if (!hasAbout(about)) return null;
  const bio = about.bio?.trim();
  return (
    <Section icon="chatbubble-ellipses-outline" title="Sobre mí">
      <Card>
        {bio ? <Text variant="body">{bio}</Text> : null}
        {interests.length > 0 ? (
          <View style={{ gap: spacing.xs }}>
            <Text strong tone="secondary" variant="footnote">Intereses</Text>
            <FactChips facts={interests.map((label) => ({ key: label, label, icon: 'sparkles-outline' }))} />
          </View>
        ) : null}
        <FactChips facts={aboutFacts(about)} />
      </Card>
    </Section>
  );
}
