import { Ionicons } from '@expo/vector-icons';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { LeaderboardSortBy } from '@gymsheet/schemas';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { progressionService } from '@/api/services';
import { BackLink } from '@/components/nav';
import { ErrorState, Skeleton } from '@/components/feedback';
import {
  Card,
  ScreenHeader,
  ScrollScreen,
  Section,
  StatTile,
  useResponsive,
} from '@/components/layout';
import {
  CelebrationModal,
  keyOf,
  useLevelUpCelebration,
  type CelebrationSubject,
} from '@/components/celebration';
import { BadgeTile, PathNode, RankHero } from '@/components/progression';
import { CountUpText } from '@/components/motion';
import { RankBadge } from '@/components/rank-badge';
import { useAuthStore } from '@/state/auth-store';
import { accentPolicy, colors, fontSizes, iconSizes, minTouchTarget, radii, semibold, spacing } from '@/theme';
import { pointRateChips } from '@gymsheet/domain';
import { PointsRulesSheet, usePointRules } from '@/components/points-rules-sheet';
import { RarityLegend } from '@/components/rarity-legend';
import { TourTarget, useScreenTour } from '@/components/tour';

/**
 * La senda: el camino hacia tu imagen ideal.
 *
 * El orden de la pantalla es el del relato, y no es casual:
 *
 * 1. **Quién eres ahora** y cuánto falta para lo siguiente. Es lo que se viene a
 *    ver, así que va sin desplazar.
 * 2. **Lo recién conseguido**, si lo hay. Aparece una sola vez: al mostrarse se
 *    confirma al servidor, y en la siguiente visita ya no es novedad.
 * 3. **El camino entero**, con los ocho hitos. Los pendientes se ven: un camino
 *    con la meta tapada no tira de nadie.
 * 4. **Lo que suma**, las cifras que mueven los puntos.
 * 5. **Días de descanso**, justo después: son la excepción a la racha que
 *    acaba de mostrarse, así que van pegados a ella.
 * 6. **Las insignias**, primero las conseguidas.
 * 7. **La clasificación** del gimnasio, al final: es contexto, no el objetivo.
 *
 * Ni un solo nombre de rango está escrito aquí. Todo llega del servidor, porque
 * el catálogo lo administra el gimnasio.
 */
const WEEKDAY_LABELS: ReadonlyArray<{ value: number; short: string }> = [
  { value: 1, short: 'L' },
  { value: 2, short: 'M' },
  { value: 3, short: 'X' },
  { value: 4, short: 'J' },
  { value: 5, short: 'V' },
  { value: 6, short: 'S' },
  { value: 7, short: 'D' },
];

export default function TrayectoriaScreen() {
  const { wide } = useResponsive();
  const queryClient = useQueryClient();

  const progression = useQuery({
    queryKey: ['progression', 'me'],
    queryFn: () => progressionService.get(),
  });
  const [leaderboardSort, setLeaderboardSort] = useState<LeaderboardSortBy>('points');

  // La explicación de los puntos: la hoja y las tarifas de los chips salen de
  // las mismas reglas publicadas por el servidor.
  const [rulesOpen, setRulesOpen] = useState(false);
  const rules = usePointRules();
  useScreenTour('trayectoria');
  const leaderboard = useQuery({
    queryKey: ['progression', 'leaderboard', leaderboardSort],
    queryFn: () => progressionService.leaderboard(5, leaderboardSort),
  });
  const restDays = useQuery({
    queryKey: ['progression', 'rest-days'],
    queryFn: () => progressionService.getRestDays(),
  });
  const setRestDays = useMutation({
    mutationFn: (weekdays: number[]) => progressionService.setRestDays(weekdays),
    onSuccess: (result) => {
      queryClient.setQueryData(['progression', 'rest-days'], result);
    },
  });

  const acknowledge = useMutation({
    mutationFn: () => progressionService.acknowledge(),
  });

  const data = progression.data;
  const unlockedNow = data?.unlockedNow ?? [];
  /**
   * Lo pendiente de celebrar: lo otorgado en esta misma lectura y lo que ya se
   * otorgó al cerrar una sesión pero sigue sin verse (`isNew`). Sin lo segundo,
   * una insignia que se saltó en el resumen de sesión no volvería a abrirse:
   * al entrar aquí `unlockedNow` ya llega vacío.
   */
  const pendingBadges = [
    ...unlockedNow,
    ...(data?.badges ?? []).filter(
      (badge) =>
        badge.earned && badge.isNew && !unlockedNow.some((fresh) => fresh.code === badge.code),
    ),
  ];

  /**
   * Se confirma en cuanto la celebración está en pantalla, no al salir: si el
   * usuario cierra la aplicación desde aquí, ya la ha visto, y volver a
   * celebrarla mañana la convertiría en ruido.
   *
   * `acknowledge.mutate` se omite de las dependencias a propósito: react-query
   * devuelve una función nueva en cada render y el efecto se dispararía en
   * bucle. Lo que debe disparar el efecto es que aparezcan novedades.
   */
  const newlyEarnedCount = pendingBadges.length;
  useEffect(() => {
    if (newlyEarnedCount > 0) acknowledge.mutate();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [newlyEarnedCount]);

  const refresh = () => {
    void progression.refetch();
    void leaderboard.refetch();
  };

  // Conseguidas primero: el muro de trofeos es lo que da la sensación de
  // avance. Dentro de cada mitad se respeta el orden del catálogo, que es el
  // que el gimnasio decidió.
  const badges = useMemo(() => {
    const all = data?.badges ?? [];
    return [...all.filter((badge) => badge.earned), ...all.filter((badge) => !badge.earned)];
  }, [data?.badges]);

  const earnedCount = badges.filter((badge) => badge.earned).length;

  /**
   * La cola de cartas en pantalla, o vacía.
   *
   * Lo nuevo se abre solo, una sola vez: las insignias de `unlockedNow` y el
   * ascenso recién detectado. Es un premio que llega cuando se gana, no un modal
   * que interrumpe. Revisitar una insignia o el rango sigue esperando a un toque.
   */
  const [celebrationQueue, setCelebrationQueue] = useState<CelebrationSubject[]>([]);
  const setCelebration = (subject: CelebrationSubject) => setCelebrationQueue([subject]);

  const principal = useAuthStore((state) => state.principal);
  // El ascenso de rango se deduce en el cliente porque el contrato no lo trae;
  // el porqué, y qué haría falta en el servidor, está en `useLevelUpCelebration`.
  const { pendingLevel, dismissLevelUp } = useLevelUpCelebration(
    data?.level ?? null,
    principal?.id ?? null,
  );

  /** Lo ya abierto solo en esta visita, para no volver a lanzarlo al refrescar. */
  const autoOpened = useRef(new Set<string>());
  const freshSignature = [
    ...pendingBadges.map((badge) => `badge:${badge.code}`),
    pendingLevel ? `level:${pendingLevel.code}` : '',
  ].join('|');
  useEffect(() => {
    const fresh: CelebrationSubject[] = [
      ...pendingBadges.map((badge): CelebrationSubject => ({ kind: 'badge', badge, fresh: true })),
      // El rango va el último: es lo más grande y cierra la cola.
      ...(pendingLevel ? [{ kind: 'level', level: pendingLevel, fresh: true } as CelebrationSubject] : []),
    ].filter((subject) => !autoOpened.current.has(keyOf(subject)));
    if (fresh.length === 0) return;
    fresh.forEach((subject) => autoOpened.current.add(keyOf(subject)));
    setCelebrationQueue((current) => [...current, ...fresh]);
    // Lo que debe dispararlo es que aparezcan novedades, no cada objeto nuevo
    // que devuelve react-query.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [freshSignature]);

  const closeCelebration = () => {
    // Sólo el ascenso se da por visto; cerrar la carta de una insignia no debe
    // tragarse el aviso de rango nuevo que aún no se ha abierto.
    if (celebrationQueue.some((subject) => subject.kind === 'level')) dismissLevelUp();
    setCelebrationQueue([]);
  };

  if (progression.isPending) {
    return (
      <ScrollScreen>
        <BackLink />
        <ScreenHeader subtitle="Tu camino hacia la imagen que buscas." title="Tu senda" />
        <Skeleton height={200} />
        <Skeleton height={320} />
      </ScrollScreen>
    );
  }

  if (progression.isError || !data) {
    return (
      <ScrollScreen>
        <BackLink />
        <ScreenHeader subtitle="Tu camino hacia la imagen que buscas." title="Tu senda" />
        <ErrorState error={progression.error} onRetry={() => void progression.refetch()} />
      </ScrollScreen>
    );
  }

  const stats = data.stats;
  const chips = rules.data ? pointRateChips(rules.data) : undefined;
  const restDayCount = restDays.data?.weekdays.length ?? 0;
  // Se saca a una constante para que el estrechamiento sobreviva dentro del
  // callback: TypeScript no conserva el `!== null` de un acceso a propiedad al
  // cruzar una función.
  const currentLevel = data.level;

  return (
    <>
      <ScrollScreen onRefresh={refresh} refreshing={progression.isFetching}>
        <BackLink />
        <ScreenHeader
          subtitle={
            data.level
              ? `Vas por ${data.level.name}. Sigue subiendo.`
              : `Termina tu primer entreno: +${rules.data?.perSession ?? 50} puntos y tu primera insignia.`
          }
          title="Tu senda"
          tourKey="trayectoria"
        />

        <TourTarget id="trayectoria.rank">
        <RankHero
          contarPuntos
          level={data.level}
          levelProgress={data.levelProgress}
          nextLevel={data.nextLevel}
          onPress={
            currentLevel ? () => setCelebration({ kind: 'level', level: currentLevel }) : undefined
          }
          points={data.points}
          pointsToNextLevel={data.pointsToNextLevel}
        />
        </TourTarget>

        <Pressable
          accessibilityLabel="Cómo se ganan los puntos"
          accessibilityRole="button"
          onPress={() => setRulesOpen(true)}
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            gap: spacing.xs,
            alignSelf: 'flex-start',
            minHeight: minTouchTarget,
          }}
        >
          <Ionicons color={accentPolicy.ink} name="information-circle-outline" size={iconSizes.md} />
          <Text style={{ color: accentPolicy.ink, fontSize: fontSizes.sm, fontWeight: semibold }}>
            ¿Cómo se ganan los puntos?
          </Text>
        </Pressable>

        {pendingLevel ? (
          // El aviso del ascenso, no el ascenso. La celebración sigue abriéndose
          // con un toque; esto sólo dice que hay una esperando, porque un rango
          // nuevo en la cabecera se confunde con el de siempre.
          <Card
            accent={colors.volt}
            accessibilityLabel={`Has subido a ${pendingLevel.name}. Toca para ver tu carta de rango`}
            onPress={() => setCelebration({ kind: 'level', level: pendingLevel })}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md }}>
              <Ionicons color={accentPolicy.ink} name="sparkles" size={iconSizes.lg} />
              <View style={{ flex: 1, gap: 2 }}>
                <Text style={{ color: colors.text, fontSize: fontSizes.md, fontWeight: semibold }}>
                  {`Has subido a ${pendingLevel.name}`}
                </Text>
                <Text style={{ color: colors.textMuted, fontSize: fontSizes.xs }}>
                  Toca para ver tu carta de rango
                </Text>
              </View>
              <Ionicons color={colors.textMuted} name="chevron-forward" size={iconSizes.md} />
            </View>
          </Card>
        ) : null}

        {unlockedNow.length > 0 ? (
          <Section icon="sparkles-outline" index={0} title="Acabas de desbloquear">
            <View style={{ gap: spacing.sm }}>
              {unlockedNow.map((badge) => (
                <BadgeTile
                  badge={badge}
                  key={badge.code}
                  onPress={() => setCelebration({ kind: 'badge', badge })}
                />
              ))}
            </View>
          </Section>
        ) : null}

        <TourTarget id="trayectoria.path">
        <Section icon="trail-sign-outline" index={1} title="El camino">
          <Card style={{ paddingBottom: spacing.xs }}>
            {data.path.map((level, index) => (
              <PathNode
                isLast={index === data.path.length - 1}
                key={level.code}
                level={level}
                points={data.points}
              />
            ))}
          </Card>
        </Section>
        </TourTarget>

        <Section icon="stats-chart-outline" index={2} title="Lo que suma">
          <Text style={{ color: colors.textMuted, fontSize: fontSizes.xs, lineHeight: 18 }}>
            Las cifras con tarifa son las que te dan puntos.
          </Text>
          {/* Parejas en fila, no `Columns`: en teléfono `Columns` apila y la
              sección ocupaba dos pantallas. Primero las cuatro cifras que suman,
              cada una con su tarifa; después las que solo informan. La racha que
              paga es la más larga, así que va con chip; la actual, sin él. */}
          <View style={{ gap: spacing.sm }}>
            <View style={{ flexDirection: 'row', gap: spacing.sm }}>
              <StatTile
                icon="barbell-outline"
                label="Entrenamientos"
                rate={chips?.session}
                value={`${stats.totalSessions}`}
              />
              <StatTile
                icon="layers-outline"
                label="Series"
                rate={chips?.sets}
                value={stats.totalSets.toLocaleString('es-ES')}
              />
            </View>
            <View style={{ flexDirection: 'row', gap: spacing.sm }}>
              <StatTile
                icon="scale-outline"
                label="Volumen total"
                rate={chips?.volume}
                value={`${Math.round(stats.totalVolumeKg / 1000).toLocaleString('es-ES')} t`}
              />
              <StatTile
                icon="trophy-outline"
                label="Racha más larga"
                rate={chips?.streak}
                value={
                  stats.longestStreakDays > 0
                    ? `${stats.longestStreakDays} ${stats.longestStreakDays === 1 ? 'día' : 'días'}`
                    : '—'
                }
              />
            </View>
            <View style={{ flexDirection: 'row', gap: spacing.sm }}>
              <StatTile
                icon="flame-outline"
                label="Racha actual"
                value={
                  stats.currentStreakDays > 0
                    ? `${stats.currentStreakDays} ${stats.currentStreakDays === 1 ? 'día' : 'días'}`
                    : '—'
                }
              />
              <StatTile
                icon="calendar-outline"
                label="Semanas seguidas"
                value={`${stats.weeklyStreak}`}
              />
            </View>
            <View style={{ flexDirection: 'row', gap: spacing.sm }}>
              <StatTile
                icon="trending-up-outline"
                label="Récords batidos"
                value={`${stats.personalRecords}`}
              />
              <StatTile
                icon="body-outline"
                label="Grupos trabajados"
                value={`${stats.distinctMuscleGroups}`}
              />
            </View>
          </View>
          {stats.currentStreakDays === 0 && stats.totalSessions > 0 ? (
            // Una racha rota es un hecho, no un reproche: el texto invita a
            // empezar otra hoy y no menciona el fallo.
            <Text style={{ color: colors.textMuted, fontSize: fontSizes.xs, lineHeight: 18 }}>
              Tu racha está en cero. Un entrenamiento hoy y vuelve a contar.
            </Text>
          ) : null}
        </Section>

        <Section icon="bed-outline" index={3} title="Días de descanso">
          <Text style={{ color: colors.textMuted, fontSize: fontSizes.xs, lineHeight: 18 }}>
            {restDayCount >= 6
              ? 'Los días marcados no rompen tu racha. Ya tienes seis. El séptimo no se puede marcar: sin ningún día de entreno, la racha dejaría de significar algo.'
              : 'Los días marcados no rompen tu racha.'}
          </Text>
          <View style={{ flexDirection: 'row', gap: spacing.sm, marginTop: spacing.sm }}>
            {WEEKDAY_LABELS.map((day) => {
              const active = (restDays.data?.weekdays ?? []).includes(day.value);
              return (
                <Pressable
                  disabled={setRestDays.isPending}
                  key={day.value}
                  onPress={() => {
                    const current = restDays.data?.weekdays ?? [];
                    // Los siete días dejarían la racha imposible de romper; el
                    // backend lo rechaza, esto solo evita mostrar ese error.
                    if (!active && current.length >= 6) return;
                    const next = active
                      ? current.filter((value) => value !== day.value)
                      : [...current, day.value];
                    setRestDays.mutate(next);
                  }}
                  style={{
                    width: 36,
                    height: 36,
                    borderRadius: radii.full,
                    alignItems: 'center',
                    justifyContent: 'center',
                    borderWidth: 1,
                    borderColor: active ? colors.volt : colors.border,
                    backgroundColor: active ? colors.volt : 'transparent',
                  }}
                >
                  <Text
                    style={{
                      color: active ? colors.background : colors.textMuted,
                      fontSize: fontSizes.sm,
                      fontWeight: semibold,
                    }}
                  >
                    {day.short}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </Section>

        <TourTarget id="trayectoria.badges">
        <Section icon="ribbon-outline" index={4} title={`Insignias · ${earnedCount}/${badges.length}`}>
          <RarityLegend />
          <View
            style={{
              gap: spacing.sm,
              // En tableta caben dos por fila; en teléfono una insignia a media
              // anchura deja el texto de descripción en cuatro palabras por línea.
              flexDirection: wide ? 'row' : 'column',
              flexWrap: wide ? 'wrap' : 'nowrap',
            }}
          >
            {badges.map((badge) => (
              <View key={badge.code} style={wide ? { flexBasis: '48%', flexGrow: 1 } : undefined}>
                <BadgeTile
                  badge={badge}
                  // Sólo las conseguidas se celebran. Una pendiente que se abriera
                  // enseñaría una luz cenital sobre algo que todavía no es tuyo.
                  onPress={
                    badge.earned ? () => setCelebration({ kind: 'badge', badge }) : undefined
                  }
                />
              </View>
            ))}
          </View>
        </Section>
        </TourTarget>

        <Section icon="podium-outline" index={5} title="Clasificación del gimnasio">
          <Text style={{ color: colors.textMuted, fontSize: fontSizes.xs, lineHeight: 18 }}>
            Los cinco primeros de tu gimnasio.
          </Text>
          <View
            style={{
              flexDirection: 'row',
              gap: spacing.xs,
              backgroundColor: colors.surfaceHigh,
              borderRadius: radii.full,
              padding: 4,
              alignSelf: 'flex-start',
            }}
          >
            {(
              [
                { value: 'points' as const, label: 'Puntos' },
                { value: 'streak' as const, label: 'Racha' },
              ]
            ).map((option) => (
              <Pressable
                key={option.value}
                onPress={() => setLeaderboardSort(option.value)}
                style={{
                  paddingHorizontal: spacing.md,
                  paddingVertical: spacing.xs,
                  borderRadius: radii.full,
                  backgroundColor: leaderboardSort === option.value ? colors.volt : 'transparent',
                }}
              >
                <Text
                  style={{
                    fontSize: fontSizes.xs,
                    fontWeight: semibold,
                    color: leaderboardSort === option.value ? colors.background : colors.textMuted,
                  }}
                >
                  {option.label}
                </Text>
              </Pressable>
            ))}
          </View>
          {leaderboard.isPending ? (
            <Skeleton height={140} />
          ) : leaderboard.isError ? (
            <ErrorState error={leaderboard.error} onRetry={() => void leaderboard.refetch()} />
          ) : (
            <Card>
              {(leaderboard.data ?? []).map((entry, index) => (
                <View
                  key={`${entry.position}-${entry.displayName}`}
                  style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md }}
                >
                  <RankBadge isMe={entry.isMe} position={entry.position} />
                  <Text
                    numberOfLines={1}
                    style={{
                      flex: 1,
                      color: entry.isMe ? colors.text : colors.textMuted,
                      fontSize: fontSizes.sm,
                      fontWeight: entry.isMe ? semibold : '400',
                    }}
                  >
                    {entry.displayName}
                    {entry.isMe ? ' · tú' : ''}
                  </Text>
                  {leaderboardSort === 'streak' ? (
                    <Text style={{ color: colors.textMuted, fontSize: fontSizes.sm, fontVariant: ['tabular-nums'] }}>
                      {`${entry.streakDays} ${entry.streakDays === 1 ? 'día' : 'días'}`}
                    </Text>
                  ) : (
                    <CountUpText
                      delayMs={index * 60}
                      style={{ color: colors.textMuted, fontSize: fontSizes.sm }}
                      value={entry.points}
                    />
                  )}
                </View>
              ))}
              {(leaderboard.data ?? []).length === 0 ? (
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
                  <Ionicons color={colors.textDisabled} name="podium-outline" size={iconSizes.md} />
                  <Text style={{ color: colors.textMuted, fontSize: fontSizes.sm, flex: 1 }}>
                    Todavía no hay nadie en la tabla. Entrena y sé el primero.
                  </Text>
                </View>
              ) : null}
            </Card>
          )}
        </Section>
      </ScrollScreen>

      <PointsRulesSheet
        badges={data.badges}
        onClose={() => setRulesOpen(false)}
        points={data.points}
        stats={stats}
        visible={rulesOpen}
      />

      <CelebrationModal onClose={closeCelebration} subjects={celebrationQueue} />
    </>
  );
}
