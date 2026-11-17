import { Image } from 'expo-image';
import { useState } from 'react';
import { ScrollView, View } from 'react-native';
import { PressableScale } from '@/components/motion';
import { Text } from '@/components/text';
import { colors, comfortableTouchTarget, radii, spacing } from '@/theme';
import { usePrivateImageSource } from './orders-service';

const ZOOMS = [1, 1.5, 2, 3] as const;

/**
 * A private image (payment QR, receipt) loaded with the bearer header and
 * never cached on disk (`cachePolicy="none"`). With `zoomable`, two buttons
 * widen it inside a frame that scrolls both ways: the amount and the
 * operation number can be read on any phone, iOS or Android.
 */
export function PrivateImage({ path, label, size, zoomable = false }: { path: string | null; label: string; size: number; zoomable?: boolean }) {
  const { source, onError } = usePrivateImageSource(path);
  const [zoom, setZoom] = useState(0);
  const [failed, setFailed] = useState(false);
  const factor = ZOOMS[zoom] ?? 1;
  const side = size * factor;
  const frame = { width: size, height: size, borderRadius: radii.lg, borderCurve: 'continuous' as const, backgroundColor: colors.surfaceHigh, overflow: 'hidden' as const };

  if (failed) {
    return (
      <PressableScale accessibilityLabel={`${label}: no cargó. Reintentar`} haptic="none" onPress={() => { setFailed(false); onError(); }} style={[frame, { alignItems: 'center', justifyContent: 'center', padding: spacing.md }]}>
        <Text style={{ textAlign: 'center' }} tone="secondary" variant="subhead">No cargó. Toca para reintentar.</Text>
      </PressableScale>
    );
  }
  const image = source ? (
    <Image accessibilityLabel={label} cachePolicy="none" contentFit="contain" onError={() => setFailed(true)} source={source} style={{ width: side, height: side }} />
  ) : null;
  if (!zoomable) return <View style={frame}>{image}</View>;
  return (
    <View style={{ gap: spacing.sm, alignSelf: 'center' }}>
      <ScrollView contentContainerStyle={{ minWidth: side }} horizontal style={frame}>
        <ScrollView nestedScrollEnabled>{image}</ScrollView>
      </ScrollView>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end', gap: spacing.sm }}>
        <ZoomButton disabled={zoom === 0} label="Alejar" onPress={() => setZoom((value) => value - 1)} symbol="−" />
        <Text tabular variant="subhead">{factor}×</Text>
        <ZoomButton disabled={zoom === ZOOMS.length - 1} label="Acercar" onPress={() => setZoom((value) => value + 1)} symbol="+" />
      </View>
    </View>
  );
}

function ZoomButton({ label, symbol, disabled, onPress }: { label: string; symbol: string; disabled: boolean; onPress: () => void }) {
  return (
    <PressableScale
      accessibilityLabel={label}
      accessibilityState={{ disabled }}
      disabled={disabled}
      haptic="selection"
      onPress={onPress}
      style={{ width: comfortableTouchTarget, height: comfortableTouchTarget, borderRadius: radii.full, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.surfaceHigh, opacity: disabled ? 0.4 : 1 }}
    >
      <Text strong variant="headline">{symbol}</Text>
    </PressableScale>
  );
}
