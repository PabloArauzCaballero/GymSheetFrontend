import { Image, type ImageContentFit } from 'expo-image';
import { useState, type ReactNode } from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { useReducedMotion } from 'react-native-reanimated';
import { Shimmer } from '@/components/shimmer';
import { colors } from '@/theme';

/**
 * Imagen remota que nunca deja un hueco: mientras los bytes vienen en camino
 * el marco conserva su tamaño y muestra el esqueleto con la franja de luz;
 * al llegar, la imagen entra con un fundido; si falla (o no hay URL), se ve
 * `fallback` en vez de un rectángulo vacío.
 *
 * `expo-image` cachea en disco entre arranques, así que la segunda vez que
 * se abre una rutina la portada ya está ahí y el esqueleto ni se llega a ver.
 */
export function MediaImage({
  uri,
  fallback,
  contentFit = 'cover',
  accessibilityLabel,
  style,
  children,
}: {
  uri: string | null | undefined;
  /** Lo que se pinta si no hay URL o la descarga falla. */
  fallback?: ReactNode;
  contentFit?: ImageContentFit;
  /** Sin etiqueta la imagen es decorativa para el lector de pantalla. */
  accessibilityLabel?: string;
  style?: StyleProp<ViewStyle>;
  /** Capas encima de la imagen (velos, chips, títulos). */
  children?: ReactNode;
}) {
  const reduceMotion = useReducedMotion();
  const [state, setState] = useState<'loading' | 'ready' | 'failed'>('loading');
  const [shownUri, setShownUri] = useState(uri);
  // Una URL nueva vuelve a empezar la carga (React recomienda esto en vez de un efecto).
  if (uri !== shownUri) {
    setShownUri(uri);
    setState('loading');
  }
  const broken = !uri || state === 'failed';

  return (
    <View style={[{ overflow: 'hidden', backgroundColor: colors.surfaceHigh }, style]}>
      {broken ? (
        fallback
      ) : (
        <>
          <Image
            accessibilityElementsHidden={!accessibilityLabel}
            accessibilityLabel={accessibilityLabel}
            accessible={Boolean(accessibilityLabel)}
            cachePolicy="memory-disk"
            contentFit={contentFit}
            importantForAccessibility={accessibilityLabel ? 'yes' : 'no-hide-descendants'}
            onError={() => setState('failed')}
            onLoad={() => setState('ready')}
            recyclingKey={uri}
            source={{ uri }}
            style={StyleSheet.absoluteFill}
            transition={reduceMotion ? 0 : { duration: 320, effect: 'cross-dissolve' }}
          />
          {state === 'loading' ? <Shimmer /> : null}
        </>
      )}
      {children}
    </View>
  );
}
