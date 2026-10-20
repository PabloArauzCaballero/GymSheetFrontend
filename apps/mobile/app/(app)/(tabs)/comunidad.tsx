import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { Ionicons } from '@expo/vector-icons';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  Easing,
  cancelAnimation,
  runOnJS,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withSpring,
  withTiming,
  type SharedValue,
} from 'react-native-reanimated';
import type { GymDirectoryEntry, SwipeDirection, PublicBranchSummary } from '@gymsheet/schemas';
import { ApiError } from '@gymsheet/api-client';
import { trainingGoals } from '@gymsheet/types';
import {
  chatService,
  discoveryService,
  facilitiesService,
  profilePhotosService,
  socialService,
} from '@/api/services';
import { refreshSocialRelationship } from '@/api/social-cache';
import { CommunityOverflowSheet } from '@/components/community-overflow-sheet';
import { TopGymModal } from '@/components/top-gym-sheet';
import { ProfileDetailSheet } from '@/components/profile-detail-sheet';
import { TourTarget, useScreenTour } from '@/components/tour';
import { Card, Section } from '@/components/layout';
import { PressableScale } from '@/components/motion';
import { Button } from '@/components/ui';
import { EmptyState, ErrorState, Skeleton } from '@/components/feedback';
import { initialsOf } from '@/lib/format';
import { levelTitle } from '@/components/directory-card';
import { notify } from '@/notifications';
import { useAuthStore } from '@/state/auth-store';
import { TRAINING_GOAL_LABEL } from '@/lib/social-labels';
import {
  accentPolicy,
  alpha,
  colors,
  fontSizes,
  iconSizes,
  ink,
  minTouchTarget,
  onMedia,
  overlay,
  radii,
  semibold,
  spacing,
} from '@/theme';

const DECK_SIZE = 15;
const DECISION_RATIO = 0.28;
const FLING_VELOCITY = 900;
const MAX_ROTATION_DEG = 12;
const EXIT_MS = 220;
const CARD_SPRING = { damping: 24, stiffness: 260, mass: 0.6, overshootClamping: true } as const;
const BACK_ZONE_RATIO = 1 / 3;
const TAP_MAX_MS = 260;
const STAMP_TOP = spacing.xl;
const SEGMENT_HEIGHT = 3;

const SCRIM_BOTTOM = [
  'transparent',
  'rgba(8, 14, 24, 0.25)',
  'rgba(8, 14, 24, 0.72)',
  'rgba(8, 14, 24, 0.96)',
] as const;
const SCRIM_BOTTOM_STOPS = [0, 0.35, 0.7, 1] as const;
const SCRIM_TOP = ['rgba(0, 0, 0, 0.45)', 'transparent'] as const;
const MATCH_SCRIM = [overlay.scrimSoft, overlay.scrimStrong] as const;

type Decision = { entry: GymDirectoryEntry; direction: SwipeDirection; filterKey: string };

const GOAL_ICON: Record<string, keyof typeof Ionicons.glyphMap> = {
  HIPERTROFIA: 'barbell-outline',
  FUERZA: 'flash-outline',
  RESISTENCIA: 'infinite-outline',
  PERDIDA_GRASA: 'flame-outline',
  SALUD_GENERAL: 'heart-outline',
  REHABILITACION: 'medkit-outline',
};

function DecisionStamp({
  color,
  label,
  side,
  threshold,
  translateX,
}: {
  color: string;
  label: string;
  side: 'left' | 'right' | 'top';
  threshold: number;
  translateX: SharedValue<number>;
}) {
  const sign = side === 'left' ? 1 : -1;
  const animated = useAnimatedStyle(() => ({
    opacity:
      side === 'top'
        ? Math.min(Math.max((Math.abs(translateX.value) * 1.5) / threshold, 0), 1)
        : Math.min(Math.max((sign * translateX.value) / threshold, 0), 1),
  }));

  return (
    <Animated.View
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      pointerEvents="none"
      style={[
        {
          position: 'absolute',
          top: STAMP_TOP + 10,
          left: side === 'left' ? spacing.lg : side === 'top' ? '25%' : undefined,
          right: side === 'right' ? spacing.lg : side === 'top' ? '25%' : undefined,
          paddingHorizontal: spacing.md,
          paddingVertical: spacing.xs,
          borderRadius: radii.md,
          borderWidth: 3,
          borderColor: color,
          alignItems: 'center',
          backgroundColor: 'rgba(0,0,0,0.3)',
          transform: [
            {
              rotate: side === 'left' ? '-12deg' : side === 'right' ? '12deg' : '0deg',
            },
          ],
        },
        animated,
      ]}
    >
      <Text style={{ color, fontSize: fontSizes.xl, fontWeight: '800', letterSpacing: 1.5 }}>
        {label}
      </Text>
    </Animated.View>
  );
}

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
        paddingVertical: spacing.sm,
        borderRadius: radii.full,
        borderWidth: 1,
        borderColor: active ? colors.volt : colors.border,
        backgroundColor: active ? colors.surfaceHigh : colors.surfaceLow,
      }}
    >
      <Ionicons color={active ? colors.text : colors.textMuted} name={icon} size={iconSizes.sm} />
      <Text
        style={{
          color: active ? colors.text : colors.textMuted,
          fontSize: fontSizes.sm,
          fontWeight: active ? semibold : '400',
        }}
      >
        {label}
      </Text>
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
    objetivo: string | null;
    setObjetivo: (value: string | null) => void;
    sucursalId: string | null;
    setSucursalId: (value: string | null) => void;
    genero: string | null;
    setGenero: (value: string | null) => void;
  };
  branches: PublicBranchSummary[];
}) {
  const insets = useSafeAreaInsets();
  const { objetivo, setObjetivo, sucursalId, setSucursalId, genero, setGenero } = filters;

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
            paddingTop: spacing.md,
            paddingHorizontal: spacing.lg,
            paddingBottom: insets.bottom + spacing.md,
            gap: spacing.lg,
          }}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md }}>
            <Text
              accessibilityRole="header"
              style={{ flex: 1, color: colors.text, fontSize: fontSizes.lg, fontWeight: '700', letterSpacing: -0.5 }}
            >
              Preferencias de búsqueda
            </Text>
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
              <FilterChip active={!objetivo} icon="apps-outline" label="Todos" onPress={() => setObjetivo(null)} />
              {trainingGoals.map((goal) => (
                <FilterChip
                  active={objetivo === goal}
                  icon={GOAL_ICON[goal] ?? 'flag-outline'}
                  key={goal}
                  label={TRAINING_GOAL_LABEL[goal] ?? goal}
                  onPress={() => setObjetivo(goal)}
                />
              ))}
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
                    onPress={() => setSucursalId(branch.id)}
                  />
                ))}
              </View>
            </Section>
          ) : null}

          <Section icon="male-female-outline" title="Género">
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs }}>
              <FilterChip active={!genero} icon="apps-outline" label="Todos" onPress={() => setGenero(null)} />
              <FilterChip active={genero === 'MALE'} icon="male-outline" label="Hombres" onPress={() => setGenero('MALE')} />
              <FilterChip active={genero === 'FEMALE'} icon="female-outline" label="Mujeres" onPress={() => setGenero('FEMALE')} />
            </View>
          </Section>

          <Button icon="shield-outline" label="Personas bloqueadas" onPress={onOpenBlocked} variant="ghost" />
          <Button icon="checkmark" label="Aplicar filtros" onPress={onClose} />
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
  const [objetivo, setObjetivo] = useState<string | null>(null);
  const [sucursalId, setSucursalId] = useState<string | null>(null);
  const [genero, setGenero] = useState<string | null>(null);
  const [categoryPill, setCategoryPill] = useState<'foryou' | 'goal' | 'branch'>('foryou');

  const routeParams = useLocalSearchParams<{ openTopGym?: string; openMenu?: string }>();

  // Modals & Sheets
  const [prefsVisible, setPrefsVisible] = useState(false);
  const [overflowVisible, setOverflowVisible] = useState(false);
  const [topGymVisible, setTopGymVisible] = useState(false);
  const [detailEntry, setDetailEntry] = useState<GymDirectoryEntry | null>(null);
  const [matchedEntry, setMatchedEntry] = useState<GymDirectoryEntry | null>(null);

  useEffect(() => {
    setOverflowVisible(true);
  }, []);

  // Multi-photo state
  const [photoCursor, setPhotoCursor] = useState<{ cardId: string | null; index: number }>({
    cardId: null,
    index: 0,
  });

  // Stage size for card tap calculations
  const [stage, setStage] = useState({ width: 0, height: 0 });

  // Notifications: Pending connections query
  const pendingConnections = useQuery({
    queryKey: ['social', 'connections', 'PENDING'],
    queryFn: () => socialService.listConnections('PENDING'),
    staleTime: 30_000,
  });
  const hasPendingReceived = (pendingConnections.data ?? []).some(
    (c) => c.direction === 'RECEIVED',
  );

  // Sedes del gimnasio
  const branchesQuery = useQuery({
    queryKey: ['facilities', 'my-branches'],
    queryFn: () => facilitiesService.myBranches(),
    staleTime: 5 * 60_000,
  });
  const branchList = branchesQuery.data ?? [];

  // My photos for match modal
  const myPhotos = useQuery({
    queryKey: ['profile', 'photos'],
    queryFn: () => profilePhotosService.list(),
    staleTime: 60_000,
  });

  // Deck query filters
  const filters = useMemo(
    () => ({
      objetivo: objetivo || undefined,
      sucursalId: sucursalId || undefined,
      genero: genero || undefined,
      limit: DECK_SIZE,
    }),
    [objetivo, sucursalId, genero],
  );

  const deckKey = `${objetivo ?? ''}|${sucursalId ?? ''}|${genero ?? ''}|${categoryPill}`;
  const activeDeckKeyRef = useRef(deckKey);
  const [cardsFilterKey, setCardsFilterKey] = useState(deckKey);
  const acceptDealRef = useRef(true);

  useLayoutEffect(() => {
    activeDeckKeyRef.current = deckKey;
  }, [deckKey]);

  const deck = useQuery({
    queryKey: ['social', 'discovery', 'deck', objetivo ?? '', sucursalId ?? '', genero ?? ''],
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

          // Corner tap for detail profile
          const insideInfo =
            event.x >= stage.width - 70 && event.y >= stage.height - 70;
          if (insideInfo) {
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

  const currentPhotoUrl = useMemo(() => {
    if (!topCard) return null;
    if (topCard.photos.length > 0) {
      return topCard.photos[photoIndex]?.url ?? topCard.photoUrl;
    }
    return topCard.photoUrl;
  }, [photoIndex, topCard]);

  const nextCardPhotoUrl = useMemo(() => {
    if (!nextCard) return null;
    return nextCard.photos[0]?.url ?? nextCard.photoUrl;
  }, [nextCard]);

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      {/* Tinder Top Header Bar */}
      <View
        style={{
          paddingTop: Math.max(insets.top, spacing.sm),
          paddingHorizontal: spacing.md,
          paddingBottom: spacing.xs,
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          zIndex: 10,
        }}
      >
        {/* Left: Preferences Filters Icon */}
        <PressableScale
          accessibilityLabel="Preferencias de búsqueda"
          onPress={() => setPrefsVisible(true)}
          style={{
            width: 42,
            height: 42,
            borderRadius: radii.full,
            backgroundColor: colors.surfaceHigh,
            alignItems: 'center',
            justifyContent: 'center',
            borderWidth: 1,
            borderColor: colors.borderSubtle,
          }}
        >
          <Ionicons color={colors.text} name="options-outline" size={iconSizes.md} />
        </PressableScale>

        {/* Center: Category Pills (Tinder-style) */}
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
              setObjetivo(null);
            }}
            style={{
              paddingHorizontal: spacing.md,
              paddingVertical: 6,
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
              setObjetivo('HIPERTROFIA');
            }}
            style={{
              paddingHorizontal: spacing.md,
              paddingVertical: 6,
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

        {/* Right: Messages + 3-dots Menu */}
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.xs }}>
          {/* Chat Icon with Unread Badge */}
          <PressableScale
            accessibilityLabel="Mensajes y Solicitudes"
            onPress={() => router.push('/comunidad-mensajes')}
            style={{
              width: 42,
              height: 42,
              borderRadius: radii.full,
              backgroundColor: colors.surfaceHigh,
              alignItems: 'center',
              justifyContent: 'center',
              borderWidth: 1,
              borderColor: colors.borderSubtle,
            }}
          >
            <Ionicons color={colors.text} name="chatbubble-ellipses-outline" size={iconSizes.md} />
            {hasPendingReceived ? (
              <View
                style={{
                  position: 'absolute',
                  top: 7,
                  right: 7,
                  width: 9,
                  height: 9,
                  borderRadius: radii.full,
                  backgroundColor: colors.volt,
                  borderWidth: 2,
                  borderColor: colors.background,
                }}
              />
            ) : null}
          </PressableScale>

          {/* 3-Dots Menu Button */}
          <PressableScale
            accessibilityLabel="Opciones de Comunidad"
            onPress={() => setOverflowVisible(true)}
            style={{
              width: 42,
              height: 42,
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
        {deck.isPending ? (
          <View style={{ flex: 1, width: '100%', alignItems: 'center', justifyContent: 'center' }}>
            <ActivityIndicator color={colors.volt} size="large" />
            <Text style={{ color: colors.textMuted, fontSize: fontSizes.sm, marginTop: spacing.md }}>
              Cargando compañeros de entreno…
            </Text>
          </View>
        ) : deck.isError ? (
          <View style={{ flex: 1, width: '100%', justifyContent: 'center', padding: spacing.lg }}>
            <ErrorState error={deck.error} onRetry={redeal} />
          </View>
        ) : topCard ? (
          <View style={{ width: '100%', height: '100%', position: 'relative' }}>
            {/* Background Card (next card) */}
            {nextCard ? (
              <Animated.View
                pointerEvents="none"
                style={[
                  StyleSheet.absoluteFill,
                  {
                    borderRadius: 24,
                    overflow: 'hidden',
                    backgroundColor: colors.surfaceLow,
                    borderWidth: 1,
                    borderColor: colors.borderSubtle,
                  },
                  nextCardStyle,
                ]}
              >
                {nextCardPhotoUrl ? (
                  <Image
                    cachePolicy="memory-disk"
                    contentFit="cover"
                    priority="low"
                    recyclingKey={nextCardPhotoUrl}
                    source={{ uri: nextCardPhotoUrl }}
                    style={StyleSheet.absoluteFill}
                  />
                ) : (
                  <View
                    style={[
                      StyleSheet.absoluteFill,
                      {
                        backgroundColor: colors.surfaceHigh,
                        alignItems: 'center',
                        justifyContent: 'center',
                      },
                    ]}
                  >
                    <Text style={{ color: colors.textMuted, fontSize: fontSizes['2xl'], fontWeight: '700' }}>
                      {initialsOf(nextCard.displayName, undefined)}
                    </Text>
                  </View>
                )}
                <LinearGradient colors={SCRIM_BOTTOM} locations={SCRIM_BOTTOM_STOPS} style={StyleSheet.absoluteFill} />
              </Animated.View>
            ) : null}

            {/* Active Swipable Card */}
            <GestureDetector gesture={deckGesture}>
              <Animated.View
                style={[
                  StyleSheet.absoluteFill,
                  {
                    borderRadius: 26,
                    overflow: 'hidden',
                    backgroundColor: colors.surfaceLow,
                    borderWidth: 1,
                    borderColor: 'rgba(255, 255, 255, 0.12)',
                    shadowColor: '#000',
                    shadowOffset: { width: 0, height: 10 },
                    shadowOpacity: 0.45,
                    shadowRadius: 20,
                    elevation: 10,
                  },
                  cardStyle,
                ]}
              >
                {/* Photo or Initials Avatar */}
                {currentPhotoUrl ? (
                  <Image
                    cachePolicy="memory-disk"
                    contentFit="cover"
                    priority="high"
                    recyclingKey={currentPhotoUrl}
                    source={{ uri: currentPhotoUrl }}
                    style={StyleSheet.absoluteFill}
                    transition={140}
                  />
                ) : (
                  <View
                    style={[
                      StyleSheet.absoluteFill,
                      {
                        backgroundColor: colors.surfaceHigh,
                        alignItems: 'center',
                        justifyContent: 'center',
                      },
                    ]}
                  >
                    <View
                      style={{
                        width: 104,
                        height: 104,
                        borderRadius: radii.full,
                        backgroundColor: colors.surfaceHighest,
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      <Text style={{ color: colors.textSecondary, fontSize: fontSizes['2xl'], fontWeight: '700' }}>
                        {initialsOf(topCard.displayName, undefined)}
                      </Text>
                    </View>
                  </View>
                )}

                {/* Top Multi-Photo Story Bars */}
                {photoCount > 1 ? (
                  <>
                    <LinearGradient colors={SCRIM_TOP} pointerEvents="none" style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 60 }} />
                    <View
                      pointerEvents="none"
                      style={{
                        position: 'absolute',
                        top: 14,
                        left: 14,
                        right: 14,
                        flexDirection: 'row',
                        gap: 5,
                      }}
                    >
                      {Array.from({ length: photoCount }).map((_, idx) => (
                        <View
                          key={idx}
                          style={{
                            flex: 1,
                            height: 3,
                            borderRadius: radii.full,
                            backgroundColor:
                              idx === photoIndex ? '#FFFFFF' : 'rgba(255, 255, 255, 0.35)',
                            shadowColor: idx === photoIndex ? '#FFFFFF' : 'transparent',
                            shadowOffset: { width: 0, height: 1 },
                            shadowOpacity: idx === photoIndex ? 0.6 : 0,
                            shadowRadius: 3,
                          }}
                        />
                      ))}
                    </View>
                  </>
                ) : null}

                {/* Decision Stamps */}
                <DecisionStamp
                  color={colors.volt}
                  label="ME INTERESA"
                  side="left"
                  threshold={threshold}
                  translateX={translateX}
                />
                <DecisionStamp
                  color={colors.danger}
                  label="PASO"
                  side="right"
                  threshold={threshold}
                  translateX={translateX}
                />

                {/* Bottom Gradient Overlay & Member Info (Identical to Tinder Image 2) */}
                <LinearGradient
                  colors={SCRIM_BOTTOM}
                  locations={SCRIM_BOTTOM_STOPS}
                  pointerEvents="box-none"
                  style={{
                    position: 'absolute',
                    left: 0,
                    right: 0,
                    bottom: 0,
                    paddingHorizontal: spacing.lg,
                    paddingBottom: spacing.lg,
                    paddingTop: spacing['2xl'],
                  }}
                >
                  <View style={{ gap: spacing.xs }}>
                    {/* Name, Age, Verified badge and Chevron Up info */}
                    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1 }}>
                        <Text
                          numberOfLines={1}
                          style={{
                            color: '#FFFFFF',
                            fontSize: 28,
                            fontWeight: '800',
                            letterSpacing: -0.6,
                          }}
                        >
                          {topCard.displayName}
                        </Text>

                        {typeof topCard.age === 'number' ? (
                          <Text
                            style={{
                              color: 'rgba(255, 255, 255, 0.85)',
                              fontSize: 24,
                              fontWeight: '400',
                            }}
                          >
                            {topCard.age}
                          </Text>
                        ) : null}

                        {/* Verified Checkmark */}
                        <Ionicons color="#38BDF8" name="checkmark-circle" size={22} />
                      </View>

                      {/* Info Chevron Up Button */}
                      <PressableScale
                        accessibilityLabel={`Ver perfil completo de ${topCard.displayName}`}
                        onPress={() => {
                          void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                          setDetailEntry(topCard);
                        }}
                        style={{
                          width: 38,
                          height: 38,
                          borderRadius: radii.full,
                          backgroundColor: 'rgba(255, 255, 255, 0.18)',
                          alignItems: 'center',
                          justifyContent: 'center',
                          borderWidth: 1,
                          borderColor: 'rgba(255, 255, 255, 0.3)',
                        }}
                      >
                        <Ionicons color="#FFFFFF" name="chevron-up" size={18} />
                      </PressableScale>
                    </View>

                    {/* Chips / Metadata Row */}
                    <View style={{ flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 6, marginTop: 4 }}>
                      {topCard.branchName ? (
                        <View
                          style={{
                            flexDirection: 'row',
                            alignItems: 'center',
                            gap: 4,
                            paddingHorizontal: 10,
                            paddingVertical: 4,
                            borderRadius: radii.full,
                            backgroundColor: 'rgba(15, 23, 42, 0.7)',
                            borderWidth: 1,
                            borderColor: 'rgba(255, 255, 255, 0.14)',
                          }}
                        >
                          <Ionicons color="rgba(255,255,255,0.85)" name="location-outline" size={13} />
                          <Text style={{ color: '#FFFFFF', fontSize: 12, fontWeight: '600' }}>
                            {topCard.branchName}
                          </Text>
                        </View>
                      ) : null}

                      {topCard.objetivo ? (
                        <View
                          style={{
                            flexDirection: 'row',
                            alignItems: 'center',
                            gap: 4,
                            paddingHorizontal: 10,
                            paddingVertical: 4,
                            borderRadius: radii.full,
                            backgroundColor: 'rgba(15, 23, 42, 0.7)',
                            borderWidth: 1,
                            borderColor: 'rgba(255, 255, 255, 0.14)',
                          }}
                        >
                          <Ionicons color={colors.volt} name="barbell-outline" size={13} />
                          <Text style={{ color: '#FFFFFF', fontSize: 12, fontWeight: '600' }}>
                            {TRAINING_GOAL_LABEL[topCard.objetivo] ?? topCard.objetivo}
                          </Text>
                        </View>
                      ) : null}

                      {topCard.levelCode ? (
                        <View
                          style={{
                            flexDirection: 'row',
                            alignItems: 'center',
                            gap: 4,
                            paddingHorizontal: 10,
                            paddingVertical: 4,
                            borderRadius: radii.full,
                            backgroundColor: 'rgba(204, 255, 0, 0.18)',
                            borderWidth: 1,
                            borderColor: 'rgba(204, 255, 0, 0.4)',
                          }}
                        >
                          <Ionicons color={colors.volt} name="trophy-outline" size={13} />
                          <Text style={{ color: colors.volt, fontSize: 12, fontWeight: '700', fontVariant: ['tabular-nums'] }}>
                            {levelTitle(topCard.levelCode)}
                            {typeof topCard.points === 'number' ? ` · ${topCard.points} pts` : ''}
                          </Text>
                        </View>
                      ) : null}
                    </View>
                  </View>
                </LinearGradient>
              </Animated.View>
            </GestureDetector>
          </View>
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
            <View
              style={{
                width: 96,
                height: 96,
                borderRadius: radii.full,
                backgroundColor: colors.surfaceHigh,
                alignItems: 'center',
                justifyContent: 'center',
                borderWidth: 2,
                borderColor: colors.volt,
              }}
            >
              <Ionicons color={colors.volt} name="sparkles" size={42} />
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
                ¡Has visto a todos por ahora!
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
                Ajusta tus filtros de objetivo o sede para encontrar a más deportistas listos para entrenar.
              </Text>
            </View>

            <View style={{ width: '100%', maxWidth: 280, gap: spacing.sm }}>
              <Button icon="reload-outline" label="Explorar de nuevo" onPress={redeal} variant="primary" />
              <Button icon="options-outline" label="Cambiar filtros" onPress={() => setPrefsVisible(true)} variant="ghost" />
            </View>
          </View>
        )}
      </View>

      {/* Tinder Bottom 5-Action Floating Bar (Matching Image 2) */}
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-evenly',
          paddingHorizontal: spacing.lg,
          paddingTop: spacing.xs,
          paddingBottom: 84,
          zIndex: 10,
        }}
      >
        {/* 1. Rewind / Undo Button (Yellow / Amber) */}
        <PressableScale
          accessibilityLabel="Deshacer último swipe"
          disabled={decided.length === 0 || undo.isPending}
          onPress={() => {
            void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            undo.mutate({ filterKey: deckKey });
          }}
          style={{
            width: 48,
            height: 48,
            borderRadius: radii.full,
            backgroundColor: 'rgba(24, 32, 47, 0.85)',
            borderWidth: 1.5,
            borderColor: 'rgba(245, 158, 11, 0.55)',
            alignItems: 'center',
            justifyContent: 'center',
            opacity: decided.length === 0 || undo.isPending ? 0.35 : 1,
            shadowColor: '#F59E0B',
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.2,
            shadowRadius: 8,
          }}
        >
          {undo.isPending ? (
            <ActivityIndicator color="#F59E0B" size="small" />
          ) : (
            <Ionicons color="#F59E0B" name="reload-outline" size={22} />
          )}
        </PressableScale>

        {/* 2. Pass / X Button (Red) */}
        <PressableScale
          accessibilityLabel="No me interesa"
          disabled={!topCard || swipe.isPending}
          onPress={() => {
            void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
            flyOut('PASS');
          }}
          style={{
            width: 64,
            height: 64,
            borderRadius: radii.full,
            backgroundColor: 'rgba(32, 18, 24, 0.9)',
            borderWidth: 2,
            borderColor: '#EF4444',
            alignItems: 'center',
            justifyContent: 'center',
            opacity: !topCard ? 0.4 : 1,
            shadowColor: '#EF4444',
            shadowOffset: { width: 0, height: 6 },
            shadowOpacity: 0.3,
            shadowRadius: 12,
          }}
        >
          <Ionicons color="#EF4444" name="close" size={34} />
        </PressableScale>

        {/* 3. Super Like / Star Button (Cyan / Blue) */}
        <PressableScale
          accessibilityLabel="Super Like"
          disabled={!topCard || swipe.isPending}
          onPress={() => {
            void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            flyOut('LIKE');
          }}
          style={{
            width: 50,
            height: 50,
            borderRadius: radii.full,
            backgroundColor: 'rgba(15, 30, 48, 0.85)',
            borderWidth: 1.5,
            borderColor: '#06B6D4',
            alignItems: 'center',
            justifyContent: 'center',
            opacity: !topCard ? 0.4 : 1,
            shadowColor: '#06B6D4',
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.25,
            shadowRadius: 8,
          }}
        >
          <Ionicons color="#06B6D4" name="star" size={24} />
        </PressableScale>

        {/* 4. Like / Heart Button (Volt / Green) */}
        <PressableScale
          accessibilityLabel="Me interesa entrenar"
          disabled={!topCard || swipe.isPending}
          onPress={() => {
            void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
            flyOut('LIKE');
          }}
          style={{
            width: 64,
            height: 64,
            borderRadius: radii.full,
            backgroundColor: 'rgba(25, 38, 18, 0.9)',
            borderWidth: 2,
            borderColor: colors.volt,
            alignItems: 'center',
            justifyContent: 'center',
            opacity: !topCard ? 0.4 : 1,
            shadowColor: colors.volt,
            shadowOffset: { width: 0, height: 6 },
            shadowOpacity: 0.35,
            shadowRadius: 14,
          }}
        >
          <Ionicons color={colors.volt} name="heart" size={34} />
        </PressableScale>

        {/* 5. Direct Chat / Flash Button (Purple) */}
        <PressableScale
          accessibilityLabel="Enviar mensaje directo"
          disabled={!topCard || message.isPending}
          onPress={() => {
            if (topCard) {
              void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
              message.mutate(topCard.userId);
            }
          }}
          style={{
            width: 50,
            height: 50,
            borderRadius: radii.full,
            backgroundColor: 'rgba(30, 20, 48, 0.85)',
            borderWidth: 1.5,
            borderColor: '#A855F7',
            alignItems: 'center',
            justifyContent: 'center',
            opacity: !topCard ? 0.4 : 1,
            shadowColor: '#A855F7',
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.25,
            shadowRadius: 8,
          }}
        >
          {message.isPending ? (
            <ActivityIndicator color="#A855F7" size="small" />
          ) : (
            <Ionicons color="#A855F7" name="flash" size={22} />
          )}
        </PressableScale>
      </View>

      {/* 3-Dots Menu Sheet (Consolidated Community Menu) */}
      <CommunityOverflowSheet
        onClose={() => setOverflowVisible(false)}
        onOpenTopGym={() => setTopGymVisible(true)}
        visible={overflowVisible}
      />

      {/* Top 15 Leaderboard Modal */}
      <TopGymModal onClose={() => setTopGymVisible(false)} visible={topGymVisible} />

      {/* Preferences Sheet */}
      <SearchPreferencesSheet
        branches={branchList}
        filters={{ objetivo, setObjetivo, sucursalId, setSucursalId, genero, setGenero }}
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
