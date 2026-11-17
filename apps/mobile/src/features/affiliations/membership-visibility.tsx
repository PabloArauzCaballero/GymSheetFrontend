import { membershipVisibilityHint, membershipVisibilityLabel } from '@gymsheet/domain';
import { queryKeys } from '@gymsheet/hooks';
import type { MyGym } from '@gymsheet/schemas';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import * as Haptics from 'expo-haptics';
import { Switch, View } from 'react-native';
import { Card } from '@/components/layout';
import { Text } from '@/components/text';
import { notify } from '@/notifications';
import { useReduceMotion } from '@/notifications/use-reduce-motion';
import { colors, minTouchTarget, spacing } from '@/theme';
import { affiliationErrorText, personAffiliationsService } from './affiliations-service';

/** «Mostrar que soy socio de X» (ADR-0027 §6): hides the badge, the member list, the ranking and SAME_GYM. */
export function MembershipVisibility({ myGym }: { myGym: MyGym }) {
  const client = useQueryClient();
  const reduceMotion = useReduceMotion();
  const save = useMutation({
    mutationFn: (visible: boolean) => personAffiliationsService.setMembershipVisible(visible),
    onSuccess: (updated) => {
      client.setQueryData(queryKeys.myGym, updated);
      void client.invalidateQueries({ queryKey: queryKeys.leaderboard });
    },
    onError: (error) => notify.error(affiliationErrorText(error)),
  });
  if (!myGym.gym) return null;
  const label = membershipVisibilityLabel(myGym.gym.name);
  const value = save.isPending && save.variables !== undefined ? save.variables : myGym.membershipVisible;
  return (
    <Card>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md, minHeight: minTouchTarget }}>
        <View style={{ flex: 1, gap: spacing.xxs }}>
          <Text strong variant="subhead">{label}</Text>
          <Text tone="muted" variant="footnote">{membershipVisibilityHint}</Text>
        </View>
        <Switch
          accessibilityLabel={label}
          accessibilityRole="switch"
          accessibilityState={{ checked: value, disabled: save.isPending }}
          disabled={save.isPending}
          ios_backgroundColor={colors.surfaceHigh}
          onValueChange={(visible) => {
            if (!reduceMotion) void Haptics.selectionAsync();
            save.mutate(visible);
          }}
          thumbColor={colors.surfaceHigh}
          trackColor={{ false: colors.surfaceHigh, true: colors.volt }}
          value={value}
        />
      </View>
    </Card>
  );
}
