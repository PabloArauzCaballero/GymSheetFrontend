import { memo } from 'react';
import { StyleSheet, View } from 'react-native';
import Svg, { Circle, Defs, G, Path, Pattern, Rect } from 'react-native-svg';
import { chatColors, colors } from '@/theme';

const TILE = 132;

/**
 * El fondo del hilo: el lienzo de la app con una trama de gimnasio (mancuernas,
 * discos, cronómetros) casi invisible, como el papel tapiz de WhatsApp. Es
 * textura, no información: no se anima y no capta toques.
 */
export const ChatWallpaper = memo(function ChatWallpaper() {
  const stroke = chatColors.wallpaperGlyph;
  return (
    <View pointerEvents="none" style={[StyleSheet.absoluteFill, { backgroundColor: colors.background }]}>
      <Svg height="100%" width="100%">
        <Defs>
          <Pattern height={TILE} id="chat-wallpaper" patternUnits="userSpaceOnUse" width={TILE}>
            <G fill="none" stroke={stroke} strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.6}>
              {/* Mancuerna */}
              <Path d="M14 22h18M10 17v10M36 17v10M7 19v6M39 19v6" />
              {/* Disco */}
              <Circle cx={92} cy={24} r={11} />
              <Circle cx={92} cy={24} r={3} />
              {/* Cronómetro */}
              <Circle cx={30} cy={84} r={10} />
              <Path d="M30 78v6l4 3M27 71h6" />
              {/* Rayo */}
              <Path d="M98 70l-8 13h7l-4 12 10-15h-7l4-10z" />
              {/* Corazón (pulso) */}
              <Path d="M58 118c-6-4-10-7-10-11a4.5 4.5 0 0 1 9-1 4.5 4.5 0 0 1 9 1c0 4-4 7-8 11z" />
              {/* Pesa rusa */}
              <Path d="M112 112a8 8 0 1 0 12 0zM114 104a4 4 0 0 1 8 0" />
              <Path d="M62 52h6M65 49v6" />
            </G>
          </Pattern>
        </Defs>
        <Rect fill="url(#chat-wallpaper)" height="100%" width="100%" />
      </Svg>
    </View>
  );
});
