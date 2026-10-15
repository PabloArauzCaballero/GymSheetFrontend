import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { Pressable, Text, View } from 'react-native';
import { trainingGoals, type TrainingGoal } from '@gymsheet/types';
import { routineService } from '@/api/services';
import { EmptyState, ErrorState, Skeleton } from '@/components/feedback';
import { Card, Divider, ScreenHeader, ScrollScreen, Section } from '@/components/layout';
import { NavRow } from '@/components/list';
import { BackLink } from '@/components/nav';
import { Button } from '@/components/ui';
import { GOAL_LABEL } from '@/lib/format';
import { colors, fontSizes, minTouchTarget, radii, spacing } from '@/theme';

export default function ExploreRoutinesScreen() {
  const router = useRouter();
  const [goal, setGoal] = useState<TrainingGoal | undefined>();
  const [page, setPage] = useState(1);
  const routines = useQuery({
    queryKey: ['routines', 'public', goal, page],
    queryFn: () => routineService.publicList(goal, page),
  });

  return (
    <ScrollScreen onRefresh={() => void routines.refetch()} refreshing={routines.isFetching}>
      <BackLink />
      <ScreenHeader title="Rutinas de tu gimnasio" subtitle="Explora un plan y guarda una copia para adaptarlo." />
      <Section title="Objetivo">
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs }}>
          {([undefined, ...trainingGoals] as Array<TrainingGoal | undefined>).map((item) => (
            <Pressable
              key={item ?? 'all'}
              accessibilityRole="button"
              accessibilityState={{ selected: goal === item }}
              onPress={() => { setGoal(item); setPage(1); }}
              style={{
                minHeight: minTouchTarget,
                justifyContent: 'center',
                paddingHorizontal: spacing.md,
                borderRadius: radii.full,
                backgroundColor: goal === item ? colors.volt : colors.surfaceHigh,
              }}
            >
              <Text style={{ color: goal === item ? colors.background : colors.text, fontSize: fontSizes.sm }}>
                {item ? GOAL_LABEL[item] : 'Todas'}
              </Text>
            </Pressable>
          ))}
        </View>
      </Section>
      <Section title="Publicadas">
        {routines.isPending ? (
          <View style={{ gap: spacing.sm }}><Skeleton height={64} /><Skeleton height={64} /></View>
        ) : routines.isError ? (
          <ErrorState error={routines.error} onRetry={() => void routines.refetch()} />
        ) : routines.data.items.length === 0 ? (
          <EmptyState icon="albums-outline" title="Sin rutinas" message="Todavía no hay rutinas publicadas para este objetivo." />
        ) : (
          <Card>
            {routines.data.items.map((routine, index) => (
              <View key={routine.id}>
                {index > 0 ? <Divider /> : null}
                <NavRow
                  title={routine.nombre}
                  subtitle={`${routine.ejercicios.length} ejercicios · ${routine.objetivo ? GOAL_LABEL[routine.objetivo] : 'Objetivo libre'}`}
                  onPress={() => router.push({ pathname: '/routines/[id]', params: { id: routine.id } })}
                />
              </View>
            ))}
          </Card>
        )}
        {routines.data && routines.data.totalPages > 1 ? (
          <View style={{ flexDirection: 'row', gap: spacing.sm }}>
            <Button label="Anterior" disabled={page <= 1} onPress={() => setPage((current) => current - 1)} variant="ghost" style={{ flex: 1 }} />
            <Button label={`Siguiente · ${page}/${routines.data.totalPages}`} disabled={page >= routines.data.totalPages} onPress={() => setPage((current) => current + 1)} variant="ghost" style={{ flex: 1 }} />
          </View>
        ) : null}
      </Section>
    </ScrollScreen>
  );
}
