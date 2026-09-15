import type { ReactElement, ReactNode } from 'react';
import { ActivityIndicator, FlatList, StatusBar, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AmbientBackground } from '@/components/ambient';
import { useResponsive } from '@/components/layout';
import { PressableScale } from '@/components/motion';
import {
  colors,
  fontSizes,
  maxContentWidth,
  maxWideContentWidth,
  minTouchTarget,
  radii,
  screenGap,
  semibold,
  spacing,
} from '@/theme';

/**
 * Un selector de dos o tres opciones excluyentes.
 *
 * Deliberadamente neutro: el segmento activo se levanta con una superficie más
 * clara y tinta plena, no con el acento. La política de acento de esta app
 * reserva `colors.volt` para la acción primaria y para el número protagonista,
 * y aquí la acción primaria es el botón «Conectar» de cada tarjeta — si el
 * selector también fuera volt competirían, y ganaría el que ocupa más ancho,
 * que es justamente el que no hay que pulsar.
 */
export function Segmented<T extends string>({
  options,
  value,
  onChange,
}: {
  options: readonly { value: T; label: string; count?: number }[];
  value: T;
  onChange: (value: T) => void;
}) {
  return (
    <View
      // `tablist` no existe en el árbol de accesibilidad nativo; lo que hace
      // navegable esto es que cada segmento se anuncia con su estado.
      style={{
        flexDirection: 'row',
        gap: 2,
        padding: 2,
        borderRadius: radii.full,
        borderWidth: 1,
        borderColor: colors.borderSubtle,
        backgroundColor: colors.surfaceLow,
      }}
    >
      {options.map((option) => {
        const active = option.value === value;
        const suffix = typeof option.count === 'number' && option.count > 0 ? ` (${option.count})` : '';
        return (
          <PressableScale
            accessibilityLabel={`${option.label}${suffix}${active ? ', seleccionado' : ''}`}
            key={option.value}
            onPress={() => onChange(option.value)}
            style={{
              flex: 1,
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'center',
              gap: spacing.xs,
              // El objetivo táctil es el `Pressable`, no la píldora que lo
              // rodea, así que los 44 puntos van aquí: contar el relleno del
              // contenedor para llegar al mínimo es contar sitio que no
              // responde al dedo.
              height: minTouchTarget,
              borderRadius: radii.full,
              backgroundColor: active ? colors.surfaceHighest : 'transparent',
            }}
          >
            <Text
              numberOfLines={1}
              style={{
                color: active ? colors.text : colors.textMuted,
                fontSize: fontSizes.sm,
                fontWeight: active ? semibold : '400',
              }}
            >
              {option.label}
            </Text>
            {typeof option.count === 'number' && option.count > 0 ? (
              <Text
                style={{
                  color: active ? colors.textMuted : colors.textDisabled,
                  fontSize: fontSizes.xs,
                  fontVariant: ['tabular-nums'],
                }}
              >
                {option.count}
              </Text>
            ) : null}
          </PressableScale>
        );
      })}
    </View>
  );
}

/**
 * El armazón de la pantalla de Interacciones.
 *
 * No reutiliza `ScrollScreen` porque una de las tres pestañas necesita paginar
 * al llegar al final, y un `ScrollView` no avisa de eso: no expone
 * `onEndReached` ni el `onScroll` que haría falta para deducirlo. Meter una
 * `FlatList` dentro de un `ScrollView` tampoco vale —se anula la
 * virtualización y React Native lo advierte en consola—, así que la lista
 * **es** la pantalla y la cabecera viaja como `ListHeaderComponent`.
 *
 * Los márgenes son los mismos que calcula `ScrollScreen`: área segura por los
 * cuatro lados, y todo el ancho sobrante convertido en canal a partir del
 * ancho cómodo de lectura, para que en una tableta no queden líneas de metro y
 * medio.
 */
export function InteractionsList<T>({
  data,
  keyExtractor,
  renderItem,
  header,
  empty,
  footer,
  numColumns = 1,
  listKey,
  onEndReached,
  onRefresh,
  refreshing = false,
}: {
  data: readonly T[];
  keyExtractor: (item: T) => string;
  renderItem: (item: T, index: number) => ReactElement | null;
  header: ReactNode;
  /** Cargando, error o vacío: los tres viven aquí, nunca uno en lugar de otro. */
  empty: ReactNode;
  footer?: ReactNode;
  numColumns?: 1 | 2;
  /**
   * `FlatList` no admite cambiar `numColumns` en caliente; hay que remontarla.
   * Esta clave lo hace explícito en vez de dejar que el aviso salte en consola.
   */
  listKey: string;
  onEndReached?: () => void;
  onRefresh?: () => void;
  refreshing?: boolean;
}) {
  const insets = useSafeAreaInsets();
  const { wide, width } = useResponsive();
  const gutter = Math.max(spacing.lg, (width - (wide ? maxWideContentWidth : maxContentWidth)) / 2);
  // En Android el inset seguro puede quedarse corto respecto a la barra de
  // estado realmente dibujada, y el contenido desplazado se lee bajo el reloj.
  const topInset = Math.max(insets.top, StatusBar.currentHeight ?? 0);

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <AmbientBackground />
      <FlatList<T>
        columnWrapperStyle={numColumns > 1 ? { gap: spacing.md } : undefined}
        contentContainerStyle={{
          paddingTop: topInset + spacing.xl,
          paddingBottom: insets.bottom + spacing['2xl'],
          paddingLeft: gutter + insets.left,
          paddingRight: gutter + insets.right,
          gap: numColumns > 1 ? spacing.md : screenGap / 2,
        }}
        data={data as T[]}
        key={listKey}
        keyExtractor={keyExtractor}
        ListEmptyComponent={<View style={{ gap: spacing.md }}>{empty}</View>}
        ListFooterComponent={footer ? <View>{footer}</View> : null}
        ListHeaderComponent={<View style={{ gap: spacing.md, paddingBottom: spacing.sm }}>{header}</View>}
        numColumns={numColumns}
        onEndReached={onEndReached}
        // 0.4 y no 0.1: en una lista de filas cortas el final llega antes de
        // que la petición vuelva, y el usuario ve el hueco del final antes que
        // la siguiente página.
        onEndReachedThreshold={0.4}
        onRefresh={onRefresh}
        refreshing={onRefresh ? refreshing : undefined}
        renderItem={({ item, index }) => renderItem(item, index)}
        showsVerticalScrollIndicator={false}
      />

      {/* Banda opaca sobre la barra de estado: sin ella el contenido
          desplazado pasa por debajo del reloj y los dos se vuelven ilegibles. */}
      <View
        pointerEvents="none"
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          height: topInset,
          backgroundColor: colors.background,
        }}
      />
    </View>
  );
}

/** Pie de una lista paginada: sólo aparece mientras viaja la página siguiente. */
export function LoadingMoreFooter({ visible }: { visible: boolean }) {
  if (!visible) return null;
  return (
    <View
      accessibilityLabel="Cargando más"
      accessible
      style={{ alignItems: 'center', paddingVertical: spacing.lg }}
    >
      <ActivityIndicator color={colors.textMuted} size="small" />
    </View>
  );
}

/**
 * Nota de contexto en la cabecera de una pestaña.
 *
 * Existe para la nota de privacidad de «Nexts», que no es decoración: explica
 * por qué se ve algo que en cualquier otra app no se vería. Tono de aviso
 * silencioso —superficie, no acento— porque informa, no alarma.
 */
export function TabNotice({ text }: { text: string }) {
  return (
    <View
      style={{
        borderRadius: radii.lg,
        borderWidth: 1,
        borderColor: colors.borderSubtle,
        backgroundColor: colors.surfaceLow,
        paddingVertical: spacing.md,
        paddingHorizontal: spacing.md,
      }}
    >
      <Text style={{ color: colors.textMuted, fontSize: fontSizes.sm, lineHeight: 20 }}>{text}</Text>
    </View>
  );
}

/**
 * Una celda de la rejilla.
 *
 * `FlatList` con `numColumns` monta filas de N elementos, y la última fila de
 * una lista impar queda con un solo hijo que, siendo `flex: 1`, se estira a
 * todo el ancho: la última persona aparecía al doble de tamaño que el resto.
 * El relleno le devuelve su mitad, con el mismo hueco intermedio para que mida
 * exactamente lo que las demás.
 */
export function GridCell({ children, filler }: { children: ReactNode; filler: boolean }) {
  if (!filler) return <>{children}</>;
  return (
    <View style={{ flex: 1, flexDirection: 'row', gap: spacing.md }}>
      <View style={{ flex: 1 }}>{children}</View>
      <View accessibilityElementsHidden style={{ flex: 1 }} />
    </View>
  );
}

/** Altura de reserva de una tarjeta de la rejilla mientras carga. */
export const GRID_SKELETON_HEIGHT = 260;

/** Altura de reserva de una fila de lista mientras carga. */
export const ROW_SKELETON_HEIGHT = 76;
