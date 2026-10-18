import { Ionicons } from '@expo/vector-icons';
import { useQueryClient } from '@tanstack/react-query';
import * as Location from 'expo-location';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { ScrollView, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { chatService } from '@/api/services';
import { AmbientBackground } from '@/components/ambient';
import { PressableScale } from '@/components/motion';
import { Button } from '@/components/ui';
import { SheetRow } from '@/features/chat/chat-sheets';
import { PlacePicker, placeLabel, type PickedPlace } from '@/features/place-picker/place-picker';
import { notify } from '@/notifications';
import { colors, fontSizes, iconSizes, minTouchTarget, semibold, spacing } from '@/theme';

/**
 * «Ubicación» del chat: compartir dónde estoy ahora o elegir un lugar en el
 * mapa (un gimnasio o cualquier punto) y mandarlo con su nombre.
 *
 * Es una pantalla de la pila, no un `Modal`: en el iPhone real un mapa dentro
 * de un Modal de RN encadenado con la hoja de adjuntos y el diálogo de permisos
 * dejaba el segundo sin presentar.
 */
export default function ChatPlaceScreen() {
  const { conversationId } = useLocalSearchParams<{ conversationId: string }>();
  const router = useRouter();
  const queryClient = useQueryClient();
  const insets = useSafeAreaInsets();
  const [place, setPlace] = useState<PickedPlace | null>(null);
  const [sending, setSending] = useState<'current' | 'place' | null>(null);

  const close = () => (router.canGoBack() ? router.back() : router.replace({ pathname: '/chat/[id]', params: { id: conversationId } }));

  async function send(location: { lat: number; lng: number; label?: string }, kind: 'current' | 'place') {
    if (!conversationId || sending) return;
    setSending(kind);
    try {
      await chatService.sendLocationMessage(conversationId, location);
      // El hilo lo recibe por el socket; si el socket no estaba, el historial lo trae.
      void queryClient.invalidateQueries({ queryKey: ['chat', 'messages', conversationId] });
      void queryClient.invalidateQueries({ queryKey: ['chat', 'conversations'] });
      close();
    } catch (error: unknown) {
      notify.error(error instanceof Error ? error.message : 'No se pudo enviar la ubicación.');
    } finally {
      setSending(null);
    }
  }

  async function sendCurrentLocation() {
    const permission = await Location.requestForegroundPermissionsAsync();
    if (!permission.granted) {
      notify.error('Se necesita acceso a tu ubicación para compartirla.');
      return;
    }
    try {
      setSending('current');
      const position = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      setSending(null);
      await send({ lat: position.coords.latitude, lng: position.coords.longitude }, 'current');
    } catch {
      setSending(null);
      notify.error('No se pudo obtener tu ubicación.');
    }
  }

  const located = place && place.latitude !== undefined && place.longitude !== undefined ? place : null;
  // El selector pone este texto mientras busca la dirección del punto tocado; no se envía a medias.
  const resolvingAddress = located?.kind === 'POINT' && located.label === 'Buscando la dirección…';
  const hint = !place
    ? 'Toca un gimnasio o cualquier punto del mapa.'
    : located
      ? placeLabel(located)
      : 'Lo escrito a mano no tiene un punto en el mapa: elige uno tocando el mapa.';

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <AmbientBackground />
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          gap: spacing.sm,
          paddingTop: insets.top + spacing.sm,
          paddingHorizontal: spacing.lg,
          paddingBottom: spacing.sm,
        }}
      >
        <PressableScale
          accessibilityLabel="Volver al chat"
          haptic="none"
          hitSlop={spacing.sm}
          onPress={close}
          scaleTo={0.9}
          style={{ width: 32, height: minTouchTarget, justifyContent: 'center' }}
        >
          <Ionicons color={colors.text} name="chevron-back" size={iconSizes.lg + 2} />
        </PressableScale>
        <Text accessibilityRole="header" style={{ color: colors.text, fontSize: fontSizes.lg, fontWeight: semibold }}>
          Enviar ubicación
        </Text>
      </View>

      <ScrollView
        contentContainerStyle={{ gap: spacing.md, paddingHorizontal: spacing.lg, paddingBottom: spacing.lg }}
        keyboardShouldPersistTaps="handled"
        // El mapa recibe sus propios gestos; la página solo se desplaza fuera de él.
        scrollEventThrottle={16}
      >
        <SheetRow
          disabled={sending !== null}
          hint="Comparte dónde estás ahora"
          icon="navigate-outline"
          label={sending === 'current' ? 'Buscando tu ubicación…' : 'Mi ubicación actual'}
          onPress={() => void sendCurrentLocation()}
          testID="chat-place-current"
        />
        <Text style={{ color: colors.textMuted, fontSize: fontSizes.sm, fontWeight: semibold }}>O elige un lugar</Text>
        <PlacePicker height={300} onChange={setPlace} value={place} />
      </ScrollView>

      <View
        style={{
          gap: spacing.sm,
          paddingHorizontal: spacing.lg,
          paddingTop: spacing.sm,
          paddingBottom: insets.bottom + spacing.md,
          borderTopWidth: 1,
          borderTopColor: colors.borderSubtle,
          backgroundColor: colors.background,
        }}
      >
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.xs }}>
          <Ionicons color={located ? colors.text : colors.textMuted} name="location-outline" size={iconSizes.sm} />
          <Text numberOfLines={2} style={{ flex: 1, color: located ? colors.text : colors.textMuted, fontSize: fontSizes.sm }}>
            {hint}
          </Text>
        </View>
        <Button
          disabled={!located || resolvingAddress || sending !== null}
          icon="send"
          label="Enviar este lugar"
          loading={sending === 'place'}
          onPress={() => located && void send({
            lat: located.latitude as number,
            lng: located.longitude as number,
            label: placeLabel(located),
          }, 'place')}
          testID="chat-place-send"
        />
      </View>
    </View>
  );
}
