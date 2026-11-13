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

/** La pantalla donde ya estás: Repi no te manda a ella misma. */
export type RepiHere = 'routines' | 'chats';

function pointsHere(url: string, here: RepiHere | undefined): boolean {
  if (here === 'routines') return url.endsWith('/routines');
  if (here === 'chats') return url.includes('comunidad-mensajes');
  return false;
}

function RepiRow({ entry, size, testID, here }: { entry: StoredEntry; size: number; testID: string; here?: RepiHere }) {
  const router = useRouter();
  const static_ = pointsHere(entry.url, here);
  return (
    <PressableScale
      accessibilityHint={static_ ? undefined : entry.url.includes('/chat') || entry.url.includes('mensajes') ? 'Abre el chat' : 'Abre tus rutinas'}
      accessibilityLabel={`${entry.title}. ${entry.body}`}
      disabled={static_}
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
      {static_ ? null : <Ionicons color={colors.textMuted} name="chevron-forward" size={iconSizes.sm} />}
    </PressableScale>
  );
}

/**
 * Repi en Inicio: lo mismo que dice el widget, ahora. Arriba el gym (te lleva a
 * rutinas); debajo, solo si alguien espera, los matches (te lleva al chat).
 * Antes de que haya datos no ocupa sitio: el «Hoy» de debajo ya tiene su carga.
 */
export function RepiCard({ here }: { here?: RepiHere } = {}) {
  const { gym, matches } = useRepiNow();
  if (!gym) return null;
  const waiting = matches?.mood === 'flirty' ? matches : null;
  return (
    <Card list>
      <RepiRow entry={gym} here={here} size={MASCOT_SLOT} testID="repi-gym" />
      {waiting ? (
        <>
          <Divider />
          <RepiRow entry={waiting} here={here} size={48} testID="repi-matches" />
        </>
      ) : null}
    </Card>
  );
}

/**
 * Solo los matches, y solo si alguien espera: en Mensajes el entreno no pinta
 * nada, y una tarjeta que dice «al día» encima de tus chats es ruido.
 */
export function RepiMatchesCard() {
  const { matches } = useRepiNow();
  if (matches?.mood !== 'flirty') return null;
  return (
    <Card list>
      <RepiRow entry={matches} here="chats" size={56} testID="repi-matches" />
    </Card>
  );
}
