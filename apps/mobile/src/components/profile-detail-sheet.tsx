import { Fragment, useEffect, useMemo, useState } from 'react';
import {
  Modal,
  Pressable,
  ScrollView,
  Text,
  View,
  useWindowDimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  runOnJS,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import type { GymDirectoryEntry } from '@gymsheet/schemas';
import { Card, Row, Section } from '@/components/layout';
import { levelTitle } from '@/components/directory-card';
import {
  EXPERIENCE_LEVEL_LABEL,
  GENDER_LABEL,
  SOCIAL_STATUS_LABEL,
  TRAINING_GOAL_LABEL,
} from '@/lib/social-labels';
import { colors, fontSizes, iconSizes, minTouchTarget, radii, semibold, spacing } from '@/theme';

/** Arrastre a partir del cual soltar cierra en vez de devolver la hoja a su sitio. */
const DISMISS_DISTANCE = 120;

/** Un lanzamiento hacia abajo cierra aunque el dedo no haya bajado lo suficiente. */
const DISMISS_VELOCITY = 900;

const CLOSE_MS = 180;
const SHEET_SPRING = { damping: 22, stiffness: 240, mass: 0.6, overshootClamping: true } as const;

type DetailSection = {
  key: string;
  title: string;
  icon: keyof typeof Ionicons.glyphMap;
  rows: { icon: keyof typeof Ionicons.glyphMap; label: string; value: string }[];
};

/**
 * Las secciones que la persona ha rellenado. Nada más.
 *
 * Una sección vacía con un guion dentro no informa de nada y deja la hoja llena
 * de huecos esperando datos que este backend no tiene: aquí no hay biografía,
 * ni ubicación, ni distancia, ni intereses, así que tampoco hay sitios
 * reservados para ellos.
 */
function sectionsOf(entry: GymDirectoryEntry): DetailSection[] {
  const training: DetailSection['rows'] = [];
  if (entry.objetivo) {
    training.push({
      icon: 'flag-outline',
      label: 'Objetivo',
      value: TRAINING_GOAL_LABEL[entry.objetivo] ?? entry.objetivo,
    });
  }
  if (entry.experienceLevel) {
    training.push({
      icon: 'school-outline',
      label: 'Experiencia',
      value: EXPERIENCE_LEVEL_LABEL[entry.experienceLevel] ?? entry.experienceLevel,
    });
  }
  if (entry.branchName) {
    training.push({ icon: 'business-outline', label: 'Sucursal', value: entry.branchName });
  }

  const progression: DetailSection['rows'] = [];
  if (entry.levelCode) {
    progression.push({
      icon: 'trophy-outline',
      label: 'Rango',
      value: levelTitle(entry.levelCode),
    });
  }
  if (typeof entry.points === 'number') {
    progression.push({
      icon: 'stats-chart-outline',
      label: 'Puntos',
      value: `${entry.points.toLocaleString('es-ES')} pts`,
    });
  }

  const about: DetailSection['rows'] = [];
  if (entry.gender) {
    about.push({
      icon: 'person-outline',
      label: 'Género',
      value: GENDER_LABEL[entry.gender] ?? entry.gender,
    });
  }
  if (entry.socialStatus) {
    about.push({
      icon: 'heart-outline',
      label: 'Estado',
      value: SOCIAL_STATUS_LABEL[entry.socialStatus],
    });
  }

  const all: DetailSection[] = [
    { key: 'training', title: 'Entrenamiento', icon: 'barbell-outline', rows: training },
    { key: 'progression', title: 'Progresión', icon: 'trophy-outline', rows: progression },
    { key: 'about', title: 'Sobre', icon: 'person-outline', rows: about },
  ];
  return all.filter((section) => section.rows.length > 0);
}

function SectionBlock({ index, section }: { index: number; section: DetailSection }) {
  return (
    <Section icon={section.icon} index={index} title={section.title}>
      <Card>
        {section.rows.map((row) => (
          <Row icon={row.icon} key={row.label} label={row.label} value={row.value} />
        ))}
      </Card>
    </Section>
  );
}

/**
 * La ficha ampliada de una persona de la baraja.
 *
 * La tarjeta contesta «¿me interesa?» en dos segundos; esto contesta «¿por
 * qué?» sin sacar a nadie de la baraja — de ahí que sea una hoja que sube y no
 * una ruta: al cerrarla la carta sigue exactamente donde estaba, con su foto y
 * su posición de arrastre intactas.
 *
 * Las fotos van en vertical, una tras otra, con las secciones de datos
 * intercaladas entre ellas: leer y mirar alternados mantiene el desplazamiento
 * vivo, mientras que seis fotos seguidas y luego un bloque de texto son dos
 * pantallas pegadas.
 *
 * Mismo lenguaje de hoja que `StorySourceSheet`: `Modal` transparente anclado
 * abajo, esquinas superiores redondeadas y fondo oscurecido.
 */
export function ProfileDetailSheet({
  entry,
  onClose,
}: {
  entry: GymDirectoryEntry | null;
  onClose: () => void;
}) {
  const insets = useSafeAreaInsets();
  const { height } = useWindowDimensions();
  const reduceMotion = useReducedMotion();
  const dragY = useSharedValue(0);

  // La entrada se guarda al abrir y no se suelta al cerrar: `Modal` mantiene sus
  // hijos montados durante la animación de salida, y sin esta copia la hoja se
  // vaciaría a mitad del deslizamiento.
  const [shown, setShown] = useState<GymDirectoryEntry | null>(null);
  useEffect(() => {
    if (entry) setShown(entry);
  }, [entry]);

  useEffect(() => {
    if (entry) dragY.value = 0;
  }, [dragY, entry]);

  const drag = useMemo(
    () =>
      Gesture.Pan()
        // Sólo hacia abajo: hacia arriba la hoja no tiene a dónde ir, y dejarla
        // despegarse del borde superior la convierte en una tarjeta flotante.
        .onUpdate((event) => {
          dragY.value = Math.max(event.translationY, 0);
        })
        .onEnd((event) => {
          const dismissed =
            event.translationY > DISMISS_DISTANCE || event.velocityY > DISMISS_VELOCITY;
          if (!dismissed) {
            dragY.value = withSpring(0, SHEET_SPRING);
            return;
          }
          if (reduceMotion) {
            runOnJS(onClose)();
            return;
          }
          // La hoja termina de salir antes de desmontarse: cerrar en seco a
          // media altura deja un salto donde debería haber continuidad.
          dragY.value = withTiming(height, { duration: CLOSE_MS }, (finished) => {
            if (finished) runOnJS(onClose)();
          });
        }),
    [dragY, height, onClose, reduceMotion],
  );

  const sheetStyle = useAnimatedStyle(() => ({ transform: [{ translateY: dragY.value }] }));

  const sections = useMemo(() => (shown ? sectionsOf(shown) : []), [shown]);
  const photos = useMemo(() => {
    if (!shown) return [];
    if (shown.photos.length > 0) return shown.photos;
    return shown.photoUrl ? [{ id: 'cover', url: shown.photoUrl }] : [];
  }, [shown]);

  return (
    <Modal
      animationType={reduceMotion ? 'none' : 'slide'}
      onRequestClose={onClose}
      statusBarTranslucent
      transparent
      visible={Boolean(entry)}
    >
      <View style={{ flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.72)' }}>
        <Pressable
          accessibilityLabel="Cerrar la ficha"
          accessibilityRole="button"
          onPress={onClose}
          style={{ height: insets.top + spacing.lg }}
        />

        <Animated.View
          accessibilityViewIsModal
          style={[
            {
              flex: 1,
              borderTopLeftRadius: radii.xl,
              borderTopRightRadius: radii.xl,
              borderWidth: 1,
              borderColor: colors.borderSubtle,
              backgroundColor: colors.surfaceLow,
              overflow: 'hidden',
            },
            sheetStyle,
          ]}
        >
          {/* El arrastre vive sólo en la cabecera: si tomara la hoja entera
              competiría con el desplazamiento de la lista, y el resultado es
              una hoja que se cierra cuando alguien quería subir una foto. */}
          <GestureDetector gesture={drag}>
            <View style={{ paddingHorizontal: spacing.lg, paddingTop: spacing.sm, gap: spacing.sm }}>
              <View
                accessibilityElementsHidden
                importantForAccessibility="no-hide-descendants"
                style={{
                  alignSelf: 'center',
                  width: 44,
                  height: 4,
                  borderRadius: radii.full,
                  backgroundColor: colors.surfaceHighest,
                }}
              />
              <View
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: spacing.md,
                  paddingBottom: spacing.sm,
                }}
              >
                <View style={{ flex: 1, flexDirection: 'row', alignItems: 'flex-end', gap: 6 }}>
                  <Text
                    accessibilityRole="header"
                    numberOfLines={1}
                    style={{
                      flexShrink: 1,
                      color: colors.text,
                      fontSize: fontSizes.xl,
                      fontWeight: '700',
                      letterSpacing: fontSizes.xl * -0.03,
                    }}
                  >
                    {shown?.displayName ?? ''}
                  </Text>
                  {typeof shown?.age === 'number' ? (
                    <Text style={{ color: colors.textMuted, fontSize: fontSizes.lg }}>
                      {shown.age}
                    </Text>
                  ) : null}
                </View>
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
            </View>
          </GestureDetector>

          <ScrollView
            contentContainerStyle={{
              gap: spacing.lg,
              paddingHorizontal: spacing.lg,
              paddingBottom: insets.bottom + spacing.xl,
            }}
            showsVerticalScrollIndicator={false}
          >
            {photos.map((photo, position) => {
              const section = sections[position];
              return (
                <Fragment key={photo.id}>
                  <Image
                    accessibilityLabel={`Foto ${position + 1} de ${photos.length}`}
                    contentFit="cover"
                    source={{ uri: photo.url }}
                    style={{
                      width: '100%',
                      aspectRatio: 4 / 5,
                      borderRadius: radii.lg,
                      backgroundColor: colors.surfaceHigh,
                    }}
                    transition={200}
                  />
                  {section ? <SectionBlock index={position} section={section} /> : null}
                </Fragment>
              );
            })}

            {/* Las secciones que no llegaron a intercalarse —menos fotos que
                bloques— van seguidas al final, en el mismo orden. */}
            {sections.slice(photos.length).map((section, position) => (
              <SectionBlock
                index={photos.length + position}
                key={section.key}
                section={section}
              />
            ))}

            {photos.length === 0 && sections.length === 0 ? (
              <Text
                style={{
                  color: colors.textMuted,
                  fontSize: fontSizes.sm,
                  fontWeight: semibold,
                  paddingVertical: spacing.xl,
                  textAlign: 'center',
                }}
              >
                Esta persona aún no ha completado su perfil.
              </Text>
            ) : null}
          </ScrollView>
        </Animated.View>
      </View>
    </Modal>
  );
}
