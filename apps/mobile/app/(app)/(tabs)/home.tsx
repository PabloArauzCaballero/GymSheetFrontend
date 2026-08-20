import { Ionicons } from '@expo/vector-icons';
import { useQueries } from '@tanstack/react-query';
import { View, Text } from 'react-native';
import { isStaff } from '@gymsheet/domain';
import {
  Badge,
  Card,
  Columns,
  Divider,
  Row,
  ScrollScreen,
  ScreenHeader,
  Section,
  StatTile,
  useResponsive,
} from '@/components/layout';
import { EmptyState, ErrorState, Skeleton } from '@/components/feedback';
import { membershipService, routineService, workoutService } from '@/api/services';
import { useRouter } from 'expo-router';
import { Button } from '@/components/ui';
import { useAuthStore } from '@/state/auth-store';
import { TourTarget, useScreenTour } from '@/components/tour';
import { MembershipGate } from '@/components/membership-gate';
import {
  MEMBERSHIP_LABEL,
  MEMBERSHIP_TONE,
  WORKOUT_LABEL,
  WORKOUT_TONE,
  formatDate,
  formatDuration,
  formatTimeOfDay,
  relativeDay,
  shortName,
} from '@/lib/format';
import { accentPolicy, colors, fontSizes, iconSizes, radii, semibold, spacing } from '@/theme';
import {
  formatVolume,
  overloadDelta,
  summariseTraining,
} from '@/lib/training-metrics';

/**
 * The client's dashboard: where the membership stands, what training is
 * assigned and what was actually done lately. Every card reflects live backend
 * state — nothing here is a placeholder.
 */
export default function HomeScreen() {
  const principal = useAuthStore((state) => state.principal);
  const router = useRouter();
  const { wide } = useResponsive();
  useScreenTour('home');

  const [membership, workouts, assignments] = useQueries({
    queries: [
      { queryKey: ['membership', 'me'], queryFn: () => membershipService.getMine() },
      // 40 en vez de 5: la lista de abajo sólo enseña las últimas, pero el
      // panel compara esta semana con la anterior y necesita el historial
      // completo de ese periodo. Una sola petición sirve a ambos.
      { queryKey: ['workouts', 'recent'], queryFn: () => workoutService.list(40) },
      { queryKey: ['routines', 'assignments', 'me'], queryFn: () => routineService.myAssignments() },
    ],
  });

  const refreshing = membership.isFetching || workouts.isFetching || assignments.isFetching;
  const refresh = () => {
    void membership.refetch();
    void workouts.refetch();
    void assignments.refetch();
  };

  const firstName = shortName(principal?.nombreCompleto, principal?.email);
  const sessions = workouts.data?.items ?? [];
  const finished = sessions.filter((session) => session.estado === 'FINALIZADA');
  const activeAssignment = assignments.data?.find((item) => item.estado === 'ACTIVE');
  const training = summariseTraining(sessions);
  const overload = overloadDelta(training);

  const membershipSection = (
    <Section icon="card-outline" index={0} title="Membresía">
      {membership.isPending ? (
        <Skeleton height={110} />
      ) : membership.isError ? (
        <ErrorState error={membership.error} onRetry={() => void membership.refetch()} />
      ) : membership.data?.membership ? (
        <Card accent={colors.volt}>
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: spacing.sm,
            }}
          >
            <Text style={{ color: colors.text, fontSize: fontSizes.md, fontWeight: '700', flex: 1 }}>
              {membership.data.membership.plan?.nombre ?? 'Plan actual'}
            </Text>
            <Badge
              label={MEMBERSHIP_LABEL[membership.data.membership.estado]}
              tone={MEMBERSHIP_TONE[membership.data.membership.estado]}
            />
          </View>
          <Divider />
          <Row icon="flag-outline" label="Vence" value={formatDate(membership.data.membership.venceEl)} />
          <Row
            icon="hourglass-outline"
            label="Días restantes"
            value={
              membership.data.membership.venceHoy
                ? 'Vence hoy'
                : `${membership.data.membership.diasRestantes}`
            }
          />
        </Card>
      ) : (
        <EmptyState
          icon="card-outline"
          message="Aún no tienes una membresía registrada. Consulta en recepción para activarla."
          title="Sin membresía activa"
        />
      )}
    </Section>
  );

  const routineSection = (
    <Section icon="clipboard-outline" index={3} title="Rutina asignada">
      {assignments.isPending ? (
        <Skeleton height={90} />
      ) : assignments.isError ? (
        <ErrorState error={assignments.error} onRetry={() => void assignments.refetch()} />
      ) : activeAssignment ? (
        <Card>
          <Text style={{ color: colors.text, fontSize: fontSizes.md, fontWeight: '700' }}>
            {activeAssignment.rutina?.nombre ?? 'Rutina asignada'}
          </Text>
          {activeAssignment.rutina?.descripcion ? (
            <Text style={{ color: colors.textMuted, fontSize: fontSizes.sm, lineHeight: 20 }}>
              {activeAssignment.rutina.descripcion}
            </Text>
          ) : null}
          {activeAssignment.fechaProgramada ? (
            <Row icon="calendar-outline" label="Programada" value={formatDate(activeAssignment.fechaProgramada)} />
          ) : null}
          {activeAssignment.nota ? (
            // A coach note is prose, not a field: it reads left-aligned and
            // full width, never squeezed into a label/value row.
            <Text style={{ color: colors.text, fontSize: fontSizes.sm, lineHeight: 20 }}>
              {activeAssignment.nota}
            </Text>
          ) : null}
        </Card>
      ) : (
        <EmptyState
          icon="clipboard-outline"
          message="Cuando tu entrenador te asigne una rutina, aparecerá aquí."
          title="Sin rutina asignada"
        />
      )}
    </Section>
  );

  return (
    <ScrollScreen onRefresh={refresh} refreshing={refreshing}>
      <ScreenHeader
        subtitle={
          isStaff(principal?.role)
            ? 'El panel de staff vive en la versión web.'
            : 'Tu entrenamiento de un vistazo.'
        }
        title={`Hola, ${firstName}`}
      />

      {/* Antes que nada: si la membresía no está vigente, eso es lo que la
          persona necesita ver y resolver, no su carga semanal. */}
      {membership.data && !membership.data.membership?.vigenteHoy ? (
        <Section icon="lock-closed-outline" index={0} title="Tu acceso">
          <MembershipGate
            onRenew={() => router.push('/membership')}
            projection={membership.data}
          />
        </Section>
      ) : null}

      {sessions.some((session) => session.estado === 'EN_PROGRESO') ? (
        <Section icon="play-circle-outline" index={0} title="Ahora">
          <Card accent={colors.volt}>
            <Text
              style={{
                color: colors.text,
                fontSize: fontSizes.lg,
                fontWeight: semibold,
                letterSpacing: fontSizes.lg * -0.045,
              }}
            >
              Tienes una sesión abierta
            </Text>
            <Text style={{ color: colors.textMuted, fontSize: fontSizes.sm, lineHeight: 20 }}>
              Continúa donde lo dejaste y registra tus series.
            </Text>
            <Button
              label="Continuar entrenamiento"
              onPress={() => {
                const open = sessions.find((session) => session.estado === 'EN_PROGRESO');
                if (open) router.push({ pathname: '/workouts/[id]', params: { id: open.id } });
              }}
            />
          </Card>
        </Section>
      ) : null}

      {/* Two half-width cards on a tablet, where one full-width card would
          stretch a two-line summary across the whole screen. On a phone they
          stay stacked in the original reading order. */}
      {wide ? (
        <Columns>
          {membershipSection}
          {routineSection}
        </Columns>
      ) : (
        membershipSection
      )}

      {/* Tu evolución, no tu inventario.
          Antes esta sección contaba cosas —sesiones totales, finalizadas,
          cuándo fue la última—, que son hechos sobre la base de datos y no
          sobre la persona. Lo que alguien quiere saber al abrir la app es si
          está entrenando más que la semana pasada, si mantiene el hábito y qué
          parte del cuerpo lleva descuidada. Esas tres preguntas son las tres
          cifras, y las dos primeras llevan su comparación al lado, porque un
          número sin referencia no es progreso: es trivia. */}
      <Section icon="trending-up-outline" index={1} title="Tu evolución">
        {workouts.isPending ? (
          <Skeleton height={110} />
        ) : workouts.isError ? (
          <ErrorState error={workouts.error} onRetry={() => void workouts.refetch()} />
        ) : (
          <View style={{ gap: spacing.md }}>
            <TourTarget id="home.progress">
            <View style={{ flexDirection: 'row', gap: spacing.sm }}>
              <StatTile
                delta={overload}
                icon="barbell-outline"
                label="Carga esta semana"
                value={formatVolume(training.thisWeek.volumeKg)}
              />
              <StatTile
                icon="flame-outline"
                // «Semanas seguidas» se parte en dos líneas dentro del tile y
                // desalinea las tres cifras; «Racha» dice lo mismo en una.
                label="Racha semanal"
                value={`${training.streakWeeks}`}
              />
              <StatTile
                icon="calendar-outline"
                label="En 4 semanas"
                value={`${training.recentSessions}`}
              />
            </View>
            </TourTarget>

            <TourTarget id="home.muscles">
            <Card>
              <View
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: spacing.sm,
                }}
              >
                <Text style={{ color: colors.text, fontSize: fontSizes.sm, fontWeight: semibold }}>
                  Músculos de esta semana
                </Text>
                <Text style={{ color: colors.textMuted, fontSize: fontSizes.xs }}>
                  {`${training.thisWeek.sets} series`}
                </Text>
              </View>

              {training.thisWeek.muscles.length === 0 ? (
                <Text style={{ color: colors.textMuted, fontSize: fontSizes.sm, lineHeight: 20 }}>
                  Aún no has registrado series esta semana. Lo que entrenes aparecerá aquí
                  repartido por grupo muscular.
                </Text>
              ) : (
                // Barras proporcionales al grupo más trabajado, no al total: lo
                // que se está juzgando es el reparto —«llevo tres de pecho y
                // ninguna de pierna»—, y contra el total todas las barras
                // quedarían cortas y el desequilibrio, invisible.
                <View style={{ gap: spacing.md }}>
                  {training.thisWeek.muscles.slice(0, 5).map((muscle) => {
                    const top = training.thisWeek.muscles[0]?.sets ?? 1;
                    return (
                      <View key={muscle.name} style={{ gap: spacing.sm }}>
                        <View
                          style={{
                            flexDirection: 'row',
                            justifyContent: 'space-between',
                            gap: spacing.sm,
                          }}
                        >
                          <Text
                            numberOfLines={1}
                            style={{ color: colors.textMuted, fontSize: fontSizes.xs, flex: 1 }}
                          >
                            {muscle.name}
                          </Text>
                          <Text
                            style={{
                              color: colors.text,
                              fontSize: fontSizes.xs,
                              fontWeight: semibold,
                              fontVariant: ['tabular-nums'],
                            }}
                          >
                            {muscle.sets}
                          </Text>
                        </View>
                        <View
                          style={{
                            height: 8,
                            borderRadius: radii.full,
                            backgroundColor: colors.surfaceHigh,
                            overflow: 'hidden',
                          }}
                        >
                          <View
                            style={{
                              height: '100%',
                              width: `${Math.max(6, (muscle.sets / top) * 100)}%`,
                              borderRadius: radii.full,
                              backgroundColor: accentPolicy.glyph,
                            }}
                          />
                        </View>
                      </View>
                    );
                  })}
                </View>
              )}
            </Card>
            </TourTarget>
          </View>
        )}
      </Section>

      <Section icon="stats-chart-outline" index={2} title="Actividad">
        {workouts.isPending ? (
          <Skeleton height={92} />
        ) : workouts.isError ? (
          <ErrorState error={workouts.error} onRetry={() => void workouts.refetch()} />
        ) : (
          <View style={{ flexDirection: 'row', gap: spacing.sm }}>
            <StatTile icon="list-outline" label="Sesiones" value={`${workouts.data?.total ?? 0}`} />
            <StatTile
              icon="checkmark-done-outline"
              label="Finalizadas"
              value={`${finished.length}`}
            />
            <StatTile
              icon="time-outline"
              label="Última"
              value={sessions[0] ? relativeDay(sessions[0].fechaInicio) : '—'}
            />
          </View>
        )}
      </Section>

      {wide ? null : routineSection}

      <Section icon="barbell-outline" index={4} title="Últimas sesiones">
        {workouts.isPending ? (
          <Skeleton height={140} />
        ) : sessions.length === 0 ? (
          <EmptyState
            icon="barbell-outline"
            message="Registra tu primera sesión desde la web y la verás aquí."
            title="Todavía sin sesiones"
          />
        ) : (
          <Card>
            {sessions.map((session, index) => {
              const duration = formatDuration(session.fechaInicio, session.fechaFin);
              const startTime = formatTimeOfDay(session.fechaInicio);
              return (
                <View key={session.id} style={{ gap: spacing.sm }}>
                  {index > 0 ? <Divider /> : null}
                  <View
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      gap: spacing.sm,
                      paddingVertical: spacing.xs / 2,
                    }}
                  >
                    <Ionicons
                      accessibilityElementsHidden
                      color={colors.textMuted}
                      importantForAccessibility="no-hide-descendants"
                      name="barbell-outline"
                      size={iconSizes.md}
                    />
                    <View style={{ flex: 1, gap: 2 }}>
                      <Text style={{ color: colors.text, fontSize: fontSizes.sm, fontWeight: semibold }}>
                        {relativeDay(session.fechaInicio)}
                        {startTime ? (
                          <Text style={{ color: colors.textMuted, fontWeight: '400' }}>
                            {`  ${startTime}`}
                          </Text>
                        ) : null}
                      </Text>
                      <Text style={{ color: colors.textMuted, fontSize: fontSizes.xs }}>
                        {session.ejercicios.length}{' '}
                        {session.ejercicios.length === 1 ? 'ejercicio' : 'ejercicios'}
                        {duration ? ` · ${duration}` : ''}
                      </Text>
                    </View>
                    <Badge
                      label={WORKOUT_LABEL[session.estado]}
                      tone={WORKOUT_TONE[session.estado]}
                    />
                  </View>
                </View>
              );
            })}
          </Card>
        )}
      </Section>
    </ScrollScreen>
  );
}
