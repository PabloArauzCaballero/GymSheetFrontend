import type { ReactNode } from 'react';
import { View } from 'react-native';
import { alpha, colors, radii, shadows, spacing } from '@/theme';

/** Alto que ocupa el pie (botón de 56 + relleno): el final del scroll lo reserva. */
export const STICKY_FOOTER_SPACE = 56 + spacing.sm * 2 + spacing.md;

/**
 * Pie fijo con la acción principal de la pantalla (C8.2). Se pasa como
 * `overlay` de `ScrollScreen`, que ya lo coloca por encima de la barra de
 * pestañas y de `insets.bottom`; quien lo usa añade `StickyFooterSpacer` al
 * final del contenido para que nada quede tapado.
 */
export function StickyFooter({ children }: { children: ReactNode }) {
  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.sm,
        padding: spacing.sm,
        borderRadius: radii.xxl,
        borderCurve: 'continuous',
        backgroundColor: alpha(colors.surfaceHigh, 0.96),
        boxShadow: shadows.e3,
      }}
    >
      {children}
    </View>
  );
}

/** Hueco al final del scroll del tamaño del pie fijo. */
export function StickyFooterSpacer() {
  return <View style={{ height: STICKY_FOOTER_SPACE }} />;
}
