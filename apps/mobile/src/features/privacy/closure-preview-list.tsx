import { Ionicons } from '@expo/vector-icons';
import { Fragment } from 'react';
import { View } from 'react-native';
import { Card, Divider, Section } from '@/components/layout';
import { Text } from '@/components/text';
import { colors, iconSizes, spacing } from '@/theme';
import { closureGroups, closureItemLabel } from './account-logic';
import type { ClosurePreview } from '@gymsheet/schemas';

const GROUP_ICON = {
  deleted: 'trash-outline',
  anonymized: 'eye-off-outline',
  kept: 'archive-outline',
} as const;

/**
 * What closing does, before it is done: the account itself, then what is
 * deleted, what stays without the person's data and what is kept, each kept
 * or anonymized item with the reason the server gives.
 */
export function ClosurePreviewList({ preview }: { preview: ClosurePreview }) {
  return (
    <>
      <Card>
        <Text variant="headline">{preview.account.label}</Text>
        <Text tone="secondary" variant="footnote">{preview.account.reason}</Text>
      </Card>
      {closureGroups(preview).map((group) => (
        <Section icon={GROUP_ICON[group.key]} key={group.key} title={group.title}>
          <Card list>
            {group.items.map((item, index) => (
              <Fragment key={item.table}>
                {index > 0 ? <Divider /> : null}
                <View style={{ flexDirection: 'row', gap: spacing.sm, paddingVertical: spacing.sm }}>
                  <Ionicons
                    accessibilityElementsHidden
                    color={colors.textMuted}
                    importantForAccessibility="no-hide-descendants"
                    name={GROUP_ICON[group.key]}
                    size={iconSizes.sm}
                  />
                  <View style={{ flex: 1, gap: spacing.xxs }}>
                    <Text tabular>{closureItemLabel(item)}</Text>
                    {item.reason ? <Text tone="muted" variant="footnote">{item.reason}</Text> : null}
                  </View>
                </View>
              </Fragment>
            ))}
          </Card>
        </Section>
      ))}
    </>
  );
}
