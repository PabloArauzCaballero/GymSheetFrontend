import { Ionicons } from '@expo/vector-icons';
import { keepPreviousData, useQuery, useQueryClient } from '@tanstack/react-query';
import { Stack, useRouter } from 'expo-router';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Linking, Text, TextInput, View } from 'react-native';
import MapView, { Marker, type Region } from 'react-native-maps';
import Animated, { FadeIn, FadeOut } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { SocialMapBounds } from '@gymsheet/schemas';
import { facilitiesService, socialService } from '@/api/services';
import { BottomSheet } from '@/components/bottom-sheet';
import { PressableScale } from '@/components/motion';
import { DiscoveryPreferencesEditor } from '@/components/social-status-editor';
import { Button } from '@/components/ui';
import { PlacePanel, type MapPlace } from '@/features/social-map/place-panel';
import { useShareLocation } from '@/features/social-map/use-share-location';
import { useAuthStore } from '@/state/auth-store';
import { colors, fontSizes, iconSizes, minTouchTarget, radii, semibold, socialMapColors, spacing } from '@/theme';

type Layer = 'ALL' | 'GYMS' | 'PEOPLE';

const LA_PAZ: Region = { latitude: -16.5, longitude: -68.13, latitudeDelta: 0.09, longitudeDelta: 0.09 };
/** Gyms are public places: a whole city at once. People cells only up close (≤ 100 cells of 2 km). */
const MAX_GYM_DELTA = 2.8;
const MAX_PEOPLE_DELTA = 0.16;

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function boundsForRegion(region: Region): SocialMapBounds {
  const round = (value: number) => Math.round(value * 1_000) / 1_000;
  return {
    south: round(clamp(region.latitude - region.latitudeDelta / 2, -85, 85)),
    west: round(clamp(region.longitude - region.longitudeDelta / 2, -180, 180)),
    north: round(clamp(region.latitude + region.latitudeDelta / 2, -85, 85)),
    east: round(clamp(region.longitude + region.longitudeDelta / 2, -180, 180)),
  };
}

function GlassButton({ icon, label, onPress }: { icon: keyof typeof Ionicons.glyphMap; label: string; onPress: () => void }) {
  return (
    <PressableScale accessibilityLabel={label} onPress={onPress}>
      <View style={{ width: minTouchTarget, height: minTouchTarget, borderRadius: radii.full, alignItems: 'center', justifyContent: 'center', backgroundColor: socialMapColors.glass, borderColor: socialMapColors.glassBorder, borderWidth: 1 }}>
        <Ionicons color={colors.text} name={icon} size={iconSizes.md} />
      </View>
    </PressableScale>
  );
}

function GymMarkerView({ selected }: { selected: boolean }) {
  return (
    <View style={{ width: 34, height: 34, borderRadius: radii.full, alignItems: 'center', justifyContent: 'center', backgroundColor: selected ? socialMapColors.selected : socialMapColors.gymPin, borderColor: socialMapColors.ring, borderWidth: 2 }}>
      <Ionicons color={socialMapColors.gymInk} name="barbell" size={iconSizes.sm} />
    </View>
  );
}

export default function SocialMapScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();
  const viewerId = useAuthStore((state) => state.principal?.id ?? 'anonymous');
  const mapRef = useRef<MapView>(null);
  const centeredRef = useRef(false);
  const [region, setRegion] = useState(LA_PAZ);
  const [layer, setLayer] = useState<Layer>('ALL');
  const [place, setPlace] = useState<MapPlace | null>(null);
  const [cityText, setCityText] = useState('');
  const [citySearch, setCitySearch] = useState('');
  const [preferencesOpen, setPreferencesOpen] = useState(false);
  const location = useShareLocation();

  useEffect(() => {
    if (!location.coords || centeredRef.current) return;
    centeredRef.current = true;
    mapRef.current?.animateToRegion({ ...location.coords, latitudeDelta: 0.06, longitudeDelta: 0.06 }, 500);
  }, [location.coords]);

  const bounds = boundsForRegion(region);
  const boundsKey = Object.values(bounds).join(':');
  const gymsInRange = region.latitudeDelta <= MAX_GYM_DELTA && region.longitudeDelta <= MAX_GYM_DELTA;
  const peopleInRange = region.latitudeDelta <= MAX_PEOPLE_DELTA && region.longitudeDelta <= MAX_PEOPLE_DELTA;
  const showGyms = layer !== 'PEOPLE';
  const showPeople = layer !== 'GYMS';

  const externalGyms = useQuery({
    queryKey: ['social-map', 'external-gyms', boundsKey],
    queryFn: () => socialService.mapGyms(bounds),
    enabled: showGyms && gymsInRange,
    placeholderData: keepPreviousData,
  });
  const branches = useQuery({ queryKey: ['social-map', 'registered-gyms'], queryFn: facilitiesService.publicBranches });
  const areas = useQuery({
    queryKey: ['social-map', viewerId, 'areas', boundsKey],
    queryFn: () => socialService.mapAreas(bounds),
    enabled: showPeople && peopleInRange,
    placeholderData: keepPreviousData,
  });
  const cities = useQuery({
    queryKey: ['social-map', 'cities', citySearch],
    queryFn: () => socialService.searchMapCities(citySearch),
    enabled: citySearch.length >= 2,
  });

  const registeredGyms = useMemo(() => (branches.data ?? []).filter((gym) =>
    gym.latitud !== null && gym.longitud !== null
    && gym.latitud >= bounds.south && gym.latitud <= bounds.north
    && gym.longitud >= bounds.west && gym.longitud <= bounds.east), [branches.data, bounds.south, bounds.north, bounds.west, bounds.east]);
  const gymCount = registeredGyms.length + (externalGyms.data?.length ?? 0);

  const openPlace = (next: MapPlace) => {
    setPlace(next);
    mapRef.current?.animateToRegion({
      latitude: next.latitude - Math.min(region.latitudeDelta, 0.05) * 0.25,
      longitude: next.longitude,
      latitudeDelta: Math.min(region.latitudeDelta, 0.05),
      longitudeDelta: Math.min(region.longitudeDelta, 0.05),
    }, 350);
  };

  const status = !gymsInRange && showGyms
    ? 'Acerca el mapa para ver los gimnasios'
    : `${gymCount} ${gymCount === 1 ? 'gimnasio' : 'gimnasios'} en esta zona · toca uno para ver quién entrena ahí`;

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <Stack.Screen options={{ headerShown: false }} />
      <MapView
        initialRegion={LA_PAZ}
        onPress={(event) => {
          if (event.nativeEvent.action === 'marker-press') return;
          if (place) { setPlace(null); return; }
          const { latitude, longitude } = event.nativeEvent.coordinate;
          openPlace({ key: `point-${latitude.toFixed(4)}-${longitude.toFixed(4)}`, kind: 'POINT', title: 'Esta ubicación', subtitle: 'Personas en unos 10 km a la redonda', latitude, longitude });
        }}
        onRegionChangeComplete={setRegion}
        ref={mapRef}
        showsPointsOfInterests={false}
        showsUserLocation={location.coords !== null}
        style={{ flex: 1 }}
      >
        {showPeople && peopleInRange && (areas.data?.cells ?? []).map((cell) => (
          <Marker
            accessibilityLabel={`${cell.count} ${cell.count === 1 ? 'persona' : 'personas'} en esta zona`}
            coordinate={cell.center}
            key={`cell-${cell.id}`}
            onPress={() => openPlace({ key: `cell-${cell.id}`, kind: 'POINT', title: `${cell.count} ${cell.count === 1 ? 'persona' : 'personas'} por aquí`, subtitle: 'Zona aproximada de 2 km', ...cell.center })}
            tracksViewChanges={false}
          >
            <View style={{ minWidth: 34, height: 34, paddingHorizontal: spacing.sm, borderRadius: radii.full, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 3, backgroundColor: socialMapColors.peopleBubble, borderColor: socialMapColors.ring, borderWidth: 2 }}>
              <Ionicons color={socialMapColors.peopleInk} name="person" size={iconSizes.xs} />
              <Text style={{ color: socialMapColors.peopleInk, fontSize: fontSizes.footnote, fontWeight: semibold }}>{cell.count}</Text>
            </View>
          </Marker>
        ))}
        {showGyms && registeredGyms.map((gym) => (
          <Marker
            accessibilityLabel={gym.nombre}
            coordinate={{ latitude: gym.latitud as number, longitude: gym.longitud as number }}
            key={`branch-${gym.id}`}
            onPress={() => openPlace({ key: `branch-${gym.id}`, kind: 'GYM', title: gym.nombre, subtitle: 'Gimnasio en REPP', latitude: gym.latitud as number, longitude: gym.longitud as number })}
            tracksViewChanges={place?.key === `branch-${gym.id}`}
          >
            <GymMarkerView selected={place?.key === `branch-${gym.id}`} />
          </Marker>
        ))}
        {showGyms && gymsInRange && (externalGyms.data ?? []).map((gym) => (
          <Marker
            accessibilityLabel={gym.name}
            coordinate={{ latitude: gym.latitude, longitude: gym.longitude }}
            key={`osm-${gym.sourceId}`}
            onPress={() => openPlace({ key: `osm-${gym.sourceId}`, kind: 'GYM', title: gym.name, subtitle: gym.address ?? gym.city ?? 'Gimnasio', latitude: gym.latitude, longitude: gym.longitude })}
            tracksViewChanges={place?.key === `osm-${gym.sourceId}`}
          >
            <GymMarkerView selected={place?.key === `osm-${gym.sourceId}`} />
          </Marker>
        ))}
      </MapView>

      <View pointerEvents="box-none" style={{ position: 'absolute', top: insets.top + spacing.sm, left: spacing.md, right: spacing.md, gap: spacing.sm }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
          <GlassButton icon="chevron-back" label="Volver" onPress={() => router.back()} />
          <View style={{ flex: 1, height: minTouchTarget, flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingHorizontal: spacing.md, borderRadius: radii.full, backgroundColor: socialMapColors.glass, borderColor: socialMapColors.glassBorder, borderWidth: 1 }}>
            <Ionicons color={colors.textSecondary} name="search" size={iconSizes.sm} />
            <TextInput
              accessibilityLabel="Buscar ciudad"
              onChangeText={(text) => { setCityText(text); if (text.trim().length < 2) setCitySearch(''); }}
              onSubmitEditing={() => setCitySearch(cityText.trim())}
              placeholder="Buscar ciudad"
              placeholderTextColor={colors.textMuted}
              returnKeyType="search"
              style={{ flex: 1, color: colors.text, fontSize: fontSizes.sm }}
              value={cityText}
            />
          </View>
          <GlassButton icon="options-outline" label="Preferencias" onPress={() => setPreferencesOpen(true)} />
        </View>
        {(cities.data ?? []).length > 0 ? (
          <Animated.View entering={FadeIn.duration(160)} exiting={FadeOut.duration(120)} style={{ borderRadius: radii.lg, overflow: 'hidden', backgroundColor: socialMapColors.glass, borderColor: socialMapColors.glassBorder, borderWidth: 1 }}>
            {(cities.data ?? []).slice(0, 5).map((city) => (
              <PressableScale accessibilityLabel={city.name} key={city.id} onPress={() => {
                setCitySearch(''); setCityText(city.name); setPlace(null);
                mapRef.current?.animateToRegion({ latitude: city.latitude, longitude: city.longitude, latitudeDelta: 0.09, longitudeDelta: 0.09 }, 500);
              }}>
                <View style={{ minHeight: minTouchTarget, justifyContent: 'center', paddingHorizontal: spacing.md }}>
                  <Text style={{ color: colors.text, fontSize: fontSizes.sm }}>{city.name}{city.region ? <Text style={{ color: colors.textMuted }}>{` · ${city.region}`}</Text> : null}</Text>
                </View>
              </PressableScale>
            ))}
          </Animated.View>
        ) : null}
        {citySearch.length >= 2 && cities.data?.length === 0 ? (
          <Text style={{ color: colors.text, fontSize: fontSizes.footnote, alignSelf: 'flex-start', backgroundColor: socialMapColors.glass, borderRadius: radii.full, overflow: 'hidden', paddingHorizontal: spacing.md, paddingVertical: spacing.xs }}>No encontramos esa ciudad</Text>
        ) : null}
        <View style={{ flexDirection: 'row', gap: spacing.xs }}>
          {([['ALL', 'Todo', 'layers-outline'], ['GYMS', 'Gimnasios', 'barbell-outline'], ['PEOPLE', 'Personas', 'people-outline']] as const).map(([value, label, icon]) => {
            const active = layer === value;
            return (
              <PressableScale accessibilityLabel={label} accessibilityState={{ selected: active }} key={value} onPress={() => setLayer(value)}>
                <View style={{ height: 36, flexDirection: 'row', alignItems: 'center', gap: spacing.xs, paddingHorizontal: spacing.smd, borderRadius: radii.full, backgroundColor: active ? socialMapColors.gymPin : socialMapColors.glass, borderColor: socialMapColors.glassBorder, borderWidth: 1 }}>
                  <Ionicons color={colors.text} name={icon} size={iconSizes.sm} />
                  <Text style={{ color: colors.text, fontSize: fontSizes.footnote, fontWeight: active ? semibold : '500' }}>{label}</Text>
                </View>
              </PressableScale>
            );
          })}
        </View>
      </View>

      {!place ? (
        <Animated.View entering={FadeIn.duration(200)} pointerEvents="box-none" style={{ position: 'absolute', left: spacing.md, right: spacing.md, bottom: insets.bottom + spacing.md, gap: spacing.sm }}>
          <View style={{ alignSelf: 'flex-end' }}>
            <GlassButton icon="locate" label="Mi ubicación" onPress={() => {
              void location.locate().then((coords) => {
                if (coords) mapRef.current?.animateToRegion({ ...coords, latitudeDelta: 0.05, longitudeDelta: 0.05 }, 450);
              });
            }} />
          </View>
          <View style={{ gap: spacing.sm, padding: spacing.md, borderRadius: radii.xl, backgroundColor: socialMapColors.glass, borderColor: socialMapColors.glassBorder, borderWidth: 1 }}>
            <Text style={{ color: colors.text, fontSize: fontSizes.footnote }}>{status}</Text>
            {location.settingsLoaded && !location.sharing ? (
              <Button icon="eye-outline" label="Aparecer en el mapa" loading={location.appear.isPending} onPress={() => location.appear.mutate()} size="sm" />
            ) : null}
            <Text accessibilityRole="link" onPress={() => { void Linking.openURL('https://www.openstreetmap.org/copyright'); }} style={{ color: colors.textMuted, fontSize: fontSizes.xs }}>
              Gimnasios © OpenStreetMap contributors · ODbL
            </Text>
          </View>
        </Animated.View>
      ) : null}

      {place ? <PlacePanel key={place.key} onClose={() => setPlace(null)} onEditPreferences={() => setPreferencesOpen(true)} place={place} /> : null}

      <BottomSheet
        onClose={() => {
          setPreferencesOpen(false);
          void queryClient.invalidateQueries({ queryKey: ['social-map', viewerId, 'nearby'] });
        }}
        subtitle="El mapa solo te muestra a quienes encajan con esto."
        title="Preferencias"
        visible={preferencesOpen}
      >
        <DiscoveryPreferencesEditor />
      </BottomSheet>
    </View>
  );
}
