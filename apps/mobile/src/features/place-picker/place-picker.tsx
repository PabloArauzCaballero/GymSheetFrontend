import { Ionicons } from '@expo/vector-icons';
import { keepPreviousData, useQuery } from '@tanstack/react-query';
import * as Location from 'expo-location';
import { useEffect, useMemo, useRef, useState } from 'react';
import { ScrollView, Text, TextInput, View } from 'react-native';
import MapView, { Marker, type Region } from 'react-native-maps';
import { facilitiesService, socialService } from '@/api/services';
import { PressableScale } from '@/components/motion';
import { colors, fontSizes, iconSizes, minTouchTarget, radii, semibold, socialMapColors, spacing } from '@/theme';

export type PickedPlace = {
  /** GYM: un gimnasio del mapa. POINT: un punto tocado en el mapa. TEXT: escrito a mano. */
  kind: 'GYM' | 'POINT' | 'TEXT';
  key: string;
  label: string;
  detail?: string;
  latitude?: number;
  longitude?: number;
};

type GymOption = { key: string; name: string; detail: string; latitude: number; longitude: number };

const LA_PAZ: Region = { latitude: -16.5, longitude: -68.13, latitudeDelta: 0.06, longitudeDelta: 0.06 };
const MAX_GYM_DELTA = 2.8;
const MAX_LABEL = 180;

function boundsFor(region: Region) {
  const round = (value: number) => Math.round(value * 1_000) / 1_000;
  return {
    south: round(Math.max(-85, region.latitude - region.latitudeDelta / 2)),
    west: round(Math.max(-180, region.longitude - region.longitudeDelta / 2)),
    north: round(Math.min(85, region.latitude + region.latitudeDelta / 2)),
    east: round(Math.min(180, region.longitude + region.longitudeDelta / 2)),
  };
}

function distance(a: { latitude: number; longitude: number }, b: { latitude: number; longitude: number }) {
  const dLat = a.latitude - b.latitude;
  const dLon = (a.longitude - b.longitude) * Math.cos((a.latitude * Math.PI) / 180);
  return Math.sqrt(dLat * dLat + dLon * dLon);
}

/** «Gimnasio X · Calle Y», recortado a lo que acepta el backend. */
export function placeLabel(place: PickedPlace): string {
  const full = place.detail && place.kind !== 'TEXT' ? `${place.label} · ${place.detail}` : place.label;
  return full.trim().slice(0, MAX_LABEL);
}

async function describePoint(latitude: number, longitude: number): Promise<{ label: string; detail?: string }> {
  try {
    const [address] = await Location.reverseGeocodeAsync({ latitude, longitude });
    const street = [address?.street, address?.streetNumber].filter(Boolean).join(' ');
    const label = address?.name || street || 'Punto en el mapa';
    const detail = [address?.district, address?.city].filter(Boolean).join(', ');
    return { label, detail: detail || undefined };
  } catch {
    return { label: 'Punto en el mapa' };
  }
}

/**
 * Elegir dónde quedar: los gimnasios del mapa (REPP + OpenStreetMap), el
 * buscador por nombre, la lista de los más cercanos al centro y, si no es un
 * gimnasio, tocar cualquier punto del mapa o escribirlo.
 */
export function PlacePicker({
  value,
  onChange,
  height = 230,
}: {
  value: PickedPlace | null;
  onChange: (place: PickedPlace | null) => void;
  height?: number;
}) {
  const mapRef = useRef<MapView>(null);
  const centeredRef = useRef(false);
  const [region, setRegion] = useState<Region>(
    value?.latitude !== undefined && value.longitude !== undefined
      ? { latitude: value.latitude, longitude: value.longitude, latitudeDelta: 0.03, longitudeDelta: 0.03 }
      : LA_PAZ,
  );
  const [search, setSearch] = useState('');
  const [typing, setTyping] = useState(value?.kind === 'TEXT');
  const [text, setText] = useState(value?.kind === 'TEXT' ? value.label : '');

  useEffect(() => {
    if (value?.latitude !== undefined) return;
    void Location.getForegroundPermissionsAsync().then(async (permission) => {
      if (!permission.granted || centeredRef.current) return;
      const position = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      centeredRef.current = true;
      mapRef.current?.animateToRegion({ latitude: position.coords.latitude, longitude: position.coords.longitude, latitudeDelta: 0.04, longitudeDelta: 0.04 }, 400);
    }).catch(() => undefined);
    // Solo al abrir: después el mapa es de quien lo mueve.
  }, []);

  const bounds = boundsFor(region);
  const boundsKey = Object.values(bounds).join(':');
  const inRange = region.latitudeDelta <= MAX_GYM_DELTA;
  const external = useQuery({
    queryKey: ['social-map', 'external-gyms', boundsKey],
    queryFn: () => socialService.mapGyms(bounds),
    enabled: inRange,
    placeholderData: keepPreviousData,
  });
  const branches = useQuery({ queryKey: ['social-map', 'registered-gyms'], queryFn: facilitiesService.publicBranches });

  const gyms = useMemo<GymOption[]>(() => {
    const registered = (branches.data ?? [])
      .filter((gym) => gym.latitud !== null && gym.longitud !== null)
      .map((gym) => ({ key: `branch-${gym.id}`, name: gym.nombre, detail: gym.marca ?? 'Gimnasio en REPP', latitude: gym.latitud as number, longitude: gym.longitud as number }));
    const osm = inRange
      ? (external.data ?? []).map((gym) => ({ key: `osm-${gym.sourceId}`, name: gym.name, detail: gym.address ?? gym.city ?? 'Gimnasio', latitude: gym.latitude, longitude: gym.longitude }))
      : [];
    return [...registered, ...osm];
  }, [branches.data, external.data, inRange]);

  const visible = useMemo(() => gyms.filter((gym) =>
    gym.latitude >= bounds.south && gym.latitude <= bounds.north && gym.longitude >= bounds.west && gym.longitude <= bounds.east),
  [gyms, bounds.south, bounds.north, bounds.west, bounds.east]);

  const nearby = useMemo(() => {
    const query = search.trim().toLocaleLowerCase('es');
    const pool = query ? gyms.filter((gym) => gym.name.toLocaleLowerCase('es').includes(query)) : visible;
    return [...pool].sort((a, b) => distance(a, region) - distance(b, region)).slice(0, 12);
  }, [gyms, visible, search, region]);

  const pickGym = (gym: GymOption) => {
    setTyping(false);
    onChange({ kind: 'GYM', key: gym.key, label: gym.name, detail: gym.detail, latitude: gym.latitude, longitude: gym.longitude });
    mapRef.current?.animateToRegion({ latitude: gym.latitude, longitude: gym.longitude, latitudeDelta: Math.min(region.latitudeDelta, 0.02), longitudeDelta: Math.min(region.longitudeDelta, 0.02) }, 350);
  };

  const pickPoint = (latitude: number, longitude: number) => {
    setTyping(false);
    const key = `point-${latitude.toFixed(5)}-${longitude.toFixed(5)}`;
    onChange({ kind: 'POINT', key, label: 'Buscando la dirección…', latitude, longitude });
    void describePoint(latitude, longitude).then((found) => onChange({ kind: 'POINT', key, ...found, latitude, longitude }));
  };

  const pinned = value && value.latitude !== undefined && value.longitude !== undefined ? value : null;

  return (
    <View style={{ gap: spacing.sm }}>
      <View style={{ height: minTouchTarget, flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingHorizontal: spacing.md, borderRadius: radii.full, backgroundColor: colors.surfaceHigh, borderColor: colors.border, borderWidth: 1 }}>
        <Ionicons color={colors.textMuted} name="search" size={iconSizes.sm} />
        <TextInput
          accessibilityLabel="Buscar gimnasio"
          onChangeText={setSearch}
          placeholder="Buscar gimnasio por nombre"
          placeholderTextColor={colors.textMuted}
          returnKeyType="search"
          style={{ flex: 1, color: colors.text, fontSize: fontSizes.sm }}
          testID="place-picker-search"
          value={search}
        />
        {search ? (
          <PressableScale accessibilityLabel="Borrar búsqueda" hitSlop={8} onPress={() => setSearch('')}>
            <Ionicons color={colors.textMuted} name="close-circle" size={iconSizes.sm} />
          </PressableScale>
        ) : null}
      </View>

      <View style={{ height, borderRadius: radii.lg, overflow: 'hidden', borderColor: colors.border, borderWidth: 1 }}>
        <MapView
          initialRegion={region}
          onPress={(event) => {
            if (event.nativeEvent.action === 'marker-press') return;
            pickPoint(event.nativeEvent.coordinate.latitude, event.nativeEvent.coordinate.longitude);
          }}
          onRegionChangeComplete={setRegion}
          ref={mapRef}
          showsPointsOfInterests={false}
          showsUserLocation
          style={{ flex: 1 }}
          testID="place-picker-map"
        >
          {visible.map((gym) => {
            const selected = value?.key === gym.key;
            return (
              <Marker
                accessibilityLabel={gym.name}
                coordinate={{ latitude: gym.latitude, longitude: gym.longitude }}
                key={gym.key}
                onPress={() => pickGym(gym)}
                tracksViewChanges={selected}
              >
                <View style={{ width: 30, height: 30, borderRadius: radii.full, alignItems: 'center', justifyContent: 'center', backgroundColor: selected ? socialMapColors.selected : socialMapColors.gymPin, borderColor: socialMapColors.ring, borderWidth: 2 }}>
                  <Ionicons color={socialMapColors.gymInk} name="barbell" size={14} />
                </View>
              </Marker>
            );
          })}
          {pinned && pinned.kind === 'POINT' ? (
            <Marker coordinate={{ latitude: pinned.latitude as number, longitude: pinned.longitude as number }} key={pinned.key} pinColor={socialMapColors.selected} />
          ) : null}
        </MapView>
        <View pointerEvents="none" style={{ position: 'absolute', left: spacing.sm, bottom: spacing.sm, paddingHorizontal: spacing.sm, paddingVertical: 4, borderRadius: radii.full, backgroundColor: socialMapColors.glass }}>
          <Text style={{ color: colors.text, fontSize: fontSizes.xs }}>
            {inRange ? 'Toca un gimnasio o cualquier punto' : 'Acerca el mapa para ver gimnasios'}
          </Text>
        </View>
      </View>

      {nearby.length ? (
        <ScrollView contentContainerStyle={{ gap: spacing.xs }} horizontal keyboardShouldPersistTaps="handled" showsHorizontalScrollIndicator={false}>
          {nearby.map((gym) => {
            const selected = value?.key === gym.key;
            return (
              <PressableScale accessibilityLabel={gym.name} accessibilityState={{ selected }} haptic="selection" key={gym.key} onPress={() => pickGym(gym)} scaleTo={0.97}>
                <View style={{ width: 168, minHeight: 64, flexDirection: 'row', alignItems: 'center', gap: spacing.sm, padding: spacing.sm, borderRadius: radii.md, borderWidth: 1, borderColor: selected ? socialMapColors.selected : colors.border, backgroundColor: colors.surfaceHigh }}>
                  <View style={{ width: 32, height: 32, borderRadius: radii.full, alignItems: 'center', justifyContent: 'center', backgroundColor: selected ? socialMapColors.selected : socialMapColors.gymPin }}>
                    <Ionicons color={selected ? colors.background : socialMapColors.gymInk} name={selected ? 'checkmark' : 'barbell'} size={16} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text numberOfLines={1} style={{ color: colors.text, fontSize: fontSizes.sm, fontWeight: semibold }}>{gym.name}</Text>
                    <Text numberOfLines={1} style={{ color: colors.textMuted, fontSize: fontSizes.xs }}>{gym.detail}</Text>
                  </View>
                </View>
              </PressableScale>
            );
          })}
        </ScrollView>
      ) : search.trim() ? (
        <Text style={{ color: colors.textMuted, fontSize: fontSizes.sm }}>Ningún gimnasio con ese nombre en el mapa. Muévete a su zona o escríbelo abajo.</Text>
      ) : null}

      {typing ? (
        <View style={{ height: minTouchTarget, flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingHorizontal: spacing.md, borderRadius: radii.md, backgroundColor: colors.surfaceHigh, borderColor: colors.borderControl, borderWidth: 1 }}>
          <Ionicons color={colors.textSecondary} name="create-outline" size={iconSizes.sm} />
          <TextInput
            accessibilityLabel="Escribe el lugar"
            autoCapitalize="sentences"
            autoFocus
            maxLength={MAX_LABEL}
            onChangeText={(next) => {
              setText(next);
              onChange(next.trim().length >= 2 ? { kind: 'TEXT', key: 'text', label: next.trim() } : null);
            }}
            placeholder="Parque, plaza, dirección…"
            placeholderTextColor={colors.textMuted}
            style={{ flex: 1, color: colors.text, fontSize: fontSizes.sm }}
            testID="place-picker-text"
            value={text}
          />
        </View>
      ) : (
        <PressableScale accessibilityLabel="Escribir otro lugar" haptic="selection" onPress={() => { setTyping(true); onChange(text.trim().length >= 2 ? { kind: 'TEXT', key: 'text', label: text.trim() } : null); }}>
          <View style={{ minHeight: minTouchTarget, flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
            <Ionicons color={colors.textSecondary} name="create-outline" size={iconSizes.sm} />
            <Text style={{ color: colors.textSecondary, fontSize: fontSizes.sm }}>¿No está en el mapa? Escríbelo</Text>
          </View>
        </PressableScale>
      )}
    </View>
  );
}
