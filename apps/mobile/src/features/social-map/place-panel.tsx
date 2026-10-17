import { Ionicons } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { Linking, ScrollView, Text, View, useWindowDimensions } from 'react-native';
import Animated, { SlideInDown, SlideOutDown } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { socialService } from '@/api/services';
import { ErrorState } from '@/components/feedback';
import { PressableScale } from '@/components/motion';
import { Button } from '@/components/ui';
import { notify } from '@/notifications';
import { useAuthStore } from '@/state/auth-store';
import { colors, fontSizes, iconSizes, minTouchTarget, radii, semibold, shadows, spacing, glideSpring } from '@/theme';
import { PeopleGrid, PeopleGridSkeleton } from './people-grid';

export type MapPlace = {
  key: string;
  kind: 'GYM' | 'POINT';
  title: string;
  subtitle: string;
  latitude: number;
  longitude: number;
};

/**
 * What opens when a gym or a spot on the map is tapped: who trains around
 * there, as a photo grid filtered by the viewer's Conocer preferences.
 */
export function PlacePanel({ place, onClose, onEditPreferences }: {
  place: MapPlace;
  onClose: () => void;
  onEditPreferences: () => void;
}) {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { height } = useWindowDimensions();
  const viewerId = useAuthStore((state) => state.principal?.id ?? 'anonymous');
  const nearby = useQuery({
    queryKey: ['social-map', viewerId, 'nearby', place.latitude.toFixed(4), place.longitude.toFixed(4)],
    queryFn: () => socialService.mapNearby({ latitude: place.latitude, longitude: place.longitude }),
  });
  const people = nearby.data?.people ?? [];

  return (
    <Animated.View
      entering={SlideInDown.springify().damping(glideSpring.damping).stiffness(glideSpring.stiffness)}
      exiting={SlideOutDown.duration(180)}
      style={{
        position: 'absolute', left: 0, right: 0, bottom: 0, maxHeight: height * 0.62,
        backgroundColor: colors.surface, borderTopLeftRadius: radii.xxl, borderTopRightRadius: radii.xxl,
        borderColor: colors.border, borderWidth: 1, paddingBottom: insets.bottom, boxShadow: shadows.e3,
      }}
    >
      <View style={{ alignItems: 'center', paddingTop: spacing.sm }}>
        <View style={{ width: 36, height: 5, borderRadius: radii.full, backgroundColor: colors.borderControl }} />
      </View>
      <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: spacing.smd, paddingHorizontal: spacing.md, paddingTop: spacing.sm, paddingBottom: spacing.smd }}>
        <View style={{ width: 44, height: 44, borderRadius: radii.md, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.surfaceHigh }}>
          <Ionicons color={colors.accentInk} name={place.kind === 'GYM' ? 'barbell' : 'location'} size={iconSizes.md} />
        </View>
        <View style={{ flex: 1, gap: 2 }}>
          <Text numberOfLines={2} style={{ color: colors.text, fontSize: fontSizes.subhead, fontWeight: semibold }}>{place.title}</Text>
          <Text numberOfLines={1} style={{ color: colors.textMuted, fontSize: fontSizes.footnote }}>{place.subtitle}</Text>
        </View>
        <PressableScale accessibilityLabel="Cerrar" hitSlop={8} onPress={onClose}>
          <View style={{ width: minTouchTarget, height: minTouchTarget, alignItems: 'center', justifyContent: 'center' }}>
            <Ionicons color={colors.textSecondary} name="close" size={iconSizes.md} />
          </View>
        </PressableScale>
      </View>
      <View style={{ flexDirection: 'row', gap: spacing.sm, paddingHorizontal: spacing.md, paddingBottom: spacing.smd }}>
        <View style={{ flex: 1 }}>
          <Button
            icon="navigate-outline"
            label="Cómo llegar"
            onPress={() => {
              void Linking.openURL(`https://maps.google.com/?q=${place.latitude},${place.longitude}`)
                .catch(() => notify.error('No se pudo abrir la aplicación de mapas.'));
            }}
            size="sm"
            variant="ghost"
          />
        </View>
        <View style={{ flex: 1 }}>
          <Button icon="options-outline" label="Preferencias" onPress={onEditPreferences} size="sm" variant="ghost" />
        </View>
      </View>
      <View style={{ flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', paddingHorizontal: spacing.md, paddingBottom: spacing.sm }}>
        <Text style={{ color: colors.text, fontSize: fontSizes.callout, fontWeight: semibold }}>
          {nearby.isSuccess ? `${people.length} ${people.length === 1 ? 'persona' : 'personas'} cerca` : 'Personas cerca'}
        </Text>
        {nearby.data ? (
          <Text style={{ color: colors.textMuted, fontSize: fontSizes.xs }}>
            {nearby.data.preferencesApplied ? 'Según tus preferencias' : 'Sin filtros de preferencias'}
          </Text>
        ) : null}
      </View>
      <ScrollView contentContainerStyle={{ paddingBottom: spacing.md }} showsVerticalScrollIndicator={false}>
        {nearby.isLoading ? <PeopleGridSkeleton /> : null}
        {nearby.isError ? <View style={{ padding: spacing.md }}><ErrorState error={nearby.error} onRetry={() => void nearby.refetch()} /></View> : null}
        {nearby.isSuccess && people.length === 0 ? (
          <View style={{ alignItems: 'center', gap: spacing.sm, paddingHorizontal: spacing.lg, paddingVertical: spacing.lg }}>
            <Ionicons color={colors.textMuted} name="people-outline" size={iconSizes.lg} />
            <Text style={{ color: colors.text, fontSize: fontSizes.callout, fontWeight: semibold, textAlign: 'center' }}>Aún no hay nadie visible por aquí</Text>
            <Text style={{ color: colors.textMuted, fontSize: fontSizes.footnote, lineHeight: 19, textAlign: 'center' }}>
              Solo aparecen quienes activaron el mapa y encajan con tus preferencias. Prueba otra zona o amplía la edad.
            </Text>
          </View>
        ) : null}
        {people.length > 0 ? (
          <PeopleGrid onOpen={(userId) => router.push({ pathname: '/perfil/[userId]', params: { userId } })} people={people} />
        ) : null}
      </ScrollView>
    </Animated.View>
  );
}
