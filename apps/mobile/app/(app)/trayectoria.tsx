import { Ionicons } from '@expo/vector-icons';
import { useMutation, useQuery } from '@tanstack/react-query';
import { useEffect, useMemo } from 'react';
import { Text, View } from 'react-native';
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
import { BadgeTile, PathNode, RankHero } from '@/components/progression';
import { colors, fontSizes, iconSizes, radii, semibold, spacing } from '@/theme';

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
 * 5. **Las insignias**, primero las conseguidas.
 * 6. **La clasificación** del gimnasio, al final: es contexto, no el objetivo.
 *
 * Ni un solo nombre de rango está escrito aquí. Todo llega del servidor, porque
 * el catálogo lo administra el gimnasio.
 */
export default function TrayectoriaScreen() {
  const { wide } = useResponsive();

  const progression = useQuery({
    queryKey: ['progression', 'me'],
    queryFn: () => progressionService.get(),
  });
  const leaderboard = useQuery({
    queryKey: ['progression', 'leaderboard'],
    queryFn: () => progressionService.leaderboard(5),
  });

  const acknowledge = useMutation({
    mutationFn: () => progressionService.acknowledge(),
  });

  const data = progression.data;
  const unlockedNow = data?.unlockedNow ?? [];

  /**
   * Se confirma en cuanto la celebración está en pantalla, no al salir: si el
   * usuario cierra la aplicación desde aquí, ya la ha visto, y volver a
   * celebrarla mañana la convertiría en ruido.
   *
   * `acknowledge.mutate` se omite de las dependencias a propósito: react-query
   * devuelve una función nueva en cada render y el efecto se dispararía en
   * bucle. Lo que debe disparar el efecto es que aparezcan novedades.
   */
  const newlyEarnedCount = unlockedNow.length;
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

  return (
    <ScrollScreen onRefresh={refresh} refreshing={progression.isFetching}>
      <BackLink />
      <ScreenHeader
        subtitle={
          data.level
            ? `Vas por ${data.level.name}. Sigue subiendo.`
            : 'Registra tu primer entrenamiento y la senda empieza.'
        }
        title="Tu senda"
      />

      <RankHero
        level={data.level}
        levelProgress={data.levelProgress}
        nextLevel={data.nextLevel}
        points={data.points}
        pointsToNextLevel={data.pointsToNextLevel}
      />

      {unlockedNow.length > 0 ? (
        <Section icon="sparkles-outline" index={0} title="Acabas de desbloquear">
          <View style={{ gap: spacing.sm }}>
            {unlockedNow.map((badge) => (
              <BadgeTile badge={badge} key={badge.code} />
            ))}
          </View>
        </Section>
      ) : null}

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

      <Section icon="stats-chart-outline" index={2} title="Lo que suma">
        {/* Parejas en fila, no `Columns`.
            `Columns` apila en teléfono y deja seis tarjetas una debajo de otra:
            la sección ocupaba dos pantallas para seis números de dos dígitos.
            En pareja caben igual de holgadas y la sección se lee de un vistazo,
            que es justo para lo que existe. Es la misma disposición que usa
            Inicio para sus cifras. */}
        <View style={{ gap: spacing.sm }}>
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
            <StatTile icon="barbell-outline" label="Entrenamientos" value={`${stats.totalSessions}`} />
            <StatTile
              icon="scale-outline"
              label="Volumen total"
              value={`${Math.round(stats.totalVolumeKg / 1000).toLocaleString('es-ES')} t`}
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

      <Section icon="ribbon-outline" index={3} title={`Insignias · ${earnedCount}/${badges.length}`}>
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
              <BadgeTile badge={badge} />
            </View>
          ))}
        </View>
      </Section>

      <Section icon="podium-outline" index={4} title="Clasificación del gimnasio">
        {leaderboard.isPending ? (
          <Skeleton height={140} />
        ) : leaderboard.isError ? (
          <ErrorState error={leaderboard.error} onRetry={() => void leaderboard.refetch()} />
        ) : (
          <Card>
            {(leaderboard.data ?? []).map((entry) => (
              <View
                key={`${entry.position}-${entry.displayName}`}
                style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md }}
              >
                <View
                  style={{
                    width: 28,
                    height: 28,
                    borderRadius: radii.full,
                    alignItems: 'center',
                    justifyContent: 'center',
                    backgroundColor: entry.isMe ? colors.volt : colors.surfaceHigh,
                  }}
                >
                  <Text
                    style={{
                      color: entry.isMe ? colors.background : colors.textMuted,
                      fontSize: fontSizes.xs,
                      fontWeight: semibold,
                    }}
                  >
                    {entry.position}
                  </Text>
                </View>
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
                <Text style={{ color: colors.textMuted, fontSize: fontSizes.sm }}>
                  {entry.points.toLocaleString('es-ES')}
                </Text>
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
  );
}
