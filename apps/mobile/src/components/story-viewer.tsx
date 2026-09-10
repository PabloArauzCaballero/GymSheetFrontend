import { useEffect, useRef, useState } from 'react';
import { Linking, Modal, Pressable, Text, View } from 'react-native';
import { useQueryClient } from '@tanstack/react-query';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import Animated, {
  Easing,
  cancelAnimation,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import type { StoryFeedEntry } from '@gymsheet/schemas';
import { storiesService } from '@/api/services';
import { confirmDelete, notify } from '@/notifications';
import { useAuthStore } from '@/state/auth-store';
import { initialsOf } from '@/lib/format';
import { colors, fontSizes, iconSizes, minTouchTarget, radii, semibold, spacing } from '@/theme';

/** Lo que dura una foto en pantalla antes de pasar sola a la siguiente. */
const STORY_DURATION_MS = 5000;

/**
 * Alto supuesto de la cabecera hasta que se mide de verdad. Solo sirve para el
 * primer fotograma: `onLayout` lo corrige antes de que nadie pueda tocar nada.
 */
const DEFAULT_HEADER_HEIGHT = 104;

type SegmentStatus = 'past' | 'current' | 'future';

/**
 * Un tramo de la barra de progreso.
 *
 * Tres estados y no dos: lo ya visto queda lleno, lo que viene queda vacío, y
 * el actual se llena en tiempo real. Sin ese tercero la barra dice cuántas
 * stories hay pero no cuánto falta para la siguiente, que es justo lo que el
 * usuario está esperando saber cuando decide si toca o espera.
 */
function ProgressSegment({
  status,
  paused,
  animated,
}: {
  status: SegmentStatus;
  paused: boolean;
  animated: boolean;
}) {
  const progress = useSharedValue(0);

  // Al convertirse en la actual empieza de cero. Es un efecto aparte del de
  // abajo a propósito: si el reinicio viviera ahí, cada pausa reiniciaría el
  // tramo en vez de congelarlo.
  useEffect(() => {
    if (status !== 'current') return;
    progress.value = 0;
  }, [progress, status]);

  useEffect(() => {
    cancelAnimation(progress);
    if (status === 'past') {
      progress.value = 1;
      return;
    }
    if (status === 'future') {
      progress.value = 0;
      return;
    }
    // Un vídeo no se reproduce aquí dentro y con movimiento reducido no hay
    // nada que animar: en ambos casos el tramo se muestra lleno.
    if (!animated) {
      progress.value = 1;
      return;
    }
    if (paused) return;
    progress.value = withTiming(1, {
      duration: STORY_DURATION_MS * (1 - progress.value),
      easing: Easing.linear,
    });
  }, [animated, paused, progress, status]);

  const fill = useAnimatedStyle(() => ({
    width: `${progress.value * 100}%` as `${number}%`,
  }));

  return (
    <View
      style={{
        flex: 1,
        height: 3,
        borderRadius: radii.full,
        overflow: 'hidden',
        backgroundColor: 'rgba(255,255,255,0.3)',
      }}
    >
      <Animated.View style={[{ height: '100%', borderRadius: radii.full, backgroundColor: colors.volt }, fill]} />
    </View>
  );
}

/**
 * Visor a pantalla completa: las fotos pasan solas a los cinco segundos, se
 * mantiene pulsado para congelarlas, se toca la mitad derecha para adelantar y
 * la izquierda para volver. La barra de arriba cuenta ese tiempo.
 */
export function StoryViewer({
  entry,
  onClose,
}: {
  entry: StoryFeedEntry | null;
  onClose: () => void;
}) {
  const queryClient = useQueryClient();
  const principal = useAuthStore((state) => state.principal);
  const reduceMotion = useReducedMotion();
  const [index, setIndex] = useState(0);
  const [held, setHeld] = useState(false);
  const [busy, setBusy] = useState(false);
  const [headerHeight, setHeaderHeight] = useState(DEFAULT_HEADER_HEIGHT);
  /** Lo que le queda a la story actual; sobrevive a las pausas. */
  const remainingRef = useRef(STORY_DURATION_MS);
  /** El temporizador avanza a través de una referencia para no reiniciarse en cada render del padre. */
  const advanceRef = useRef<() => void>(() => {});

  const stories = entry?.stories ?? [];
  const story = stories[index] ?? null;
  const storyId = story?.id ?? null;
  const isMine = Boolean(entry && principal && entry.userId === principal.id);
  // El diálogo de borrado y el dedo apoyado paran el reloj por la misma razón:
  // la story no debería pasar mientras el usuario está atendiendo a otra cosa.
  const paused = held || busy;
  // Un vídeo se abre fuera de la app; adelantarlo mientras se ve sería saltarse
  // una story que el usuario todavía no ha mirado.
  const autoAdvances = story?.mediaType === 'image';

  useEffect(() => {
    setIndex(0);
    setHeld(false);
  }, [entry?.userId]);

  useEffect(() => {
    if (!storyId) return;
    void storiesService.view(storyId).catch(() => {});
  }, [storyId]);

  useEffect(() => {
    advanceRef.current = () => {
      if (index < stories.length - 1) setIndex(index + 1);
      else onClose();
    };
  });

  // Declarado ANTES del temporizador: al cambiar de story este cuerpo repone el
  // tiempo completo después de que la limpieza del temporizador haya guardado
  // lo que quedaba de la anterior.
  useEffect(() => {
    remainingRef.current = STORY_DURATION_MS;
  }, [storyId]);

  useEffect(() => {
    if (!autoAdvances || paused) return;
    const duration = remainingRef.current;
    const startedAt = Date.now();
    const timer = setTimeout(() => {
      remainingRef.current = STORY_DURATION_MS;
      advanceRef.current();
    }, duration);
    return () => {
      clearTimeout(timer);
      remainingRef.current = Math.max(0, duration - (Date.now() - startedAt));
    };
  }, [autoAdvances, paused, storyId]);

  if (!entry || !story) return null;
  const activeStoryId = story.id;

  function goNext() {
    if (index < stories.length - 1) setIndex(index + 1);
    else onClose();
  }

  function goPrevious() {
    if (index > 0) setIndex(index - 1);
  }

  async function handleDelete() {
    setBusy(true);
    try {
      const result = await confirmDelete({
        entity: 'story',
        message: 'Dejará de verse para el resto del gimnasio.',
      });
      if (!result.confirmed) return;
      await storiesService.remove(activeStoryId);
      await queryClient.invalidateQueries({ queryKey: ['stories', 'feed'] });
      notify.success('Story eliminada.');
      onClose();
    } catch (error) {
      notify.error(error instanceof Error ? error.message : 'No se pudo eliminar la story.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal animationType="fade" onRequestClose={onClose} transparent visible>
      <View style={{ flex: 1, backgroundColor: '#000' }}>
        {/* Cabecera por encima de las zonas táctiles y midiéndose a sí misma:
            las zonas empiezan justo debajo, así que «Cerrar» y la papelera
            vuelven a ser pulsables. Antes las tapaba una zona a pantalla
            completa declarada después. */}
        <View
          onLayout={(event) => setHeaderHeight(event.nativeEvent.layout.height)}
          style={{ zIndex: 2 }}
        >
          <View style={{ flexDirection: 'row', gap: 4, paddingTop: 52, paddingHorizontal: spacing.md }}>
            {stories.map((item, itemIndex) => (
              <ProgressSegment
                animated={item.mediaType === 'image' && !reduceMotion}
                key={item.id}
                paused={paused}
                status={itemIndex < index ? 'past' : itemIndex === index ? 'current' : 'future'}
              />
            ))}
          </View>

          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: spacing.sm,
              paddingHorizontal: spacing.md,
              paddingTop: spacing.sm,
            }}
          >
            {entry.photoUrl ? (
              <Image
                contentFit="cover"
                source={{ uri: entry.photoUrl }}
                style={{ width: 32, height: 32, borderRadius: radii.full }}
              />
            ) : (
              <View
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: radii.full,
                  alignItems: 'center',
                  justifyContent: 'center',
                  backgroundColor: colors.volt,
                }}
              >
                <Text style={{ color: colors.background, fontSize: fontSizes.xs, fontWeight: '700' }}>
                  {initialsOf(entry.fullName, undefined)}
                </Text>
              </View>
            )}
            <Text style={{ flex: 1, color: '#fff', fontSize: fontSizes.sm, fontWeight: semibold }}>
              {entry.fullName}
            </Text>
            {isMine ? (
              <Pressable
                accessibilityLabel="Eliminar esta story"
                accessibilityRole="button"
                accessibilityState={{ disabled: busy, busy }}
                disabled={busy}
                onPress={() => void handleDelete()}
                style={{ width: minTouchTarget, height: minTouchTarget, alignItems: 'center', justifyContent: 'center' }}
              >
                <Ionicons color={busy ? colors.textDisabled : '#fff'} name="trash-outline" size={iconSizes.lg} />
              </Pressable>
            ) : null}
            <Pressable
              accessibilityLabel="Cerrar"
              accessibilityRole="button"
              onPress={onClose}
              style={{ width: minTouchTarget, height: minTouchTarget, alignItems: 'center', justifyContent: 'center' }}
            >
              <Ionicons color="#fff" name="close" size={iconSizes.lg} />
            </Pressable>
          </View>
        </View>

        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          {story.mediaType === 'image' ? (
            <Image contentFit="contain" source={{ uri: story.mediaUrl }} style={{ width: '100%', height: '100%' }} />
          ) : null}
        </View>

        {/* Zonas de avance: por encima de la imagen (zIndex) y por debajo de la
            cabecera (top), que es la única forma de que las tres capas se
            repartan la pantalla sin robarse toques. */}
        <Pressable
          accessibilityLabel="Story anterior"
          accessibilityRole="button"
          onLongPress={() => setHeld(true)}
          onPress={goPrevious}
          onPressOut={() => setHeld(false)}
          style={{ position: 'absolute', top: headerHeight, bottom: 0, left: 0, width: '35%', zIndex: 1 }}
        />
        <Pressable
          accessibilityLabel="Siguiente story"
          accessibilityRole="button"
          onLongPress={() => setHeld(true)}
          onPress={goNext}
          onPressOut={() => setHeld(false)}
          style={{ position: 'absolute', top: headerHeight, bottom: 0, right: 0, width: '65%', zIndex: 1 }}
        />

        {story.mediaType === 'video' ? (
          // `box-none`: solo el botón recibe el toque, el resto del recuadro lo
          // dejan pasar a las zonas de avance de debajo.
          <View
            pointerEvents="box-none"
            style={{
              position: 'absolute',
              top: headerHeight,
              left: 0,
              right: 0,
              bottom: 0,
              alignItems: 'center',
              justifyContent: 'center',
              zIndex: 3,
            }}
          >
            <Pressable
              accessibilityLabel="Reproducir el video"
              accessibilityRole="button"
              onPress={() => void Linking.openURL(story.mediaUrl)}
              style={{ alignItems: 'center', gap: spacing.sm, padding: spacing.lg }}
            >
              <Ionicons color="#fff" name="play-circle-outline" size={64} />
              <Text style={{ color: '#fff', fontSize: fontSizes.sm }}>Toca para reproducir el video</Text>
            </Pressable>
          </View>
        ) : null}
      </View>
    </Modal>
  );
}
