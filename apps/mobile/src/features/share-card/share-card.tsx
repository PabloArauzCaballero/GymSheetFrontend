import { LinearGradient } from 'expo-linear-gradient';
import { StyleSheet, View } from 'react-native';
import { ReppLogo, ReppMark } from '@/components/brand/repp-mark';
import { Text } from '@/components/text';
import { colors, heroGlow, heroWatermarkInk, metricColors, radii, shareCardHeroFontSize, spacing, useActiveTenant } from '@/theme';

/** Tamaño en puntos; se captura a 1080 × 1920 (formato historia, 9:16). */
export const SHARE_CARD_WIDTH = 360;
export const SHARE_CARD_HEIGHT = 640;

export type ShareCardData = {
  /** Qué es: «Sesión terminada · Torso A», «Mi perfil». */
  kicker: string;
  /** La cifra protagonista, ya formateada. */
  hero: string;
  /** Su unidad, al lado y en pequeño («kg movidos»). */
  heroUnit?: string;
  /** Línea dorada opcional: récords, rango. */
  highlight?: string | null;
  /** Hasta tres hechos en columnas. */
  stats: readonly { value: string; label: string }[];
  /** Nombre de quien comparte, abajo, junto a la marca. */
  author?: string | null;
};

/**
 * La tarjeta que sale de la app como imagen (marketing-ideas #102 social
 * screenshots y #87 powered by): el mismo lenguaje que `HeroSurface`, a
 * pantalla de historia y con la marca arriba y abajo. Estática: se monta fuera
 * de pantalla solo mientras se captura (`use-share-card.tsx`).
 */
export function ShareCard({ data }: { data: ShareCardData }) {
  const tenant = useActiveTenant();
  const isRepp = tenant.id === 'gymsheet';
  return (
    <View
      style={{
        width: SHARE_CARD_WIDTH,
        height: SHARE_CARD_HEIGHT,
        padding: spacing.lg,
        backgroundColor: colors.background,
        justifyContent: 'space-between',
        overflow: 'hidden',
      }}
    >
      <LinearGradient
        colors={heroGlow(colors.volt)}
        end={{ x: 0.9, y: 0.75 }}
        locations={[0, 0.5, 1]}
        start={{ x: 0, y: 0 }}
        style={StyleSheet.absoluteFill}
      />
      <View style={{ position: 'absolute', right: -spacing.xxl, bottom: spacing.xxl * 2 }}>
        <ReppMark ink={heroWatermarkInk} size={300} tick={heroWatermarkInk} />
      </View>

      {isRepp ? <ReppLogo height={26} /> : <Text variant="title">{tenant.name}</Text>}

      <View style={{ gap: spacing.md }}>
        <Text numberOfLines={2} strong tone="secondary" variant="subhead">
          {data.kicker}
        </Text>
        <View style={{ gap: spacing.xxs }}>
          <Text
            adjustsFontSizeToFit
            minimumFontScale={0.5}
            numberOfLines={1}
            style={{ fontSize: shareCardHeroFontSize, lineHeight: Math.round(shareCardHeroFontSize * 1.02) }}
            variant="hero"
          >
            {data.hero}
          </Text>
          {data.heroUnit ? (
            <Text tone="secondary" variant="title">
              {data.heroUnit}
            </Text>
          ) : null}
        </View>
        {data.highlight ? (
          <View
            style={{
              alignSelf: 'flex-start',
              paddingHorizontal: spacing.smd,
              paddingVertical: spacing.xs,
              borderRadius: radii.full,
              borderWidth: 1,
              borderColor: metricColors.record.edge,
              backgroundColor: metricColors.record.tint,
            }}
          >
            <Text strong style={{ color: metricColors.record.ink }} variant="footnote">
              {data.highlight}
            </Text>
          </View>
        ) : null}
        {data.stats.length > 0 ? (
          <View style={{ flexDirection: 'row', gap: spacing.md, paddingTop: spacing.sm }}>
            {data.stats.slice(0, 3).map((stat) => (
              <View key={stat.label} style={{ flex: 1, gap: spacing.xxs }}>
                <Text adjustsFontSizeToFit minimumFontScale={0.7} numberOfLines={1} variant="numeric">
                  {stat.value}
                </Text>
                <Text numberOfLines={1} tone="muted" variant="footnote">
                  {stat.label}
                </Text>
              </View>
            ))}
          </View>
        ) : null}
      </View>

      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        <Text numberOfLines={1} style={{ flex: 1 }} tone="secondary" variant="footnote">
          {data.author ?? ''}
        </Text>
        <Text tone="accent" strong variant="footnote">
          {`Entrena en ${tenant.name}`}
        </Text>
      </View>
    </View>
  );
}
