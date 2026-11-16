import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from 'react-native';
import { SvgXml } from 'react-native-svg';
import { mascotXml } from '@gymsheet/design-tokens/repi';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { Ionicons } from '@expo/vector-icons';
import { ReppLogo } from '@/components/brand/repp-mark';
import { Gesture } from 'react-native-gesture-handler';
import {
  Easing,
  cancelAnimation,
  runOnJS,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import type { GymDirectoryEntry, SwipeDirection, PublicBranchSummary } from '@gymsheet/schemas';
import { ApiError } from '@gymsheet/api-client';
import { discoveryDeckGate, needsDiscoveryPreferences } from '@gymsheet/domain';
import { trainingGoals } from '@gymsheet/types';
import {
  chatService,
  discoveryService,
  facilitiesService,
  profilePhotosService,
  profileService,
  socialService,
} from '@/api/services';
import { refreshSocialRelationship } from '@/api/social-cache';
import { CommunityOverflowSheet } from '@/components/community-overflow-sheet';
import { TopGymModal } from '@/components/top-gym-sheet';
import { ProfileDetailSheet } from '@/components/profile-detail-sheet';
import { useScreenTour } from '@/components/tour';
import { Section } from '@/components/layout';
import { PressableScale } from '@/components/motion';
import { Button } from '@/components/ui';
import { ErrorState } from '@/components/feedback';
import { DiscoveryPreferencesEditor } from '@/components/social-status-editor';
import { initialsOf } from '@/lib/format';
import { DeckActionBar, ACTION_BAR_BOTTOM } from '@/features/comunidad/deck-action-bar';
import { DeckStage } from '@/features/comunidad/deck-stage';
import { notify } from '@/notifications';
import { useAuthStore } from '@/state/auth-store';
import { TRAINING_GOAL_LABEL } from '@/lib/social-labels';
import { alpha, colors, fontSizes, iconSizes, ink, minTouchTarget, onMedia, overlay, radii, spacing } from '@/theme';

const DECK_SIZE = 15;
const DECISION_RATIO = 0.28;
const FLING_VELOCITY = 900;
const MAX_ROTATION_DEG = 12;
const EXIT_MS = 220;
const CARD_SPRING = { damping: 24, stiffness: 260, mass: 0.6, overshootClamping: true } as const;
const BACK_ZONE_RATIO = 1 / 3;
const TAP_MAX_MS = 260;
const MATCH_SCRIM = [overlay.scrimSoft, overlay.scrimStrong] as const;

type Decision = { entry: GymDirectoryEntry; direction: SwipeDirection; filterKey: string };

const GOAL_ICON: Record<string, keyof typeof Ionicons.glyphMap> = {
  HIPERTROFIA: 'barbell-outline',
  FUERZA: 'flash-outline',
  RESISTENCIA: 'infinite-outline',
  PERDIDA_GRASA: 'flame-outline',
  SALUD_GENERAL: 'heart-outline',
  RENDIMIENTO_DEPORTIVO: 'trophy-outline',
  REHABILITACION: 'medkit-outline',
};

function FilterChip({
  label,
  icon,
  active,
  onPress,
}: {
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  active: boolean;
  onPress: () => void;
}) {
  return (
    <PressableScale
      accessibilityLabel={label}
      onPress={onPress}
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        paddingHorizontal: spacing.md,
        paddingVertical: 8,
        borderRadius: radii.full,
        borderWidth: active ? 1.5 : 1,
        borderColor: active ? colors.volt : colors.borderSubtle,
        backgroundColor: active ? alpha(colors.volt, 0.16) : colors.surfaceHigh,
      }}
    >
      <Ionicons color={active ? colors.volt : colors.textMuted} name={icon} size={iconSizes.sm} />
      <Text
        style={{
          color: active ? colors.text : colors.textMuted,
          fontSize: fontSizes.sm,
          fontWeight: active ? '700' : '500',
        }}
      >
        {label}
      </Text>
      {active && (
        <Ionicons color={colors.volt} name="checkmark" size={14} style={{ marginLeft: 2 }} />
      )}
    </PressableScale>
  );
}

function SearchPreferencesSheet({
  visible,
  onClose,
  onOpenBlocked,
  filters,
  branches,
}: {
  visible: boolean;
  onOpenBlocked: () => void;
  onClose: () => void;
  filters: {
    objetivos?: string[];
    setObjetivos: (value: string[]) => void;
    sucursalId: string | null;
    setSucursalId: (value: string | null) => void;
    genero: string | null;
    setGenero: (value: string | null) => void;
  };
  branches: PublicBranchSummary[];
}) {
  const insets = useSafeAreaInsets();
  const { setObjetivos, sucursalId, setSucursalId, genero, setGenero } = filters;
  const objetivos = Array.isArray(filters?.objetivos) ? filters.objetivos : [];
  const hasActiveFilters = objetivos.length > 0 || sucursalId !== null || genero !== null;

  return (
    <Modal animationType="slide" onRequestClose={onClose} statusBarTranslucent transparent visible={visible}>
      <View style={{ flex: 1, justifyContent: 'flex-end', backgroundColor: overlay.scrim }}>
        <Pressable accessible={false} onPress={onClose} style={{ flex: 1 }} />

        <View
          accessibilityViewIsModal
          style={{
            maxHeight: '85%',
            borderTopLeftRadius: radii.xl,
            borderTopRightRadius: radii.xl,
            borderWidth: 1,
            borderColor: colors.borderSubtle,
            backgroundColor: colors.surfaceLow,
            paddingTop: spacing.sm,
            paddingHorizontal: spacing.lg,
            paddingBottom: Math.max(insets.bottom, spacing.md),
            gap: spacing.lg,
          }}
        >
          {/* iOS Grab Handle */}
          <View
            style={{
              width: 38,
              height: 4,
              borderRadius: 2,
              backgroundColor: alpha(ink.white, 0.25),
              alignSelf: 'center',
              marginBottom: 4,
            }}
          />

          {/* Header */}
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md }}>
            <View style={{ flex: 1, gap: 2 }}>
              <Text
                accessibilityRole="header"
                style={{ color: colors.text, fontSize: fontSizes.lg, fontWeight: '700', letterSpacing: -0.5 }}
              >
                Preferencias de búsqueda
              </Text>
              <Text style={{ color: colors.textMuted, fontSize: fontSizes.xs }}>
                {objetivos.length > 0
                  ? `${objetivos.length} ${objetivos.length === 1 ? 'objetivo seleccionado' : 'objetivos seleccionados'}`
                  : 'Explora deportistas con cualquier objetivo'}
              </Text>
            </View>

            {hasActiveFilters ? (
              <PressableScale
                onPress={() => {
                  setObjetivos([]);
                  setSucursalId(null);
                  setGenero(null);
                }}
                style={{
                  paddingHorizontal: spacing.sm,
                  paddingVertical: 6,
                  borderRadius: radii.full,
                  backgroundColor: alpha(colors.volt, 0.12),
                }}
              >
                <Text style={{ color: colors.accentInk, fontSize: fontSizes.xs, fontWeight: '700' }}>
                  Restablecer
                </Text>
              </PressableScale>
            ) : null}

            <Pressable
              accessibilityLabel="Cerrar"
              accessibilityRole="button"
              onPress={onClose}
              style={({ pressed }) => ({
                width: minTouchTarget,
                height: minTouchTarget,
                alignItems: 'center',
                justifyContent: 'center',
                borderRadius: radii.full,
                backgroundColor: colors.surfaceHigh,
                opacity: pressed ? 0.75 : 1,
              })}
            >
              <Ionicons color={colors.text} name="close" size={iconSizes.md} />
            </Pressable>
          </View>

          <Section icon="options-outline" title="Objetivo de entrenamiento">
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs }}>
              <FilterChip
                active={objetivos.length === 0}
                icon="apps-outline"
                label="Todos"
                onPress={() => setObjetivos([])}
              />
              {trainingGoals.map((goal) => {
                const isSelected = objetivos.includes(goal);
                return (
                  <FilterChip
                    active={isSelected}
                    icon={GOAL_ICON[goal] ?? 'trophy-outline'}
                    key={goal}
                    label={TRAINING_GOAL_LABEL[goal] ?? goal}
                    onPress={() => {
                      if (isSelected) {
                        setObjetivos(objetivos.filter((g) => g !== goal));
                      } else {
                        setObjetivos([...objetivos, goal]);
                      }
                    }}
                  />
                );
              })}
            </View>
          </Section>

          {branches.length > 1 ? (
            <Section icon="business-outline" title="Sede del gimnasio">
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs }}>
                <FilterChip active={!sucursalId} icon="apps-outline" label="Todas" onPress={() => setSucursalId(null)} />
                {branches.map((branch) => (
                  <FilterChip
                    active={sucursalId === branch.id}
                    icon="business-outline"
                    key={branch.id}
                    label={branch.nombre}
                    onPress={() => setSucursalId(sucursalId === branch.id ? null : branch.id)}
                  />
                ))}
              </View>
            </Section>
          ) : null}

          <Section icon="male-female-outline" title="Género">
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs }}>
              <FilterChip active={!genero} icon="apps-outline" label="Todos" onPress={() => setGenero(null)} />
              <FilterChip active={genero === 'MALE'} icon="male-outline" label="Hombres" onPress={() => setGenero(genero === 'MALE' ? null : 'MALE')} />
              <FilterChip active={genero === 'FEMALE'} icon="female-outline" label="Mujeres" onPress={() => setGenero(genero === 'FEMALE' ? null : 'FEMALE')} />
            </View>
          </Section>

          <View style={{ gap: spacing.sm, paddingTop: spacing.xs }}>
            <Button icon="shield-outline" label="Personas bloqueadas" onPress={onOpenBlocked} variant="ghost" />
            <Button icon="checkmark" label="Aplicar filtros" onPress={onClose} />
          </View>
        </View>
      </View>
    </Modal>
  );
}

function MatchModal({
  matchedEntry,
  messaging,
  myName,
  myPhotoUrl,
  onClose,
  onMessage,
  reduceMotion,
}: {
  matchedEntry: GymDirectoryEntry | null;
  messaging: boolean;
  myName: string;
  myPhotoUrl: string | null;
  onClose: () => void;
  onMessage: () => void;
  reduceMotion: boolean;
}) {
  const insets = useSafeAreaInsets();

  return (
    <Modal
      animationType={reduceMotion ? 'none' : 'fade'}
      onRequestClose={onClose}
      statusBarTranslucent
      transparent
      visible={Boolean(matchedEntry)}
    >
      <View accessibilityViewIsModal style={{ flex: 1, backgroundColor: colors.background }}>
        {matchedEntry?.photoUrl ? (
          <Image
            blurRadius={40}
            cachePolicy="memory-disk"
            contentFit="cover"
            recyclingKey={matchedEntry.photoUrl}
            source={{ uri: matchedEntry.photoUrl }}
            style={StyleSheet.absoluteFill}
            transition={160}
          />
        ) : null}
        <LinearGradient colors={MATCH_SCRIM} style={StyleSheet.absoluteFill} />

        <View
          style={{
            flex: 1,
            alignItems: 'center',
            paddingTop: insets.top + spacing.xl,
            paddingBottom: insets.bottom + spacing.lg,
            paddingHorizontal: spacing.lg,
          }}
        >
          <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', gap: spacing.xl }}>
            <View style={{ alignItems: 'center', gap: spacing.sm }}>
              <Text
                accessibilityRole="header"
                style={{
                  color: colors.volt,
                  fontSize: fontSizes.display,
                  fontWeight: '800',
                  letterSpacing: -1,
                  textAlign: 'center',
                }}
              >
                ¡Match de Gym!
              </Text>
              <Text style={{ color: onMedia.text, fontSize: fontSizes.md, lineHeight: 22, textAlign: 'center' }}>
                {matchedEntry ? `A ${matchedEntry.displayName} también le interesa entrenar contigo.` : ''}
              </Text>
            </View>

            <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md }}>
              {myPhotoUrl ? (
                <Image
                  cachePolicy="memory-disk"
                  contentFit="cover"
                  source={{ uri: myPhotoUrl }}
                  style={{
                    width: 104,
                    height: 104,
                    borderRadius: radii.full,
                    borderWidth: 3,
                    borderColor: colors.volt,
                  }}
                />
              ) : (
                <View
                  style={{
                    width: 104,
                    height: 104,
                    borderRadius: radii.full,
                    backgroundColor: colors.volt,
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Text style={{ color: colors.background, fontSize: fontSizes.xl, fontWeight: '700' }}>
                    {initialsOf(myName, undefined)}
                  </Text>
                </View>
              )}

              <Ionicons color={colors.volt} name="heart" size={iconSizes.xl + 8} />

              {matchedEntry?.photoUrl ? (
                <Image
                  cachePolicy="memory-disk"
                  contentFit="cover"
                  source={{ uri: matchedEntry.photoUrl }}
                  style={{
                    width: 104,
                    height: 104,
                    borderRadius: radii.full,
                    borderWidth: 3,
                    borderColor: colors.volt,
                  }}
                />
              ) : (
                <View
                  style={{
                    width: 104,
                    height: 104,
                    borderRadius: radii.full,
                    backgroundColor: colors.surfaceHigh,
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Text style={{ color: colors.text, fontSize: fontSizes.xl, fontWeight: '700' }}>
                    {initialsOf(matchedEntry?.displayName ?? '', undefined)}
                  </Text>
                </View>
              )}
            </View>
          </View>

          <View style={{ alignSelf: 'stretch', gap: spacing.sm }}>
            <Button
              icon="chatbubble-outline"
              label="Enviar mensaje ahora"
              loading={messaging}
              onPress={onMessage}
            />
            <Button icon="flame-outline" label="Seguir explorando" onPress={onClose} variant="ghost" />
          </View>
        </View>
      </View>
    </Modal>
  );
}

export default function ComunidadScreen() {
  const router = useRouter();
  useScreenTour('comunidad');
  const queryClient = useQueryClient();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const reduceMotion = useReducedMotion();
  const principal = useAuthStore((state) => state.principal);

  // Filtros de descubrimiento
  const [objetivos, setObjetivos] = useState<string[]>([]);
  const safeObjetivos = Array.isArray(objetivos) ? objetivos : [];
  const [sucursalId, setSucursalId] = useState<string | null>(null);
  const [genero, setGenero] = useState<string | null>(null);
  const [categoryPill, setCategoryPill] = useState<'foryou' | 'goal' | 'branch'>('foryou');

  // Recuperación resiliente si Fast Refresh o estado previo dejó `objetivos` como null o undefined
  useEffect(() => {
    if (!Array.isArray(objetivos)) {
      setObjetivos([]);
    }
  }, [objetivos]);

  const routeParams = useLocalSearchParams<{ openTopGym?: string; openMenu?: string }>();

  // Modals & Sheets
  const [prefsVisible, setPrefsVisible] = useState(false);
  const [overflowVisible, setOverflowVisible] = useState(false);
  const [topGymVisible, setTopGymVisible] = useState(false);
  const [detailEntry, setDetailEntry] = useState<GymDirectoryEntry | null>(null);
  const [matchedEntry, setMatchedEntry] = useState<GymDirectoryEntry | null>(null);

  useEffect(() => {
    if (routeParams.openTopGym === 'true') {
      setTopGymVisible(true);
    }
    if (routeParams.openMenu === 'true') {
      setOverflowVisible(true);
    }
  }, [routeParams.openTopGym, routeParams.openMenu]);

  // Multi-photo state
  const [photoCursor, setPhotoCursor] = useState<{ cardId: string | null; index: number }>({
    cardId: null,
    index: 0,
  });

  // Stage size for card tap calculations
  const [stage, setStage] = useState({ width: 0, height: 0 });

  // Sedes del gimnasio
  const branchesQuery = useQuery({
    queryKey: ['facilities', 'my-branches'],
    queryFn: () => facilitiesService.myBranches(),
    staleTime: 5 * 60_000,
  });
  const branchList = branchesQuery.data ?? [];

  // User profile for goal alignment
  const myProfile = useQuery({
    queryKey: ['profile'],
    queryFn: () => profileService.get(),
    staleTime: 5 * 60_000,
  });

  // My photos for match modal
  const myPhotos = useQuery({
    queryKey: ['profile', 'photos'],
    queryFn: () => profilePhotosService.list(),
    staleTime: 60_000,
  });

  // Deck query filters
  const filters = useMemo(
    () => ({
      objetivo: safeObjetivos.length > 0 ? safeObjetivos.join(',') : undefined,
      sucursalId: sucursalId || undefined,
      genero: genero || undefined,
      limit: DECK_SIZE,
    }),
    [safeObjetivos, sucursalId, genero],
  );

  const objetivosKey = safeObjetivos.slice().sort().join(',');
  const deckKey = `${objetivosKey}|${sucursalId ?? ''}|${genero ?? ''}|${categoryPill}`;
  const activeDeckKeyRef = useRef(deckKey);
  const [cardsFilterKey, setCardsFilterKey] = useState(deckKey);
  const acceptDealRef = useRef(true);

  useLayoutEffect(() => {
    activeDeckKeyRef.current = deckKey;
  }, [deckKey]);

  // The deck is only asked for once the preferences read says they exist: without them the server
  // answers 400 (DISCOVERY_PREFERENCES_REQUIRED); the setup form is shown from this read instead.
  const preferences = useQuery({ queryKey: ['social', 'discovery-preferences'], queryFn: socialService.getDiscoveryPreferences });
  const gate = discoveryDeckGate(preferences);
  const deck = useQuery({
    enabled: gate === 'deck',
    queryKey: ['social', 'discovery', 'deck', objetivosKey, sucursalId ?? '', genero ?? ''],
    queryFn: () => discoveryService.deck(filters),
    gcTime: 0,
    staleTime: 0,
  });

  const [cards, setCards] = useState<GymDirectoryEntry[]>([]);
  const [decided, setDecided] = useState<Decision[]>([]);

  useEffect(() => {
    acceptDealRef.current = true;
    setMatchedEntry(null);
    setDetailEntry(null);
  }, [deckKey]);

  useEffect(() => {
    if (!deck.data) return;
    if (!acceptDealRef.current) return;
    acceptDealRef.current = false;
    setCards(deck.data);
    setCardsFilterKey(deckKey);
  }, [deck.data, deck.dataUpdatedAt, deckKey]);

  const visibleCards = cardsFilterKey === deckKey ? cards : [];
  const topCard = visibleCards[0] ?? null;
  const nextCard = visibleCards[1] ?? null;
  const topCardId = topCard?.userId ?? null;
  const photoCount = topCard ? Math.max(topCard.photos.length, topCard.photoUrl ? 1 : 0) : 0;
  const photoIndex = photoCursor.cardId === topCardId ? photoCursor.index : 0;

  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);

  const resetCardPosition = useCallback(() => {
    cancelAnimation(translateX);
    cancelAnimation(translateY);
    translateX.value = 0;
    translateY.value = 0;
  }, [translateX, translateY]);

  useEffect(() => {
    return () => {
      cancelAnimation(translateX);
      cancelAnimation(translateY);
    };
  }, [translateX, translateY]);

  const swipe = useMutation({
    mutationFn: async ({ entry, direction }: Decision) => {
      if (entry.impressionId) await discoveryService.observeImpression(entry.impressionId);
      return discoveryService.swipe(entry.userId, direction, entry.impressionId);
    },
    onSuccess: async (result, variables) => {
      if (variables.filterKey === activeDeckKeyRef.current && result.matched) {
        setMatchedEntry(variables.entry);
      }
      await refreshSocialRelationship(queryClient, { conversations: result.matched });
    },
    onError: async (error: Error, variables) => {
      notify.error(error.message);
      if (variables.filterKey !== activeDeckKeyRef.current) {
        setDecided((current) => current.filter((item) => item.entry.userId !== variables.entry.userId));
        return;
      }
      if (error instanceof ApiError && error.status === 409) {
        setDecided((current) => current.filter((item) => item.entry.userId !== variables.entry.userId));
        acceptDealRef.current = true;
        await Promise.all([
          deck.refetch(),
          refreshSocialRelationship(queryClient, { conversations: true }),
        ]);
        return;
      }
      setCards((current) =>
        current.some((c) => c.userId === variables.entry.userId)
          ? current
          : [variables.entry, ...current],
      );
      setCardsFilterKey(variables.filterKey);
      setDecided((current) => current.filter((item) => item.entry.userId !== variables.entry.userId));
    },
  });

  const undo = useMutation({
    mutationFn: () => discoveryService.undoSwipe(),
    onSuccess: async (result, variables: { filterKey: string }) => {
      if (variables.filterKey !== activeDeckKeyRef.current) {
        setDecided((current) => current.filter((item) => item.entry.userId !== result.targetId));
        acceptDealRef.current = true;
        await Promise.all([
          deck.refetch(),
          refreshSocialRelationship(queryClient, { conversations: result.unmatched }),
        ]);
        return;
      }
      const restored = decided.find(
        (item) => item.entry.userId === result.targetId && item.filterKey === deckKey,
      );
      setDecided((current) => current.filter((item) => item.entry.userId !== result.targetId));
      if (restored) {
        setCards((current) => [restored.entry, ...current]);
      } else {
        acceptDealRef.current = true;
        await deck.refetch();
      }
      resetCardPosition();
      await refreshSocialRelationship(queryClient, { conversations: result.unmatched });
      notify.success(result.unmatched ? 'Match deshecho.' : 'Decisión deshecha.');
    },
    onError: (error: Error) => notify.error(error.message),
  });

  const message = useMutation({
    mutationFn: (userId: string) => chatService.startConversation(userId),
    onSuccess: (conversation) => {
      setMatchedEntry(null);
      router.push({ pathname: '/chat/[id]', params: { id: conversation.conversationId } });
    },
    onError: (error: Error) => notify.error(error.message),
  });

  const stepPhoto = useCallback(
    (delta: number) => {
      setPhotoCursor((current) => {
        const base = current.cardId === topCardId ? current.index : 0;
        const next = base + delta;
        if (next < 0 || next >= photoCount) return current;
        return { cardId: topCardId, index: next };
      });
    },
    [photoCount, topCardId],
  );

  const commit = useCallback(
    (direction: SwipeDirection) => {
      const entry = visibleCards[0];
      resetCardPosition();
      if (deckKey !== activeDeckKeyRef.current || cardsFilterKey !== deckKey) return;
      if (!entry) return;

      if (!reduceMotion) {
        void Haptics.impactAsync(
          direction === 'LIKE'
            ? Haptics.ImpactFeedbackStyle.Medium
            : Haptics.ImpactFeedbackStyle.Light,
        );
      }
      setCards((current) => current.slice(1));
      setDecided((current) => [{ entry, direction, filterKey: deckKey }, ...current]);
      swipe.mutate({ entry, direction, filterKey: deckKey });
    },
    [cardsFilterKey, deckKey, reduceMotion, resetCardPosition, swipe, visibleCards],
  );

  const threshold = width * DECISION_RATIO;

  const flyOut = useCallback(
    (direction: SwipeDirection) => {
      if (reduceMotion) {
        commit(direction);
        return;
      }
      translateX.value = withTiming(
        (direction === 'LIKE' ? 1 : -1) * width * 1.4,
        { duration: EXIT_MS, easing: Easing.out(Easing.cubic) },
        (finished) => {
          if (finished) runOnJS(commit)(direction);
        },
      );
    },
    [commit, reduceMotion, translateX, width],
  );

  const redeal = useCallback(() => {
    acceptDealRef.current = true;
    void deck.refetch();
  }, [deck]);

  const pan = useMemo(
    () =>
      Gesture.Pan()
        .enabled(Boolean(topCard) && !matchedEntry)
        .onBegin(() => {
          cancelAnimation(translateX);
          cancelAnimation(translateY);
        })
        .onUpdate((event) => {
          translateX.value = event.translationX;
          translateY.value = event.translationY;
        })
        .onEnd((event) => {
          const resolved =
            Math.abs(event.translationX) > threshold ||
            Math.abs(event.velocityX) > FLING_VELOCITY;
          if (!resolved) {
            translateX.value = withSpring(0, CARD_SPRING);
            translateY.value = withSpring(0, CARD_SPRING);
            return;
          }
          const direction: SwipeDirection = event.translationX > 0 ? 'LIKE' : 'PASS';
          if (reduceMotion) {
            runOnJS(commit)(direction);
            return;
          }
          translateY.value = withTiming(event.translationY, { duration: EXIT_MS });
          translateX.value = withTiming(
            (direction === 'LIKE' ? 1 : -1) * width * 1.4,
            { duration: EXIT_MS, easing: Easing.out(Easing.cubic) },
            (finished) => {
              if (finished) runOnJS(commit)(direction);
            },
          );
        }),
    [commit, matchedEntry, reduceMotion, threshold, topCard, translateX, translateY, width],
  );

  const tap = useMemo(
    () =>
      Gesture.Tap()
        .enabled(Boolean(topCard) && !matchedEntry)
        .maxDuration(TAP_MAX_MS)
        .onEnd((event, success) => {
          if (!success) return;
          if (stage.width <= 0 || stage.height <= 0) return;

          // Tap on bottom info section (name, chips, chevron) opens full profile detail
          if (event.y >= stage.height - 180) {
            runOnJS(setDetailEntry)(visibleCards[0] ?? null);
            return;
          }

          if (photoCount < 2) return;
          runOnJS(stepPhoto)(event.x < stage.width * BACK_ZONE_RATIO ? -1 : 1);
        }),
    [matchedEntry, photoCount, stage.height, stage.width, stepPhoto, topCard, visibleCards],
  );

  const deckGesture = useMemo(() => Gesture.Exclusive(pan, tap), [pan, tap]);

  const cardStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: translateX.value },
      { translateY: translateY.value },
      { rotateZ: reduceMotion ? '0deg' : `${(translateX.value / width) * MAX_ROTATION_DEG}deg` },
    ],
  }));

  const nextCardStyle = useAnimatedStyle(() => {
    const progress = Math.min(Math.abs(translateX.value) / threshold, 1);
    return {
      transform: [{ scale: 0.94 + progress * 0.06 }],
      opacity: 0.65 + progress * 0.35,
    };
  });

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      {/* Cabecera: marca REPP + acciones, y debajo el selector del mazo */}
      <View
        style={{
          paddingTop: Math.max(insets.top, spacing.sm),
          paddingHorizontal: spacing.md,
          paddingBottom: spacing.xs,
          gap: spacing.sm,
          zIndex: 10,
        }}
      >
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <ReppLogo height={26} />
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.xs }}>
            <PressableScale
              accessibilityLabel="Preferencias de búsqueda"
              onPress={() => setPrefsVisible(true)}
              style={{
                width: minTouchTarget,
                height: minTouchTarget,
                borderRadius: radii.full,
                backgroundColor: colors.surfaceHigh,
                alignItems: 'center',
                justifyContent: 'center',
                borderWidth: 1,
                borderColor:
                  safeObjetivos.length > 0 || sucursalId !== null || genero !== null
                    ? colors.volt
                    : colors.borderSubtle,
              }}
            >
              <Ionicons
                color={
                  safeObjetivos.length > 0 || sucursalId !== null || genero !== null
                    ? colors.volt
                    : colors.text
                }
                name="options-outline"
                size={iconSizes.md}
              />
              {(safeObjetivos.length > 0 || sucursalId !== null || genero !== null) && (
                <View
                  style={{
                    position: 'absolute',
                    top: 8,
                    right: 8,
                    width: 7,
                    height: 7,
                    borderRadius: 4,
                    backgroundColor: colors.volt,
                  }}
                />
              )}
            </PressableScale>


          {/* 3-Dots Menu Button */}
          <PressableScale
            accessibilityLabel="Opciones de Comunidad"
            onPress={() => setOverflowVisible(true)}
            style={{
              width: minTouchTarget,
              height: minTouchTarget,
              borderRadius: radii.full,
              backgroundColor: colors.surfaceHigh,
              alignItems: 'center',
              justifyContent: 'center',
              borderWidth: 1,
              borderColor: colors.borderSubtle,
            }}
          >
            <Ionicons color={colors.text} name="ellipsis-horizontal" size={iconSizes.md} />
          </PressableScale>
          </View>
        </View>
        <View style={{ alignItems: 'center' }}>
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              backgroundColor: colors.surfaceLow,
              padding: 3,
              borderRadius: radii.full,
              borderWidth: 1,
              borderColor: colors.borderSubtle,
              gap: 2,
            }}
          >
            <Pressable
              onPress={() => {
                setCategoryPill('foryou');
                setObjetivos([]);
              }}
              accessibilityRole="button"
              accessibilityState={{ selected: categoryPill === 'foryou' }}
              style={{
                minHeight: minTouchTarget,
                justifyContent: 'center',
                paddingHorizontal: spacing.md,
                borderRadius: radii.full,
                backgroundColor: categoryPill === 'foryou' ? colors.surfaceHigh : 'transparent',
              }}
            >
              <Text
                style={{
                  color: categoryPill === 'foryou' ? colors.text : colors.textMuted,
                  fontSize: fontSizes.xs,
                  fontWeight: categoryPill === 'foryou' ? '700' : '500',
                }}
              >
                Para ti
              </Text>
            </Pressable>

            <Pressable
              onPress={() => {
                setCategoryPill('goal');
                const userGoal = myProfile.data?.objetivo ?? 'HIPERTROFIA';
                setObjetivos([userGoal]);
              }}
              accessibilityRole="button"
              accessibilityState={{ selected: categoryPill === 'goal' }}
              style={{
                minHeight: minTouchTarget,
                justifyContent: 'center',
                paddingHorizontal: spacing.md,
                borderRadius: radii.full,
                backgroundColor: categoryPill === 'goal' ? colors.surfaceHigh : 'transparent',
              }}
            >
              <Text
                style={{
                  color: categoryPill === 'goal' ? colors.text : colors.textMuted,
                  fontSize: fontSizes.xs,
                  fontWeight: categoryPill === 'goal' ? '700' : '500',
                }}
              >
                Mismo objetivo
              </Text>
            </Pressable>
          </View>

        </View>
      </View>

      {/* Main Tinder Card Deck Canvas */}
      <View
        onLayout={(e) => setStage(e.nativeEvent.layout)}
        style={{
          flex: 1,
          paddingHorizontal: spacing.sm,
          paddingTop: spacing.xs,
          paddingBottom: spacing.xs,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        {gate === 'pending' || (gate === 'deck' && deck.isPending) ? (
          <View style={{ flex: 1, width: '100%', alignItems: 'center', justifyContent: 'center' }}>
            <ActivityIndicator color={colors.volt} size="large" />
            <Text style={{ color: colors.textMuted, fontSize: fontSizes.sm, marginTop: spacing.md }}>
              Cargando compañeros de entreno…
            </Text>
          </View>
        ) : gate === 'setup' || (deck.isError && needsDiscoveryPreferences(deck.error)) ? (
          // Sin preferencias no se recomienda a nadie (nunca se adivina a quién
          // quiere conocer alguien): se piden aquí mismo, no un error sin salida.
          <ScrollView
            contentContainerStyle={{ gap: spacing.md, padding: spacing.lg }}
            style={{ flex: 1, width: '100%' }}
          >
            <View accessibilityElementsHidden importantForAccessibility="no-hide-descendants" style={{ alignItems: 'center' }}>
              <SvgXml height={96} width={96} xml={mascotXml('flirty')} />
            </View>
            <Text style={{ color: colors.text, fontSize: fontSizes.lg, fontWeight: '700', textAlign: 'center' }}>
              Cuéntanos a quién buscas
            </Text>
            <Text style={{ color: colors.textMuted, fontSize: fontSizes.sm, textAlign: 'center' }}>
              Elige con quién quieres entrenar o conocer gente. Solo verás personas que encajen.
            </Text>
            <DiscoveryPreferencesEditor embedded onSaved={redeal} />
          </ScrollView>
        ) : deck.isError ? (
          <View style={{ flex: 1, width: '100%', justifyContent: 'center', padding: spacing.lg }}>
            <ErrorState error={deck.error} onRetry={redeal} />
          </View>
        ) : topCard ? (
          <DeckStage
            cardStyle={cardStyle}
            gesture={deckGesture}
            nextCard={nextCard}
            nextCardStyle={nextCardStyle}
            onOpenDetail={() => setDetailEntry(topCard)}
            onStepPhoto={stepPhoto}
            photoIndex={photoIndex}
            threshold={threshold}
            topCard={topCard}
            translateX={translateX}
          />
        ) : (
          /* Empty State: Out of cards */
          <View
            style={{
              flex: 1,
              width: '100%',
              alignItems: 'center',
              justifyContent: 'center',
              padding: spacing.xl,
              gap: spacing.lg,
            }}
          >
            {/* Repi descansa: el mazo se acabó, no es un error. */}
            <View accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
              <SvgXml height={128} width={128} xml={mascotXml('resting')} />
            </View>

            <View style={{ alignItems: 'center', gap: spacing.xs }}>
              <Text
                style={{
                  color: colors.text,
                  fontSize: fontSizes.xl,
                  fontWeight: '700',
                  textAlign: 'center',
                }}
              >
                Ya viste a todos por hoy
              </Text>
              <Text
                style={{
                  color: colors.textMuted,
                  fontSize: fontSizes.sm,
                  textAlign: 'center',
                  lineHeight: 20,
                  maxWidth: 280,
                }}
              >
                Repi también se quedó sin perfiles. Vuelve mañana o abre los filtros de objetivo y sede.
              </Text>
            </View>

            <View style={{ width: '100%', maxWidth: 280, gap: spacing.sm }}>
              {/* The last decision stays undoable once the deck runs out (as on the web empty state). */}
              {decided.some((item) => item.filterKey === deckKey) ? (
                <Button
                  icon="arrow-undo-outline"
                  label="Deshacer la última"
                  loading={undo.isPending}
                  onPress={() => undo.mutate({ filterKey: deckKey })}
                  testID="comunidad-empty-undo"
                  variant="ghost"
                />
              ) : null}
              <Button icon="reload-outline" label="Explorar de nuevo" onPress={redeal} variant="primary" />
              <Button icon="options-outline" label="Cambiar filtros" onPress={() => setPrefsVisible(true)} variant="ghost" />
            </View>
          </View>
        )}
      </View>

      {/* Barra de acciones: solo con una tarjeta delante. Sin preferencias, cargando o con el mazo
          vacío no hay a quién deshacer, rechazar ni dar like: botones ahí son promesas rotas. */}
      {topCard ? (
        <DeckActionBar
          canUndo={decided.length > 0}
          messaging={message.isPending}
          onLike={() => flyOut('LIKE')}
          onMessage={() => message.mutate(topCard.userId)}
          onPass={() => flyOut('PASS')}
          onSuperLike={() => flyOut('LIKE')}
          onUndo={() => undo.mutate({ filterKey: deckKey })}
          swiping={swipe.isPending}
          undoing={undo.isPending}
        />
      ) : (
        // Reserva el alto de la barra flotante para que nada quede debajo del vidrio.
        <View style={{ height: ACTION_BAR_BOTTOM }} />
      )}

      {/* 3-Dots Menu Sheet (Consolidated Community Menu) */}
      <CommunityOverflowSheet
        onClose={() => setOverflowVisible(false)}
        onOpenPreferences={() => setPrefsVisible(true)}
        onOpenTopGym={() => setTopGymVisible(true)}
        visible={overflowVisible}
      />

      {/* Top 15 Leaderboard Modal */}
      <TopGymModal onClose={() => setTopGymVisible(false)} visible={topGymVisible} />

      {/* Preferences Sheet */}
      <SearchPreferencesSheet
        branches={branchList}
        filters={{ objetivos: safeObjetivos, setObjetivos, sucursalId, setSucursalId, genero, setGenero }}
        onClose={() => setPrefsVisible(false)}
        onOpenBlocked={() => {
          setPrefsVisible(false);
          router.push('/personas-bloqueadas');
        }}
        visible={prefsVisible}
      />

      {/* Full Profile Sheet */}
      <ProfileDetailSheet entry={detailEntry} onClose={() => setDetailEntry(null)} />

      {/* Full-screen Match Celebration Modal */}
      <MatchModal
        matchedEntry={matchedEntry}
        messaging={message.isPending}
        myName={principal?.nombreCompleto ?? 'Tú'}
        myPhotoUrl={myPhotos.data?.[0]?.url ?? null}
        onClose={() => setMatchedEntry(null)}
        onMessage={() => {
          if (matchedEntry) message.mutate(matchedEntry.userId);
        }}
        reduceMotion={Boolean(reduceMotion)}
      />
    </View>
  );
}

/** El servidor responde 400 cuando el socio aún no guardó sus preferencias de Conocer. */
