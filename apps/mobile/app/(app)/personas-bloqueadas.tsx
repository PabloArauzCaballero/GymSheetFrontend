import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ActivityIndicator, Text, View } from 'react-native';
import { socialService } from '@/api/services';
import { refreshSocialRelationship } from '@/api/social-cache';
import { BackLink } from '@/components/nav';
import { Card, Row, ScrollScreen, Section } from '@/components/layout';
import { Button } from '@/components/ui';
import { EmptyState, ErrorState } from '@/components/feedback';
import { notify } from '@/notifications';
import { colors, fontSizes, semibold, spacing } from '@/theme';

export default function BlockedPeopleScreen() {
  const queryClient = useQueryClient();
  const blocked = useQuery({ queryKey: ['social', 'blocked-users'], queryFn: socialService.listBlockedUsers });
  const unblock = useMutation({
    mutationFn: (userId: string) => socialService.unblockUser(userId),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['social', 'blocked-users'] }),
        refreshSocialRelationship(queryClient),
      ]);
      notify.success('Persona desbloqueada.');
    },
    onError: (error: Error) => notify.error(error.message),
  });

  return (
    <ScrollScreen>
      <BackLink />
      <Section icon="shield-outline" title="Personas bloqueadas">
        {blocked.isPending ? <ActivityIndicator color={colors.volt} /> : blocked.isError ? (
          <ErrorState error={blocked.error} onRetry={() => void blocked.refetch()} />
        ) : blocked.data.length ? (
          <View style={{ gap: spacing.sm }}>
            {blocked.data.map((person) => (
              <Card key={person.userId}>
                <Row icon="person-outline" label="Persona" value={person.displayName} />
                <Button
                  icon="checkmark-circle-outline"
                  label="Desbloquear"
                  loading={unblock.isPending && unblock.variables === person.userId}
                  onPress={() => unblock.mutate(person.userId)}
                  variant="ghost"
                />
              </Card>
            ))}
          </View>
        ) : (
          <EmptyState icon="shield-checkmark-outline" message="Las personas que bloquees aparecerán aquí." title="No hay personas bloqueadas" />
        )}
      </Section>
      <Text style={{ color: colors.textMuted, fontSize: fontSizes.sm, fontWeight: semibold }}>
        Desbloquear permite que esa persona vuelva a aparecer; no restaura conexiones ni mensajes anteriores.
      </Text>
    </ScrollScreen>
  );
}
