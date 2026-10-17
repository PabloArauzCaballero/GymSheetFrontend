import { Text, View, type StyleProp, type ViewStyle } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { brandNavy, colors, fontFamilies, fontSizes, onMedia, reppJade } from '@/theme';
import { REPP_MARK_BODY, REPP_MARK_TICK, REPP_MARK_VIEWBOX } from './mark';

/** El signo REPP. Por defecto, tinta clara con la raya en el acento. */
export function ReppMark({ size, ink, tick }: { size: number; ink?: string; tick?: string }) {
  return (
    <Svg accessibilityElementsHidden height={size} importantForAccessibility="no" viewBox={REPP_MARK_VIEWBOX} width={size}>
      <Path d={REPP_MARK_BODY} fill={ink ?? colors.text} fillRule="evenodd" />
      <Path d={REPP_MARK_TICK} fill={tick ?? colors.volt} />
    </Svg>
  );
}

/** El signo sobre su ficha navy, como en la identidad: icono, arranque y acceso. */
export function ReppBadge({ size, style }: { size: number; style?: StyleProp<ViewStyle> }) {
  return (
    <View
      style={[
        {
          width: size,
          height: size,
          borderRadius: size * 0.26,
          borderCurve: 'continuous',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: brandNavy,
        },
        style,
      ]}
    >
      <ReppMark ink={onMedia.text} size={size * 0.72} tick={reppJade} />
    </View>
  );
}

/** Logotipo: signo + «REPP» en la display. */
export function ReppLogo({ height = 28, color }: { height?: number; color?: string }) {
  const size = Math.max(fontSizes.md, Math.round(height * 0.92));
  return (
    <View accessibilityLabel="REPP" accessible style={{ flexDirection: 'row', alignItems: 'center', gap: height * 0.28 }}>
      <ReppMark ink={color} size={height} />
      <Text
        allowFontScaling={false}
        style={{
          color: color ?? colors.text,
          fontFamily: fontFamilies.display,
          fontSize: size,
          lineHeight: Math.round(size * 1.1),
          letterSpacing: size * 0.04,
        }}
      >
        REPP
      </Text>
    </View>
  );
}
