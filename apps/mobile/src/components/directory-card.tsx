import { useEffect } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { Text, View } from 'react-native';
import type { GymDirectoryEntry } from '@gymsheet/schemas';
import { initialsOf } from '@/lib/format';
import {
  EXPERIENCE_LEVEL_LABEL,
  SOCIAL_STATUS_LABEL,
  TRAINING_GOAL_LABEL,
} from '@/lib/social-labels';
import {
  accentPolicy,
  colors,
  fontSizes,
  iconSizes,
  minTouchTarget,
  radii,
  semibold,
  spacing,
} from '@/theme';

/** «GYM_RAT» → «Gym Rat»: el catálogo de rangos no expone un nombre aparte del código. */
export function levelTitle(code: string): string {
  return code
    .toLowerCase()
    .split('_')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

/**
 * El indicador de información vive en una esquina de medidas fijas a propósito.
 *
 * La baraja no puede permitirse un `Pressable` anidado dentro del detector de
 * gestos: el toque que abre la ficha y el toque que pasa de foto son el mismo
 * evento, y quien decide cuál es cuál es el gesto del padre, por geometría. Que
 * el tamaño y el margen sean constantes exportadas es lo que permite a la
 * pantalla recalcular ese rectángulo sin copiar números a ojo.
 *
 * Por eso lo que se pinta aquí es un `View` accesible y no un botón pulsable:
 * dibuja la esquina, anuncia la acción al lector de pantalla y no compite por
 * el toque con el gesto que lo reparte. Ver el detalle abajo, en el JSX.
 */
export const INFO_BUTTON_SIZE = minTouchTarget;
export const INFO_BUTTON_INSET = spacing.md;

/** Alto de cada barra del carrusel. Tres puntos: se ve, no pesa. */
const SEGMENT_HEIGHT = 3;

/**
 * El degradado del pie.
 *
 * Un `rgba(0,0,0,0.55)` plano —lo que había aquí— deja un corte horizontal
 * visible a media foto, y ese corte es el detalle que separa una tarjeta hecha
 * de una tarjeta improvisada. Tres paradas, no dos: con dos, el tramo medio
 * sube demasiado rápido y vuelve a leerse como una banda.
 */
const SCRIM_BOTTOM = ['rgba(0,0,0,0)', 'rgba(0,0,0,0.45)', 'rgba(0,0,0,0.88)'] as const;

/** Cabecera: sólo lo justo para que las barras blancas no se pierdan en una foto clara. */
const SCRIM_TOP = ['rgba(0,0,0,0.45)', 'rgba(0,0,0,0)'] as const;

/** Paradas del degradado del pie: el tramo medio es el que evita la banda. */
const SCRIM_BOTTOM_STOPS = [0, 0.45, 1] as const;

/** La galería real: `photos` cuando llega, y si no, la portada como única foto. */
function galleryOf(entry: GymDirectoryEntry): { id: string; url: string }[] {
  if (entry.photos.length > 0) return entry.photos;
  return entry.photoUrl ? [{ id: 'cover', url: entry.photoUrl }] : [];
}

/**
 * La cara de una persona: foto grande y, encima de ella, lo que hace falta para
 * decidir —nombre, edad, objetivo, sucursal y experiencia—.
 *
 * Es sólo la superficie: ni gesto de arrastre ni botones de decisión. Así la
 * misma tarjeta sirve para la baraja de descubrimiento, donde se decide
 * arrastrando, y para cualquier lista donde se decide pulsando un botón debajo.
 *
 * Todo lo que la baraja necesita de más —ocupar la pantalla, el carrusel, el
 * acceso a la ficha— entra por props opcionales: llamada sólo con `entry` sigue
 * siendo exactamente la tarjeta 4:5 que pinta Comunidad.
 *
 * Lo que ya no pinta, y por qué: cinco chips con icono (género, rango, puntos)
 * repartidos sobre la foto. Eran cinco objetos del mismo peso compitiendo por
 * el mismo sitio, y a esa densidad nadie lee ninguno. El rango, los puntos y el
 * género se leen enteros en la ficha ampliada, que es donde alguien los busca.
 */
export function DirectoryCardFace({
  entry,
  fill = false,
  onInfoPress,
  onStepPhoto,
  photoIndex = 0,
}: {
  entry: GymDirectoryEntry;
  /** Ocupa el contenedor entero en vez de reservar un 4:5. Lo usa la baraja. */
  fill?: boolean;
  /**
   * Si se pasa, aparece el indicador de la esquina que lleva a la ficha ampliada.
   *
   * El toque de esa esquina no llega por aquí: lo reparte el gesto de la
   * pantalla por geometría. Esta función la dispara el lector de pantalla, que
   * no pasa por el sistema de toques, mediante la acción `activate`.
   */
  onInfoPress?: () => void;
  /**
   * Mover el carrusel una foto adelante (+1) o atrás (−1).
   *
   * No lo usa el toque —de eso se encarga el gesto de la pantalla— sino el
   * lector de pantalla: los tercios táctiles son invisibles para quien navega
   * por elementos, y sin esto la galería quedaría congelada en la portada.
   */
  onStepPhoto?: (delta: number) => void;
  /** Foto visible del carrusel. La posición la lleva quien recibe el toque. */
  photoIndex?: number;
}) {
  const photos = galleryOf(entry);
  const index = Math.min(Math.max(photoIndex, 0), Math.max(photos.length - 1, 0));
  const current = photos[index] ?? null;
  // La siguiente foto se descarga antes de que nadie la pida: sin esto, el
  // primer toque del carrusel muestra un hueco gris y la ilusión se rompe justo
  // en el gesto que la tarjeta existe para ofrecer.
  const nextUrl = photos[index + 1]?.url ?? null;

  useEffect(() => {
    if (nextUrl) void Image.prefetch(nextUrl);
  }, [nextUrl]);

  const meta = [
    entry.objetivo ? (TRAINING_GOAL_LABEL[entry.objetivo] ?? entry.objetivo) : null,
    entry.branchName,
    entry.experienceLevel
      ? (EXPERIENCE_LEVEL_LABEL[entry.experienceLevel] ?? entry.experienceLevel)
      : null,
  ]
    .filter((part): part is string => Boolean(part))
    .join(' · ');

  const nameSize = fill ? fontSizes['2xl'] : fontSizes.lg;

  // Las barras sólo aparecen donde el carrusel se puede recorrer de verdad.
  // Pintarlas en una lista, donde la tarjeta entera abre el perfil, prometería
  // una navegación que allí no existe, y una promesa así se nota al primer
  // toque que no hace nada.
  const showSegments = photos.length > 1 && Boolean(onStepPhoto);

  return (
    <View
      style={[
        { backgroundColor: colors.surfaceHigh, overflow: 'hidden' },
        fill ? { flex: 1 } : { aspectRatio: 4 / 5 },
      ]}
    >
      {current ? (
        <Image
          contentFit="cover"
          source={{ uri: current.url }}
          style={{ position: 'absolute', top: 0, right: 0, bottom: 0, left: 0 }}
          // Entre fotos de la misma persona el cruce es corto: es navegación
          // dentro de una tarjeta, no la entrada de una tarjeta nueva.
          transition={140}
        />
      ) : (
        <View
          style={{
            position: 'absolute',
            top: 0,
            right: 0,
            bottom: 0,
            left: 0,
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: colors.surfaceHigh,
          }}
        >
          <View
            style={{
              width: 96,
              height: 96,
              borderRadius: radii.full,
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: colors.volt,
            }}
          >
            <Text style={{ color: colors.background, fontSize: fontSizes.xl, fontWeight: '700' }}>
              {initialsOf(entry.displayName, undefined)}
            </Text>
          </View>
        </View>
      )}

      {showSegments ? (
        <>
          <LinearGradient
            colors={SCRIM_TOP}
            pointerEvents="none"
            style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 72 }}
          />
          {/* Este contenedor es el único camino que tiene un lector de pantalla
              para recorrer la galería —los tercios táctiles son invisibles para
              quien navega por elementos—, así que no puede llevar
              `pointerEvents="none"`: en iOS eso pone `userInteractionEnabled` a
              falso y con ello se apagan las acciones de accesibilidad que
              cuelgan de aquí, que eran justo el camino que se quería dar.

              `box-none` hace lo que hacía falta y nada más: la vista no es
              nunca el destino de un toque —el gesto del padre sigue siendo el
              único que reparte—, pero no se toca la interacción de la vista, de
              modo que «Siguiente foto» y «Foto anterior» siguen siendo
              alcanzables. */}
          <View
            accessible
            accessibilityActions={
              onStepPhoto
                ? [
                    { name: 'nextPhoto', label: 'Siguiente foto' },
                    { name: 'previousPhoto', label: 'Foto anterior' },
                  ]
                : undefined
            }
            accessibilityLabel={`Foto ${index + 1} de ${photos.length}`}
            onAccessibilityAction={(event) => {
              if (!onStepPhoto) return;
              if (event.nativeEvent.actionName === 'nextPhoto') onStepPhoto(1);
              if (event.nativeEvent.actionName === 'previousPhoto') onStepPhoto(-1);
            }}
            pointerEvents="box-none"
            style={{
              position: 'absolute',
              top: spacing.sm,
              left: spacing.sm,
              right: spacing.sm,
              flexDirection: 'row',
              gap: 4,
            }}
          >
            {photos.map((photo, position) => (
              <View
                key={photo.id}
                style={{
                  flex: 1,
                  height: SEGMENT_HEIGHT,
                  borderRadius: radii.full,
                  backgroundColor:
                    position === index ? 'rgba(255,255,255,0.95)' : 'rgba(255,255,255,0.30)',
                }}
              />
            ))}
          </View>
        </>
      ) : null}

      <LinearGradient
        colors={SCRIM_BOTTOM}
        locations={SCRIM_BOTTOM_STOPS}
        pointerEvents="none"
        style={{
          position: 'absolute',
          left: 0,
          right: 0,
          bottom: 0,
          paddingHorizontal: spacing.lg,
          paddingBottom: spacing.md,
          paddingTop: spacing['2xl'],
        }}
      >
        <View style={{ paddingRight: onInfoPress ? INFO_BUTTON_SIZE : 0 }}>
          {/* Nombre y edad en una línea, con el peso separando a uno de otra:
              es la firma tipográfica de la baraja, y por eso no se parte en dos
              renglones aunque el nombre sea largo. */}
          <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 6 }}>
            <Text
              numberOfLines={1}
              style={{
                flexShrink: 1,
                color: '#fff',
                fontSize: nameSize,
                fontWeight: '700',
                letterSpacing: nameSize * -0.02,
              }}
            >
              {entry.displayName}
            </Text>
            {typeof entry.age === 'number' ? (
              <Text
                style={{
                  color: 'rgba(255,255,255,0.92)',
                  fontSize: nameSize * 0.82,
                  fontWeight: '400',
                }}
              >
                {entry.age}
              </Text>
            ) : null}
          </View>

          {meta ? (
            <Text
              numberOfLines={2}
              style={{
                color: 'rgba(255,255,255,0.86)',
                fontSize: fontSizes.sm,
                lineHeight: 19,
                marginTop: 2,
              }}
            >
              {meta}
            </Text>
          ) : null}

          {entry.socialStatus ? (
            <Text
              style={{
                color: accentPolicy.ink,
                fontSize: fontSizes.xs,
                fontWeight: semibold,
                marginTop: spacing.xs,
              }}
            >
              {SOCIAL_STATUS_LABEL[entry.socialStatus]}
            </Text>
          ) : null}
        </View>
      </LinearGradient>

      {onInfoPress ? (
        /*
         * Una sola autoridad para el toque, y no es esta.
         *
         * Aquí había un `Pressable` **además** de la rama geométrica del gesto
         * de la pantalla: dos manejadores para el mismo evento. En el caso
         * feliz no se notaba porque abrir la ficha es idempotente, pero un
         * responder de React Native viviendo dentro de un `GestureDetector`
         * deja en manos de la plataforma y de la versión de la librería de
         * gestos quién gana al apoyar el dedo en esta esquina y arrastrar.
         *
         * Así que el toque lo reparte entero el gesto, por geometría, y esto es
         * un `View`: pinta la esquina y no reclama el responder. Lo que el
         * `Pressable` sí aportaba —el nombre accesible— se conserva declarando
         * el elemento accesible con rol de botón y la acción estándar
         * `activate`, que es la que VoiceOver y TalkBack disparan al activarlo.
         * Las acciones de accesibilidad no viajan por el sistema de toques, de
         * modo que este camino y el del gesto nunca se cruzan.
         */
        <View
          accessible
          accessibilityActions={[{ name: 'activate', label: 'Ver la ficha completa' }]}
          accessibilityLabel={`Ver la ficha completa de ${entry.displayName}`}
          accessibilityRole="button"
          onAccessibilityAction={(event) => {
            if (event.nativeEvent.actionName === 'activate') onInfoPress();
          }}
          // Nunca destino de un toque, pero sí alcanzable por el lector de
          // pantalla: `none` apagaría también la accesibilidad (ver arriba).
          pointerEvents="box-none"
          style={{
            position: 'absolute',
            right: INFO_BUTTON_INSET,
            bottom: INFO_BUTTON_INSET,
            width: INFO_BUTTON_SIZE,
            height: INFO_BUTTON_SIZE,
            alignItems: 'center',
            justifyContent: 'center',
            borderRadius: radii.full,
            backgroundColor: 'rgba(0,0,0,0.35)',
          }}
        >
          <Ionicons color="#fff" name="information-circle-outline" size={iconSizes.lg} />
        </View>
      ) : null}
    </View>
  );
}
