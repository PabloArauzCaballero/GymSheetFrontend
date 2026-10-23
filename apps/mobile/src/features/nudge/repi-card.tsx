import { Ionicons } from '@expo/vector-icons';
import { useRouter, type Href } from 'expo-router';
import { View } from 'react-native';
import { SvgXml } from 'react-native-svg';
import { Card, Divider } from '@/components/layout';
import { PressableScale } from '@/components/motion';
import { Text } from '@/components/text';
import { colors, iconSizes, spacing } from '@/theme';
import { mascotXml } from './mascot';
import { useRepiNow } from './nudge-sync';
import type { StoredEntry } from './snapshot';

const MASCOT_SLOT = 72;

/** `gymsheet:///routines` → `/routines`: la misma ruta que abre el widget. */
function routeOf(url: string): Href {
  return url.replace(/^gymsheet:\/\//u, '') as Href;
}

function RepiRow({ entry, size, testID }: { entry: StoredEntry; size: number; testID: string }) {
  const router = useRouter();
  return (
    <PressableScale
      accessibilityHint={entry.url.includes('/chat') || entry.url.includes('mensajes') ? 'Abre el chat' : 'Abre tus rutinas'}
      accessibilityLabel={`${entry.title}. ${entry.body}`}
      onPress={() => router.push(routeOf(entry.url))}
      style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.smd, minHeight: 48 }}
      testID={testID}
    >
      {/* Hueco fijo: el texto de las dos filas queda alineado aunque Repi cambie de tamaño. */}
      <View
        accessibilityElementsHidden
        importantForAccessibility="no-hide-descendants"
        style={{ width: MASCOT_SLOT, alignItems: 'center' }}
      >
        <SvgXml height={size} width={size} xml={mascotXml(entry.mood)} />
      </View>
      <View style={{ flex: 1, gap: spacing.xxs }}>
        <Text variant="headline">{entry.title}</Text>
        <Text tone="secondary" variant="subhead">
          {entry.body}
        </Text>
      </View>
      <Ionicons color={colors.textMuted} name="chevron-forward" size={iconSizes.sm} />
    </PressableScale>
  );
}

/**
 * Repi en Inicio: lo mismo que dice el widget, ahora. Arriba el gym (te lleva a
 * rutinas); debajo, solo si alguien espera, los matches (te lleva al chat).
 * Antes de que haya datos no ocupa sitio: el «Hoy» de debajo ya tiene su carga.
 */
export function RepiCard() {
  const { gym, matches } = useRepiNow();
  if (!gym) return null;
  const waiting = matches?.mood === 'flirty' ? matches : null;
  return (
    <Card list>
      <RepiRow entry={gym} size={MASCOT_SLOT} testID="repi-gym" />
      {waiting ? (
        <>
          <Divider />
          <RepiRow entry={waiting} size={48} testID="repi-matches" />
        </>
      ) : null}
    </Card>
  );
}
