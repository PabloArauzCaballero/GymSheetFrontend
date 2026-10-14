import { LinearGradient } from 'expo-linear-gradient';
import { memo, type ReactNode } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated, { useAnimatedStyle, type SharedValue } from 'react-native-reanimated';
import Svg, { Circle, Defs, Line, RadialGradient, Rect, Stop, SvgXml } from 'react-native-svg';
import { ReppMark } from '@/components/brand/repp-mark';
import { CountUpText } from '@/components/motion';
import {
  alpha,
  brandMarkInk,
  cardFace,
  cardMaterials,
  fontFamilies,
  fontSizes,
  semibold,
  type CardMaterial,
  type CardRarityKey,
} from '@/theme';
import { cardArtTint, cardArtXml, type IllustrationKey } from './art';

/**
 * La carta de logro: forma, material y dibujo. No decide cuándo se mueve:
 * recibe valores compartidos (`sweep`, `tiltX`, `tiltY`) y los traduce a estilo
 * en el hilo de UI. El guion vive en `celebration/stage.tsx`.
 *
 * Todas las medidas salen del ancho, así que la misma carta sirve a 220 pt en
 * la celebración y a 56 pt en la vitrina.
 */

const FRAME = 0.026;
const RADIUS = 0.085;

function Frame({ material, width, children }: { material: CardMaterial; width: number; children: ReactNode }) {
  const pad = Math.max(2, width * FRAME);
  const radius = width * RADIUS;
  return (
    <LinearGradient
      colors={material.frame}
      end={{ x: 1, y: 1 }}
      locations={[0, 0.3, 0.68, 1]}
      start={{ x: 0, y: 0 }}
      style={{ flex: 1, borderRadius: radius, borderCurve: 'continuous', padding: pad }}
    >
      <View
        style={{
          flex: 1,
          borderRadius: radius - pad,
          borderCurve: 'continuous',
          overflow: 'hidden',
          backgroundColor: cardFace.ink,
          borderTopWidth: StyleSheet.hairlineWidth,
          borderLeftWidth: StyleSheet.hairlineWidth,
          borderColor: cardFace.bevelLight,
        }}
      >
        {children}
      </View>
    </LinearGradient>
  );
}

/** Fondo del arte: degradado del material, trama fina y la luz del motivo. */
function ArtBackdrop({ material, tint, width, height }: { material: CardMaterial; tint: string; width: number; height: number }) {
  const lines = Array.from({ length: 9 }, (_, index) => index);
  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      <LinearGradient colors={material.art} end={{ x: 0.5, y: 1 }} start={{ x: 0.5, y: 0 }} style={StyleSheet.absoluteFill} />
      <Svg height={height} width={width}>
        <Defs>
          <RadialGradient cx="50%" cy="42%" id="glow" r="52%">
            <Stop offset="0" stopColor={tint} stopOpacity={0.62} />
            <Stop offset="0.55" stopColor={material.glow} stopOpacity={0.18} />
            <Stop offset="1" stopColor={material.glow} stopOpacity={0} />
          </RadialGradient>
        </Defs>
        {lines.map((index) => (
          <Line
            key={index}
            stroke={material.pattern}
            strokeWidth={width * 0.012}
            x1={-height + (index * (width + height)) / 8}
            x2={(index * (width + height)) / 8}
            y1={height}
            y2={0}
          />
        ))}
        <Circle cx={width / 2} cy={height * 0.42} fill="none" r={width * 0.4} stroke={material.pattern} strokeWidth={width * 0.012} />
        <Rect fill="url(#glow)" height={height} width={width} />
      </Svg>
    </View>
  );
}

/** Foil: una banda de luz que cruza la carta, movida por el reloj y por el dedo. */
function Foil({
  material,
  width,
  height,
  sweep,
  tiltX,
}: {
  material: CardMaterial;
  width: number;
  height: number;
  sweep: SharedValue<number>;
  tiltX: SharedValue<number>;
}) {
  const band = width * 0.7;
  const style = useAnimatedStyle(() => {
    const position = sweep.get() + tiltX.get() * 0.5;
    return {
      opacity: 0.55 + Math.min(0.45, Math.abs(tiltX.get()) * 0.6),
      transform: [{ translateX: -band * 1.5 + position * (width + band * 2) }, { rotate: '20deg' }],
    };
  });
  return (
    <Animated.View pointerEvents="none" style={[{ position: 'absolute', top: -height * 0.3, height: height * 1.6, width: band }, style]}>
      <LinearGradient colors={material.foil} end={{ x: 1, y: 0.5 }} start={{ x: 0, y: 0.5 }} style={{ flex: 1 }} />
    </Animated.View>
  );
}

function Gems({ material, size }: { material: CardMaterial; size: number }) {
  return (
    <View style={{ flexDirection: 'row', gap: size * 0.5 }}>
      {[1, 2, 3, 4].map((index) => (
        <View
          key={index}
          style={{
            width: size,
            height: size,
            borderRadius: size * 0.22,
            transform: [{ rotate: '45deg' }],
            backgroundColor: index <= material.gems ? material.label : alpha(material.label, 0.2),
          }}
        />
      ))}
    </View>
  );
}

export type RewardCardContent = Readonly<{
  rarity: CardRarityKey;
  art: IllustrationKey;
  title: string;
  rarityLabel: string | null;
  points: number;
}>;

/** Cara de la carta. */
export function RewardCardFront({
  width,
  height,
  content,
  sweep,
  tiltX,
  tiltY,
  pointsDelayMs = 0,
}: {
  width: number;
  height: number;
  content: RewardCardContent;
  sweep: SharedValue<number>;
  tiltX: SharedValue<number>;
  tiltY: SharedValue<number>;
  pointsDelayMs?: number;
}) {
  const material = cardMaterials[content.rarity];
  // El pie cabe etiqueta + dos líneas de título + puntos sin pisarse.
  const footer = height * 0.36;
  const artHeight = height - footer;
  const art = width * 0.68;
  // La ilustración flota un poco más que la carta: es lo que da profundidad al inclinarla.
  const parallax = useAnimatedStyle(() => ({
    transform: [{ translateX: tiltX.get() * width * 0.05 }, { translateY: tiltY.get() * width * 0.05 }],
  }));
  const small = fontSizes.xs;
  // Un título largo («Club de los 100 kg») baja un punto en vez de salirse del
  // pie: `adjustsFontSizeToFit` solo encoge por ancho, no por alto.
  const longTitle = content.title.length > 15;
  const titleSize = longTitle ? fontSizes.sm : fontSizes.md;

  return (
    <Frame material={material} width={width}>
      <View style={{ height: artHeight - width * FRAME * 2, alignItems: 'center', justifyContent: 'center' }}>
        <ArtBackdrop height={artHeight} material={material} tint={cardArtTint(content.art)} width={width} />
        <Animated.View style={parallax}>
          <SvgXml height={art} width={art} xml={cardArtXml(content.art)} />
        </Animated.View>
        <View style={{ position: 'absolute', top: width * 0.05, left: width * 0.055 }}>
          <Gems material={material} size={width * 0.036} />
        </View>
      </View>

      <View
        style={{
          flex: 1,
          alignItems: 'center',
          justifyContent: 'center',
          gap: 2,
          overflow: 'hidden',
          paddingHorizontal: width * 0.05,
          borderTopWidth: 1,
          borderTopColor: alpha(material.label, 0.45),
          backgroundColor: cardFace.footer,
        }}
      >
        {content.rarityLabel ? (
          <Text
            allowFontScaling={false}
            // Mayúsculas en JS y con altura de línea holgada: con `textTransform`
            // y la línea justa, la tilde de «COMÚN» y «ÉPICA» se recortaba.
            style={{
              color: material.label,
              fontSize: small,
              lineHeight: Math.round(small * 1.5),
              fontWeight: semibold,
              letterSpacing: small * 0.16,
            }}
          >
            {content.rarityLabel.toLocaleUpperCase('es')}
          </Text>
        ) : null}
        <Text
          adjustsFontSizeToFit
          allowFontScaling={false}
          minimumFontScale={0.75}
          numberOfLines={2}
          style={{
            color: cardFace.title,
            fontFamily: fontFamilies.display,
            fontSize: titleSize,
            lineHeight: Math.round(titleSize * 1.12),
            textAlign: 'center',
          }}
        >
          {content.title}
        </Text>
        {content.points > 0 ? (
          <View style={{ flexDirection: 'row', alignItems: 'baseline' }}>
            <CountUpText
              delayMs={pointsDelayMs}
              prefix="+"
              style={{ color: material.label, fontSize: fontSizes.footnote, fontWeight: semibold, fontVariant: ['tabular-nums'] }}
              suffix=" pts"
              value={content.points}
            />
          </View>
        ) : null}
      </View>

      <Foil height={height} material={material} sweep={sweep} tiltX={tiltX} width={width} />
    </Frame>
  );
}

/** Dorso: la marca REPP sobre la trama del material. */
export function RewardCardBack({ width, height, rarity }: { width: number; height: number; rarity: CardRarityKey }) {
  const material = cardMaterials[rarity];
  const mark = width * 0.4;
  const inset = width * 0.06;
  const rings = [0.34, 0.5, 0.68, 0.9];
  return (
    <Frame material={material} width={width}>
      <LinearGradient colors={[material.art[1], material.art[2], cardFace.ink]} end={{ x: 0.5, y: 1 }} start={{ x: 0.5, y: 0 }} style={StyleSheet.absoluteFill} />
      <View pointerEvents="none" style={StyleSheet.absoluteFill}>
        <Svg height={height} width={width}>
          {rings.map((ratio) => (
            <Circle cx={width / 2} cy={height / 2} fill="none" key={ratio} r={width * ratio} stroke={material.pattern} strokeWidth={width * 0.012} />
          ))}
        </Svg>
      </View>
      <View
        pointerEvents="none"
        style={{
          position: 'absolute',
          top: inset,
          left: inset,
          right: inset,
          bottom: inset,
          borderRadius: width * 0.05,
          borderWidth: 1,
          borderColor: alpha(material.label, 0.35),
        }}
      />
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', gap: width * 0.05 }}>
        <ReppMark ink={brandMarkInk.onDark} size={mark} tick={material.label} />
        <Text
          allowFontScaling={false}
          style={{
            color: material.label,
            fontFamily: fontFamilies.display,
            fontSize: fontSizes.sm,
            letterSpacing: fontSizes.sm * 0.34,
            // El tracking añade aire a la derecha de la última letra; se compensa para centrar.
            marginLeft: fontSizes.sm * 0.34,
          }}
        >
          REPP
        </Text>
      </View>
    </Frame>
  );
}

/**
 * Carta en miniatura para listas y vitrinas: mismo material y mismo dibujo, sin
 * foil ni trama (ochenta a la vez no deben costar ochenta animaciones).
 */
export const MiniRewardCard = memo(function MiniRewardCard({
  width,
  rarity,
  art,
  state = 'earned',
}: {
  width: number;
  rarity: CardRarityKey;
  art: IllustrationKey;
  /** `pending`: apagada, se ve qué es. `veiled`: secreta, no se ve. */
  state?: 'earned' | 'pending' | 'veiled';
}) {
  const material = cardMaterials[rarity];
  const height = width * 1.4;
  const earned = state === 'earned';
  return (
    <View
      style={{
        width,
        height,
        shadowColor: material.shadow,
        shadowOpacity: earned ? 0.45 : 0,
        shadowRadius: width * 0.16,
        shadowOffset: { width: 0, height: width * 0.06 },
      }}
    >
      <Frame material={material} width={width}>
        <LinearGradient
          colors={earned ? material.art : [cardFace.ink, cardFace.ink, cardFace.ink]}
          end={{ x: 0.5, y: 1 }}
          start={{ x: 0.5, y: 0 }}
          style={StyleSheet.absoluteFill}
        />
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', opacity: earned ? 1 : 0.5 }}>
          {state === 'veiled' ? (
            <Text allowFontScaling={false} style={{ color: cardFace.veilInk, fontFamily: fontFamilies.display, fontSize: fontSizes.lg }}>
              ?
            </Text>
          ) : (
            <SvgXml height={width * 0.78} width={width * 0.78} xml={cardArtXml(art, !earned)} />
          )}
        </View>
      </Frame>
    </View>
  );
});
