import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { View } from 'react-native';
import { Badge, Card, Divider, ScrollScreen, ScreenHeader, Section } from '@/components/layout';
import { EmptyState, ErrorState, Skeleton } from '@/components/feedback';
import { NavRow } from '@/components/list';
import { WeekPlan } from '@/components/week-plan';
import { routineService } from '@/api/services';
import { Button } from '@/components/ui';
import { GOAL_LABEL } from '@/lib/format';
import { spacing } from '@/theme';

export default function RoutinesScreen() {
  const router = useRouter();

  const routines = useQuery({ queryKey: ['routines'], queryFn: () => routineService.list() });
  const assignments = useQuery({
    queryKey: ['routines', 'assignments', 'me'],
    queryFn: () => routineService.myAssignments(),
  });

  const items = routines.data?.items ?? [];
  const assigned = assignments.data?.filter((item) => item.estado === 'ACTIVE') ?? [];
  const refreshing = routines.isFetching || assignments.isFetching;

  return (
    <ScrollScreen
      onRefresh={() => {
        void routines.refetch();
        void assignments.refetch();
      }}
      refreshing={refreshing}
    >
      <ScreenHeader subtitle="Tus planes de entrenamiento." title="Rutinas" />

      <Button label="Crear rutina" onPress={() => router.push('/routines/new')} />

      {/* The week comes before the catalogue on purpose: someone opening this
          screen on a Tuesday wants to know what today is, not to browse. */}
      {assigned.length > 0 ? (
        <Section index={0} title="Tu semana">
          <WeekPlan
            assignments={assigned}
            onPickRoutine={(routineId) =>
              router.push({ pathname: '/routines/[id]', params: { id: routineId } })
            }
          />
        </Section>
      ) : null}

      {assigned.length > 0 ? (
        <Section index={1} title="Asignadas por tu entrenador">
          <Card>
            {assigned.map((assignment, index) => (
              <View key={assignment.id}>
                {index > 0 ? <Divider /> : null}
                <NavRow
                  meta={<Badge label="Asignada" tone="success" />}
                  onPress={() => router.push({ pathname: '/routines/[id]', params: { id: assignment.rutinaId } })}
                  subtitle={assignment.nota ?? 'Sin nota del entrenador'}
                  title={assignment.rutina?.nombre ?? 'Rutina asignada'}
                />
              </View>
            ))}
          </Card>
        </Section>
      ) : null}

      <Section index={2} title="Todas">
        {routines.isPending ? (
          <View style={{ gap: spacing.sm }}>
            <Skeleton height={64} />
            <Skeleton height={64} />
          </View>
        ) : routines.isError ? (
          <ErrorState error={routines.error} onRetry={() => void routines.refetch()} />
        ) : items.length === 0 ? (
          <EmptyState
            icon="albums-outline"
            message="Cuando crees una rutina en la web o tu entrenador te asigne una, aparecerá aquí."
            title="Sin rutinas"
          />
        ) : (
          <Card>
            {items.map((routine, index) => (
              <View key={routine.id}>
                {index > 0 ? <Divider /> : null}
                <NavRow
                  onPress={() => router.push({ pathname: '/routines/[id]', params: { id: routine.id } })}
                  subtitle={[
                    `${routine.ejercicios.length} ejercicios`,
                    routine.objetivo ? GOAL_LABEL[routine.objetivo] : null,
                  ]
                    .filter(Boolean)
                    .join(' · ')}
                  title={routine.nombre}
                />
              </View>
            ))}
          </Card>
        )}
      </Section>
    </ScrollScreen>
  );
}
