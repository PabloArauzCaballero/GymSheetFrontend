import { Ionicons } from '@expo/vector-icons';
import { groupBadgeChains, sortChainGroups } from '@gymsheet/domain';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { progressionService } from '@/api/services';
import {
  CelebrationModal,
  keyOf,
  progressionCelebrations,
  useLevelUpCelebration,
  type CelebrationSubject,
} from '@/components/celebration';
import { ErrorState, Skeleton } from '@/components/feedback';
import { Card, ScreenHeader, ScrollScreen, Section, useResponsive } from '@/components/layout';
import { BackLink } from '@/components/nav';
import { RankHero } from '@/components/progression';
import { BadgeChainTile, ChainSheet, type BadgeChain } from '@/components/progression/chains';
import { ChallengesList } from '@/components/progression/challenges';
import { LeaderboardSection } from '@/components/progression/leaderboard';
import { NearestList } from '@/components/progression/nearest';
import { PrizesSection } from '@/components/progression/prizes';
import { RestDaysSection } from '@/components/progression/rest-days';
import { StatsSection } from '@/components/progression/stats';
import { StreakCard } from '@/components/progression/streak';
import { PointsRulesSheet, usePointRules } from '@/components/points-rules-sheet';
import { RarityLegend } from '@/components/rarity-legend';
import { TourTarget, useScreenTour } from '@/components/tour';
import { ArenaTeaser } from '@/features/arena-road/arena-teaser';
import { useAuthStore } from '@/state/auth-store';
import { accentPolicy, colors, fontSizes, iconSizes, minTouchTarget, semibold, spacing } from '@/theme';

/**
 * La senda: el camino hacia tu imagen ideal, ordenada por **urgencia**.
 *
 * 1. **Quién eres ahora** y cuánto falta para lo siguiente, y **tu arena**:
 *    la puerta al camino de arenas (`/camino`).
 * 2. **Retos de la semana**: lo único que se puede hacer *ya*, con su cuenta
 *    atrás al lunes. Es lo que trae de vuelta (Zeigarnik).
 * 3. **Mis premios**: lo real que te llevas, con el código para recepción. Solo
 *    si el gimnasio da premios.
 * 4. **Racha y comodines**, con los días de descanso pegados: son la excepción.
 * 5. **Lo más cerca**: las insignias que casi tienes (gradiente de meta).
 * 6. **La colección**, agrupada en cadenas: una ficha por criterio.
 * 7. **Lo que suma** y **la clasificación**: contexto.
 *
 * Ni un solo nombre de rango, reto o premio está escrito aquí: todo llega del
 * servidor, porque el catálogo lo administra el gimnasio.
 */
export default function TrayectoriaScreen() {
  const { wide } = useResponsive();
  const queryClient = useQueryClient();

  const progression = useQuery({
    queryKey: ['progression', 'me'],
    queryFn: () => progressionService.get(),
  });

  // La explicación de los puntos: la hoja y las tarifas salen de las mismas
  // reglas publicadas por el servidor.
  const [rulesOpen, setRulesOpen] = useState(false);
  const rules = usePointRules();

  const acknowledge = useMutation({
    mutationFn: () => progressionService.acknowledge(),
  });

  const data = progression.data;
  const principal = useAuthStore((state) => state.principal);
  // El ascenso de rango se deduce en el cliente porque el contrato no lo trae;
  // el porqué, y qué haría falta en el servidor, está en `useLevelUpCelebration`.
  const { pendingLevel, dismissLevelUp } = useLevelUpCelebration(data?.level ?? null, principal?.id ?? null);

  /**
   * Lo pendiente de celebrar: insignias de esta lectura o aún `isNew`, retos y
   * semana redonda sin ver, premios nuevos y, al final, el rango. Ya en orden
   * pico-final (`progressionCelebrations`).
   */
  const pending = useMemo(
    () => (data ? progressionCelebrations(data, pendingLevel) : []),
    [data, pendingLevel],
  );
  const freshSignature = pending.map(keyOf).join('|');

  /**
   * Se confirma en cuanto la celebración está en pantalla, no al salir: si se
   * cierra la aplicación desde aquí, ya se ha visto. `acknowledge` limpia
   * insignias, retos, semana redonda y premios a la vez. El rango no pasa por
   * el servidor (lo anota `useLevelUpCelebration`).
   *
   * `acknowledge.mutate` se omite de las dependencias a propósito: react-query
   * devuelve una función nueva en cada render y el efecto se dispararía en bucle.
   */
  const serverNews = pending.filter((subject) => subject.kind !== 'level').length;
  useEffect(() => {
    if (serverNews > 0) acknowledge.mutate();
  }, [serverNews]);

  /**
   * La cola de cartas en pantalla, o vacía. Lo nuevo se abre solo, una sola
   * vez; revisitar una insignia, un premio o el rango espera a un toque.
   */
  const [celebrationQueue, setCelebrationQueue] = useState<CelebrationSubject[]>([]);
  // La carta y el tutorial son Modal: dos a la vez dejan a iOS con uno que no
  // llega a presentarse. El tutorial espera a que la cola esté vacía.
  const [openChain, setOpenChain] = useState<BadgeChain | null>(null);
  useScreenTour('trayectoria', celebrationQueue.length === 0 && openChain === null);
  const setCelebration = (subject: CelebrationSubject) => setCelebrationQueue([subject]);

  /** Lo ya abierto solo en esta visita, para no volver a lanzarlo al refrescar. */
  const autoOpened = useRef(new Set<string>());
  useEffect(() => {
    const fresh = pending.filter((subject) => !autoOpened.current.has(keyOf(subject)));
    if (fresh.length === 0) return;
    fresh.forEach((subject) => autoOpened.current.add(keyOf(subject)));
    setCelebrationQueue((current) => [...current, ...fresh]);
    // Lo que debe dispararlo es que aparezcan novedades, no cada objeto nuevo
    // que devuelve react-query.
  }, [freshSignature]);

  const closeCelebration = () => {
    // Solo el ascenso se da por visto; cerrar la carta de una insignia no debe
    // tragarse el aviso de rango nuevo que aún no se ha abierto.
    if (celebrationQueue.some((subject) => subject.kind === 'level')) dismissLevelUp();
    setCelebrationQueue([]);
  };

  // La colección en cadenas: una ficha por criterio, las empezadas primero.
  const chains = useMemo(() => sortChainGroups(groupBadgeChains(data?.badges ?? [])), [data?.badges]);
  const earnedCount = (data?.badges ?? []).filter((badge) => badge.earned).length;

  const refresh = () => {
    void progression.refetch();
    void queryClient.invalidateQueries({ queryKey: ['progression', 'leaderboard'] });
  };

  if (progression.isPending) {
    return (
      <ScrollScreen>
        <BackLink />
        <ScreenHeader subtitle="Tu camino hacia la imagen que buscas." title="Tu senda" />
        <Skeleton height={200} />
        <Skeleton height={260} />
        <Skeleton height={160} />
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

  // Constante para que el estrechamiento sobreviva dentro del callback.
  const currentLevel = data.level;
  const week = data.challenges;
  const nearest = data.nearest.filter((badge) => !badge.earned);

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
            onPress={currentLevel ? () => setCelebration({ kind: 'level', level: currentLevel }) : undefined}
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

        <TourTarget id="trayectoria.path">
          <Section icon="trail-sign-outline" title="El camino">
            <ArenaTeaser path={data.path} points={data.points} />
          </Section>
        </TourTarget>

        {pendingLevel ? (
          // El aviso del ascenso, no el ascenso: un rango nuevo en la cabecera
          // se confunde con el de siempre.
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
                <Text style={{ color: colors.textMuted, fontSize: fontSizes.xs }}>Toca para ver tu carta de rango</Text>
              </View>
              <Ionicons color={colors.textMuted} name="chevron-forward" size={iconSizes.md} />
            </View>
          </Card>
        ) : null}

        {week && week.items.length > 0 ? (
          <TourTarget id="trayectoria.challenges">
            <Section icon="flag-outline" title="Retos de la semana">
              <ChallengesList
                onOpen={(challenge) => setCelebration({ kind: 'challenge', challenge, fresh: false })}
                week={week}
              />
            </Section>
          </TourTarget>
        ) : null}

        <PrizesSection onOpen={(prize) => setCelebration({ kind: 'prize', prize, fresh: false })} prizes={data.prizes} />

        {data.streak ? (
          <Section icon="flame-outline" title="Tu racha">
            <StreakCard rules={rules.data} streak={data.streak} />
          </Section>
        ) : null}

        <RestDaysSection />

        {nearest.length > 0 ? (
          <Section icon="locate-outline" title="Lo más cerca">
            <Card>
              <NearestList badges={nearest} />
            </Card>
          </Section>
        ) : null}

        <TourTarget id="trayectoria.badges">
          <Section icon="ribbon-outline" title={`Colección · ${earnedCount}/${data.badges.length}`}>
            <RarityLegend />
            <View
              style={{
                gap: spacing.sm,
                // En tableta caben dos por fila; en teléfono una ficha a media
                // anchura deja la descripción en cuatro palabras por línea.
                flexDirection: wide ? 'row' : 'column',
                flexWrap: wide ? 'wrap' : 'nowrap',
              }}
            >
              {chains.map((chain) => (
                <View key={chain.key} style={wide ? { flexBasis: '48%', flexGrow: 1 } : undefined}>
                  <BadgeChainTile
                    chain={chain}
                    onCelebrate={(badge) => setCelebration({ kind: 'badge', badge })}
                    onOpenChain={setOpenChain}
                  />
                </View>
              ))}
            </View>
          </Section>
        </TourTarget>

        <StatsSection rules={rules.data} stats={data.stats} streakShown={Boolean(data.streak)} />

        <LeaderboardSection />
      </ScrollScreen>

      <PointsRulesSheet
        badges={data.badges}
        onClose={() => setRulesOpen(false)}
        points={data.points}
        stats={data.stats}
        visible={rulesOpen}
      />

      <ChainSheet
        chain={openChain}
        onCelebrate={(badge) => setCelebration({ kind: 'badge', badge })}
        onClose={() => setOpenChain(null)}
      />

      <CelebrationModal onClose={closeCelebration} subjects={celebrationQueue} />
    </>
  );
}
