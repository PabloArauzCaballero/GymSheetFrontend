import type { ReactNode } from 'react';
import { View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { footerFade, gutter, spacing } from '@/theme';

/** Alto que ocupa el pie (botón de 56 + relleno): el final del scroll lo reserva. */
export const STICKY_FOOTER_SPACE = 56 + spacing.lg;

/**
 * Pie fijo con la acción principal de la pantalla (C8.2). Se pasa como
 * `overlay` de `ScrollScreen`, que ya lo coloca por encima de la barra de
 * pestañas y de `insets.bottom`; quien lo usa añade `StickyFooterSpacer` al
 * final del contenido para que nada quede tapado.
 */
export function StickyFooter({ children }: { children: ReactNode }) {
  return (
    <View>
      {/* Sin caja alrededor del botón: el contenido se disuelve en el lienzo
          por debajo de él (velo), y el botón flota con su propio halo. */}
      <LinearGradient
        colors={footerFade}
        locations={[0, 0.45, 1]}
        pointerEvents="none"
        style={{
          position: 'absolute',
          left: -gutter,
          right: -gutter,
          top: -spacing.xl,
          bottom: -spacing.xl,
        }}
      />
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>{children}</View>
    </View>
  );
}

/** Hueco al final del scroll del tamaño del pie fijo. */
export function StickyFooterSpacer() {
  return <View style={{ height: STICKY_FOOTER_SPACE }} />;
}
