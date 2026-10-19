import { Link } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { useWindowDimensions, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { Routine, TrainingGoal } from '@gymsheet/types';
import { GlassButton } from '@/components/hero-bar';
import { PersonAvatar } from '@/components/person-avatar';
import { Text } from '@/components/text';
import { GOAL_LABEL } from '@/lib/format';
import { MediaChip } from '@/features/routine-catalog/media-chip';
import { planLine, SocialProof } from '@/features/routine-catalog/routine-card';
import { RoutineCover } from '@/features/routine-catalog/routine-cover';
import { coverImageUri } from '@/features/routine-detail/routine-plan';
import { gutter, heroTopScrim, ink, onMedia, spacing } from '@/theme';

/** Alto de la portada del detalle para un ancho de pantalla y un área segura. */
export function heroHeightFor(width: number, topInset: number): number {
  // ≈ 4:3 con tope: más alta, la lámina (850×567) se ampliaba más del doble a
  // 3× y se veía blanda; más baja, el título a tres líneas no cabe.
  return Math.min(440, Math.max(320, Math.round(width * 0.9))) + topInset * 0.5;
}

export type HeroContent = {
  nombre: string;
  objetivo: TrainingGoal | null;
  portadaUrl: string | null | undefined;
  diasPorSemana: number;
  duracionSemanas: number | null;
  esOficial?: boolean;
  /** `null`: no es mía (no se dice si es pública o privada). */
  visibilidadPropia?: 'PUBLIC' | 'PRIVATE' | null;
  /**
   * Prueba social (#98): quién la hizo, la nota y las descargas. Solo llega
   * con la rutina entera y solo si la comunidad la ve; sin ella, la portada
   * dice qué es («4 días por semana · 8 semanas»).
   */
  social?: HeroSocial | null;
};

export type HeroSocial = {
  author: { id: string; name: string; photoUrl?: string | null; official?: boolean } | null;
  valoracion: Routine['valoracion'];
  copias: number;
};

/** Autor, nota y descargas en una fila sobre el velo: lo primero que se lee tras el nombre. */
function HeroSocialRow({ social }: { social: HeroSocial }) {
  return (
    <View
      style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm, minHeight: 32 }}
      testID="routine-author"
    >
      {social.author ? (
        <>
          <PersonAvatar
            id={social.author.id}
            name={social.author.name}
            official={social.author.official}
            photoUrl={social.author.photoUrl}
            ring
            size={28}
          />
          <Text numberOfLines={1} strong style={{ flexShrink: 1, color: onMedia.text }} variant="subhead">
            {social.author.name}
          </Text>
          <Text style={{ color: onMedia.textMuted }} variant="subhead">
            ·
          </Text>
        </>
      ) : null}
      <SocialProof copias={social.copias} overMedia valoracion={social.valoracion} />
    </View>
  );
}

/**
 * Portada del detalle: la imagen de un ejercicio a todo el ancho con un velo
 * hacia el lienzo; encima, el objetivo, el título y, en una fila, quién la hizo
 * con su nota y sus descargas (o «3 días por semana · 8 semanas» si no hay
 * comunidad). Portada, nombre y prueba social se leen como una sola cabecera;
 * las cifras del plan van justo debajo, en `DetailHeader`. Volver y ⋯ van en la barra fija (`HeroBar`), que no se va
 * con el scroll. Es el destino de la transición de zoom de la tarjeta, y por
 * eso se puede pintar con lo que ya sabía la tarjeta (`HeroContent`) antes de
 * que llegue la rutina entera: la foto crece hacia sí misma, no hacia un hueco.
 */
export function DetailHero({ content }: { content: HeroContent }) {
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const height = heroHeightFor(width, insets.top);
  const plan = planLine(content);

  return (
    <Link.AppleZoomTarget>
      <View>
        <RoutineCover goal={content.objetivo} instant style={{ height }} uri={content.portadaUrl}>
          <LinearGradient
            colors={heroTopScrim}
            pointerEvents="none"
            style={{ position: 'absolute', top: 0, left: 0, right: 0, height: insets.top + 96 }}
          />
          <View
            style={{
              position: 'absolute',
              left: gutter,
              right: gutter,
              bottom: spacing.lg,
              gap: spacing.smd,
            }}
          >
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm }}>
              {content.esOficial ? <MediaChip icon="checkmark-circle" label="Recomendada por REPP" /> : null}
              {content.objetivo ? <MediaChip label={GOAL_LABEL[content.objetivo]} /> : null}
              {!content.esOficial && content.visibilidadPropia ? (
                <MediaChip
                  icon={content.visibilidadPropia === 'PUBLIC' ? 'globe-outline' : 'lock-closed-outline'}
                  label={content.visibilidadPropia === 'PUBLIC' ? 'Pública' : 'Privada'}
                />
              ) : null}
            </View>
            <Text
              accessibilityLabel={`${content.nombre}. ${plan}`}
              accessibilityRole="header"
              numberOfLines={3}
              style={{ color: ink.white }}
              testID="routine-title"
              variant="display"
            >
              {content.nombre}
            </Text>
            {content.social ? (
              <HeroSocialRow social={content.social} />
            ) : (
              <Text numberOfLines={1} style={{ color: onMedia.textSoft }} tabular variant="subhead">
                {plan}
              </Text>
            )}
          </View>
        </RoutineCover>
      </View>
    </Link.AppleZoomTarget>
  );
}

/** Quién firma la rutina en la portada: el equipo REPP, tú o su autor. */
function heroAuthorOf(routine: Routine): HeroSocial['author'] {
  if (routine.esOficial) return { id: 'repp', name: 'Equipo REPP', official: true };
  if (routine.esMia) return { id: routine.autor?.id ?? 'me', name: 'Tú', photoUrl: routine.autor?.fotoUrl };
  return routine.autor
    ? { id: routine.autor.id, name: routine.autor.nombre, photoUrl: routine.autor.fotoUrl }
    : null;
}

/** Lo que la portada necesita, sacado de la rutina completa. */
export function heroContentOf(routine: Routine): HeroContent {
  const community = routine.visibilidad === 'PUBLIC' || routine.esOficial || routine.copias > 0;
  return {
    social: community
      ? { author: heroAuthorOf(routine), valoracion: routine.valoracion, copias: routine.copias }
      : null,
    nombre: routine.nombre,
    objetivo: routine.objetivo,
    portadaUrl: routine.portadaUrl ?? coverImageUri(routine),
    diasPorSemana: routine.dias.length,
    duracionSemanas: routine.duracionSemanas,
    esOficial: routine.esOficial,
    visibilidadPropia: routine.esMia ? (routine.visibilidad === 'PUBLIC' ? 'PUBLIC' : 'PRIVATE') : null,
  };
}

export { GlassButton };
