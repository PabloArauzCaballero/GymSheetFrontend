import * as Sharing from 'expo-sharing';
import { useCallback, useRef, useState, type ReactNode } from 'react';
import { View } from 'react-native';
import { captureRef } from 'react-native-view-shot';
import { shareWithBrand } from '@/lib/share-brand';
import { SHARE_CARD_HEIGHT, SHARE_CARD_WIDTH, ShareCard, type ShareCardData } from './share-card';

type Pending = {
  card: ShareCardData;
  /** Texto si no se puede capturar o compartir la imagen (simulador sin hoja, error nativo). */
  fallback: readonly (string | null | undefined | false)[];
  link?: string;
};

/**
 * Compartir un logro como imagen 9:16. La tarjeta **no existe** hasta que se
 * pulsa «Compartir»: se monta fuera de pantalla, se captura una vez a
 * 1080 × 1920 en cuanto tiene tamaño, se abre la hoja del sistema y se
 * desmonta. Coste cero mientras nadie comparte.
 *
 * Uso: `const { share, sharing, element } = useShareCard();` y pintar
 * `{element}` en cualquier sitio de la pantalla.
 */
export function useShareCard(): {
  share: (pending: Pending) => void;
  sharing: boolean;
  element: ReactNode;
} {
  const [pending, setPending] = useState<Pending | null>(null);
  const ref = useRef<View>(null);
  const capturing = useRef(false);

  const share = useCallback((next: Pending) => {
    if (capturing.current) return;
    capturing.current = true;
    setPending(next);
  }, []);

  const capture = useCallback(async () => {
    if (!pending) return;
    try {
      // Un fotograma para que se pinte el degradado y la tipografía.
      await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
      const uri = await captureRef(ref, { format: 'jpg', quality: 0.92, result: 'tmpfile', width: 1080, height: 1920 });
      if (!(await Sharing.isAvailableAsync())) throw new Error('sharing-unavailable');
      await Sharing.shareAsync(uri, { mimeType: 'image/jpeg', UTI: 'public.jpeg', dialogTitle: pending.card.kicker });
    } catch (error) {
      if (__DEV__) console.warn('share-card: se comparte el texto porque falló la imagen', error);
      shareWithBrand(pending.fallback, pending.link);
    } finally {
      capturing.current = false;
      setPending(null);
    }
  }, [pending]);

  const element = pending ? (
    <View
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      pointerEvents="none"
      style={{ position: 'absolute', top: 0, left: -SHARE_CARD_WIDTH * 4, width: SHARE_CARD_WIDTH, height: SHARE_CARD_HEIGHT }}
    >
      <View collapsable={false} onLayout={() => void capture()} ref={ref}>
        <ShareCard data={pending.card} />
      </View>
    </View>
  ) : null;

  return { share, sharing: pending !== null, element };
}
