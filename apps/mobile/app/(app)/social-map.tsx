import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Stack, useRouter } from 'expo-router';
import { Fragment, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Linking, Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import MapView, { Circle, Marker, type Region } from 'react-native-maps';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { PublicBranchSummary, SocialMapBounds, SocialMapGym } from '@gymsheet/schemas';
import { chatService, facilitiesService, socialService } from '@/api/services';
import { refreshSocialRelationship } from '@/api/social-cache';
import { Card } from '@/components/layout';
import { Button } from '@/components/ui';
import { notify } from '@/notifications';
import { useAuthStore } from '@/state/auth-store';
import { colors, radii, spacing } from '@/theme';

type Layer = 'BOTH' | 'PEOPLE' | 'GYMS';

const INITIAL_REGION: Region = {
  latitude: -16.5,
  longitude: -68.15,
  latitudeDelta: 0.12,
  longitudeDelta: 0.12,
};

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function boundsForRegion(region: Region): SocialMapBounds {
  return {
    south: clamp(region.latitude - region.latitudeDelta / 2, -85, 85),
    west: clamp(region.longitude - region.longitudeDelta / 2, -180, 180),
    north: clamp(region.latitude + region.latitudeDelta / 2, -85, 85),
    east: clamp(region.longitude + region.longitudeDelta / 2, -180, 180),
  };
}

export default function SocialMapScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const viewerId = useAuthStore((state) => state.principal?.id ?? 'anonymous');
  const queryClient = useQueryClient();
  const mapRef = useRef<MapView>(null);
  const [region, setRegion] = useState(INITIAL_REGION);
  const [searchedBounds, setSearchedBounds] = useState<SocialMapBounds | null>(null);
  const [cellId, setCellId] = useState<string | null>(null);
  const [selectedGym, setSelectedGym] = useState<PublicBranchSummary | null>(null);
  const [selectedExternalGym, setSelectedExternalGym] = useState<SocialMapGym | null>(null);
  const [cityText, setCityText] = useState('');
  const [citySearch, setCitySearch] = useState('');
  const [layer, setLayer] = useState<Layer>('BOTH');
  const boundsKey = searchedBounds ? Object.values(searchedBounds).join(':') : 'unsearched';

  const areas = useQuery({
    queryKey: ['social-map', viewerId, 'areas', boundsKey],
    queryFn: () => socialService.mapAreas(searchedBounds!),
    enabled: searchedBounds !== null,
  });
  const people = useQuery({
    queryKey: ['social-map', viewerId, 'people', cellId],
    queryFn: () => socialService.mapPeople(cellId!),
    enabled: cellId !== null,
  });
  const gyms = useQuery({ queryKey: ['social-map', 'registered-gyms'], queryFn: facilitiesService.publicBranches });
  const externalGyms = useQuery({
    queryKey: ['social-map', 'external-gyms', boundsKey],
    queryFn: () => socialService.mapGyms(searchedBounds!),
    enabled: searchedBounds !== null,
  });
  const cities = useQuery({
    queryKey: ['social-map', 'cities', citySearch],
    queryFn: () => socialService.searchMapCities(citySearch),
    enabled: citySearch.trim().length >= 2,
  });
  const visibleGyms = useMemo(() => {
    if (!searchedBounds) return [];
    return (gyms.data ?? []).filter((gym) => gym.latitud !== null && gym.longitud !== null &&
      gym.latitud >= searchedBounds.south && gym.latitud <= searchedBounds.north &&
      gym.longitud >= searchedBounds.west && gym.longitud <= searchedBounds.east);
  }, [gyms.data, searchedBounds]);
  const connect = useMutation({
    mutationFn: (userId: string) => socialService.sendConnection(userId),
    onSuccess: async (_result, _userId) => {
      await refreshSocialRelationship(queryClient);
      notify.success('Solicitud enviada.');
    },
    onError: () => notify.error('No se pudo enviar la solicitud. Intenta de nuevo.'),
  });
  const message = useMutation({
    mutationFn: (userId: string) => chatService.startConversation(userId),
    onSuccess: (conversation) => router.push({ pathname: '/chat/[id]', params: { id: conversation.conversationId } }),
    onError: () => notify.error('No se pudo abrir el chat. Intenta de nuevo.'),
  });
  const withdraw = useMutation({
    mutationFn: (connectionId: string) => socialService.withdrawConnection(connectionId),
    onSuccess: async (_result, _connectionId) => {
      await refreshSocialRelationship(queryClient);
      notify.success('Solicitud retirada.');
    },
    onError: () => notify.error('No se pudo retirar la solicitud. Intenta de nuevo.'),
  });

  return (
    <View style={{ flex: 1, backgroundColor: colors.background, paddingTop: insets.top, paddingHorizontal: spacing.md }}>
      <Stack.Screen options={{ title: 'Mapa de comunidad' }} />
      <ScrollView contentContainerStyle={{ gap: spacing.md, paddingBottom: insets.bottom + spacing.xl }}>
        <View style={{ gap: spacing.xs }}>
          <Text style={{ color: colors.text, fontSize: 24, fontWeight: '700' }}>Personas y gimnasios cerca</Text>
          <Text style={{ color: colors.textMuted, lineHeight: 21 }}>
            Mueve el mapa a otra zona y busca allí. Las personas aparecen agrupadas en áreas aproximadas de 2 km.
          </Text>
        </View>

        <View style={{ flexDirection: 'row', gap: spacing.xs }}>
          <TextInput accessibilityLabel="Buscar ciudad" onChangeText={setCityText} onSubmitEditing={() => setCitySearch(cityText.trim())} placeholder="Busca una ciudad" placeholderTextColor={colors.textMuted} value={cityText} style={{ flex: 1, borderColor: colors.borderSubtle, borderRadius: radii.full, borderWidth: 1, color: colors.text, paddingHorizontal: spacing.md, paddingVertical: spacing.sm }} />
          <Button label="Buscar" onPress={() => setCitySearch(cityText.trim())} />
        </View>
        {cities.isLoading ? <ActivityIndicator color={colors.volt} /> : null}
        {cities.isError ? <Text accessibilityRole="alert" style={{ color: colors.danger }}>No se pudo buscar la ciudad.</Text> : null}
        {citySearch.length >= 2 && cities.data?.length === 0 && !cities.isFetching ? <Text style={{ color: colors.textMuted }}>No encontramos esa ciudad en el extracto disponible.</Text> : null}
        {(cities.data ?? []).map((city) => (
          <Pressable accessibilityRole="button" key={city.id} onPress={() => {
            setCellId(null);
            const target = { latitude: city.latitude, longitude: city.longitude, latitudeDelta: 0.08, longitudeDelta: 0.08 };
            mapRef.current?.animateToRegion(target, 500);
            setRegion(target);
          }} style={{ borderColor: colors.borderSubtle, borderRadius: radii.md, borderWidth: 1, padding: spacing.sm }}>
            <Text style={{ color: colors.text, fontWeight: '600' }}>{city.name}{city.region ? ` · ${city.region}` : ''}</Text>
          </Pressable>
        ))}

        <View style={{ flexDirection: 'row', gap: spacing.xs }}>
          {([
            ['BOTH', 'Ambos'], ['PEOPLE', 'Personas'], ['GYMS', 'Gimnasios'],
          ] as const).map(([value, label]) => (
            <Pressable
              accessibilityRole="button"
              accessibilityState={{ selected: layer === value }}
              key={value}
              onPress={() => setLayer(value)}
              style={{ backgroundColor: layer === value ? colors.surfaceHigh : colors.surface, borderColor: layer === value ? colors.volt : colors.borderSubtle, borderRadius: radii.full, borderWidth: 1, paddingHorizontal: spacing.md, paddingVertical: spacing.sm }}
            ><Text style={{ color: colors.text, fontWeight: layer === value ? '700' : '500' }}>{label}</Text></Pressable>
          ))}
        </View>

        <View style={{ height: 390, overflow: 'hidden', borderRadius: radii.xl }}>
          <MapView
            initialRegion={INITIAL_REGION}
            onRegionChangeComplete={setRegion}
            ref={mapRef}
            style={{ flex: 1 }}
          >
            {layer !== 'GYMS' && (areas.data?.cells ?? []).map((cell) => (
              <Fragment key={cell.id}>
                <Circle center={cell.center} radius={900} fillColor="rgba(200,243,29,0.18)" strokeColor="rgba(150,190,10,0.8)" />
                <Marker
                  coordinate={cell.center}
                  onPress={() => setCellId(cell.id)}
                  pinColor="#9bc400"
                  title={`${cell.count} ${cell.count === 1 ? 'persona' : 'personas'}`}
                  description="Toca para ver perfiles en esta zona"
                />
              </Fragment>
            ))}
            {layer !== 'PEOPLE' && visibleGyms.map((gym) => {
              if (gym.latitud === null || gym.longitud === null) return null;
              return <Marker
                coordinate={{ latitude: gym.latitud, longitude: gym.longitud }}
                key={gym.id}
                onPress={() => setSelectedGym(gym)}
                pinColor="#6256d9"
                title={gym.nombre}
                description="Gimnasio registrado en GymSheet"
              />;
            })}
            {layer !== 'PEOPLE' && (externalGyms.data ?? []).map((gym) => (
              <Marker coordinate={{ latitude: gym.latitude, longitude: gym.longitude }} key={gym.sourceId} onPress={() => setSelectedExternalGym(gym)} pinColor="#e58b35" title={gym.name} description="OpenStreetMap · gimnasio externo" />
            ))}
          </MapView>
        </View>

        {selectedGym ? (
          <Card>
            <View style={{ gap: spacing.sm }}>
              <Text style={{ color: colors.text, fontSize: 18, fontWeight: '700' }}>{selectedGym.nombre}</Text>
              <Text style={{ color: colors.textMuted }}>Sede registrada en GymSheet</Text>
              <Button
                label="Abrir navegación"
                onPress={() => {
                  if (selectedGym.latitud === null || selectedGym.longitud === null) return;
                  void Linking.openURL(`https://maps.google.com/?q=${selectedGym.latitud},${selectedGym.longitud}`)
                    .catch(() => notify.error('No se pudo abrir la aplicación de mapas.'));
                }}
              />
            </View>
          </Card>
        ) : null}

        {selectedExternalGym ? (
          <Card>
            <View style={{ gap: spacing.sm }}>
              <Text style={{ color: colors.text, fontSize: 18, fontWeight: '700' }}>{selectedExternalGym.name}</Text>
              <Text style={{ color: colors.textMuted }}>{selectedExternalGym.address ?? selectedExternalGym.city ?? 'Dirección no disponible'} · Directorio externo OpenStreetMap</Text>
              <Text accessibilityRole="link" onPress={() => { void Linking.openURL('https://www.openstreetmap.org/copyright'); }} style={{ color: colors.accentInk }}>© OpenStreetMap contributors · ODbL</Text>
              <Button label="Abrir navegación" onPress={() => {
                void Linking.openURL(`https://maps.google.com/?q=${selectedExternalGym.latitude},${selectedExternalGym.longitude}`)
                  .catch(() => notify.error('No se pudo abrir la aplicación de mapas.'));
              }} />
            </View>
          </Card>
        ) : null}

        <Button label="Buscar en esta zona" onPress={() => {
          setCellId(null);
          setSelectedGym(null);
          setSelectedExternalGym(null);
          setSearchedBounds(boundsForRegion(region));
        }} />
        {areas.isFetching ? <ActivityIndicator color={colors.volt} /> : null}
        {areas.isError ? <Text accessibilityRole="alert" style={{ color: colors.danger }}>No se pudo cargar el mapa. Intenta de nuevo.</Text> : null}
        {externalGyms.isError ? <Text accessibilityRole="alert" style={{ color: colors.danger }}>No se pudo cargar el directorio externo.</Text> : null}
        {searchedBounds && areas.data?.cells.length === 0 ? <Text style={{ color: colors.textMuted }}>No hay personas visibles en esta zona.</Text> : null}

        {layer !== 'GYMS' && (areas.data?.cells ?? []).map((cell) => (
          <Pressable accessibilityRole="button" accessibilityLabel={`${cell.count} ${cell.count === 1 ? 'persona elegible' : 'personas elegibles'} en una zona aproximada`} key={`list-${cell.id}`} onPress={() => setCellId(cell.id)} style={{ borderColor: colors.borderSubtle, borderRadius: radii.md, borderWidth: 1, padding: spacing.md }}>
            <Text style={{ color: colors.text, fontWeight: '600' }}>{cell.count} {cell.count === 1 ? 'persona elegible' : 'personas elegibles'} · zona aproximada</Text>
          </Pressable>
        ))}

        {cellId ? (
          <Card>
            <View style={{ gap: spacing.md }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                <Text style={{ color: colors.text, fontSize: 18, fontWeight: '700' }}>Personas en esta zona</Text>
                <Pressable accessibilityRole="button" onPress={() => setCellId(null)}><Text style={{ color: colors.accentInk }}>Cerrar</Text></Pressable>
              </View>
              {people.isLoading ? <ActivityIndicator color={colors.volt} /> : null}
              {people.isError ? <Text accessibilityRole="alert" style={{ color: colors.danger }}>No se pudieron cargar los perfiles.</Text> : null}
              {(people.data ?? []).map((person) => (
                <View key={person.userId} style={{ borderTopColor: colors.borderSubtle, borderTopWidth: 1, gap: spacing.xs, paddingTop: spacing.md }}>
                  <Pressable accessibilityRole="button" onPress={() => router.push({ pathname: '/perfil/[userId]', params: { userId: person.userId } })}>
                    <Text style={{ color: colors.text, fontSize: 16, fontWeight: '700' }}>{person.displayName}</Text>
                  </Pressable>
                  <Text style={{ color: colors.textMuted }}>{person.age ? `${person.age} años` : 'Edad no disponible'}{person.branchName ? ` · ${person.branchName}` : ''}</Text>
                  {person.connectionStatus === 'NONE' ? (
                    <Button label="Conectar" loading={connect.isPending && connect.variables === person.userId} onPress={() => connect.mutate(person.userId)} />
                  ) : person.connectionStatus === 'ACCEPTED' ? (
                    <Button label="Enviar mensaje" loading={message.isPending && message.variables === person.userId} onPress={() => message.mutate(person.userId)} />
                  ) : person.connectionStatus === 'PENDING_SENT' ? (
                    <Button label="Cancelar invitación de conexión" loading={withdraw.isPending && withdraw.variables === person.connectionId} onPress={() => { if (person.connectionId) withdraw.mutate(person.connectionId); }} variant="ghost" />
                  ) : (
                    <Text style={{ color: colors.textMuted }}>Te escribió — revisa Solicitudes</Text>
                  )}
                </View>
              ))}
              {people.data?.length === 0 ? <Text style={{ color: colors.textMuted }}>Ya no hay perfiles visibles en esta zona.</Text> : null}
            </View>
          </Card>
        ) : null}

        <Text style={{ color: colors.textMuted, fontSize: 12 }}>
          Gimnasios visibles: {visibleGyms.length} sedes registradas y {externalGyms.data?.length ?? 0} externos. Cobertura según los datos disponibles.
        </Text>
        <Text accessibilityRole="link" onPress={() => { void Linking.openURL('https://www.openstreetmap.org/copyright'); }} style={{ color: colors.accentInk, fontSize: 12 }}>© OpenStreetMap contributors · Datos ODbL</Text>
        {layer !== 'PEOPLE' && (externalGyms.data ?? []).map((gym) => <Pressable accessibilityRole="button" key={`list-${gym.sourceId}`} onPress={() => { setSelectedExternalGym(gym); mapRef.current?.animateToRegion({ latitude: gym.latitude, longitude: gym.longitude, latitudeDelta: 0.01, longitudeDelta: 0.01 }, 350); }} style={{ borderColor: colors.borderSubtle, borderRadius: radii.md, borderWidth: 1, padding: spacing.md }}><Text style={{ color: colors.text, fontWeight: '600' }}>{gym.name}</Text><Text style={{ color: colors.textMuted }}>{gym.address ?? gym.city ?? 'Dirección no disponible'} · OpenStreetMap</Text></Pressable>)}
        {layer !== 'PEOPLE' && visibleGyms.map((gym) => <Pressable accessibilityRole="button" key={`branch-${gym.id}`} onPress={() => {
          setSelectedGym(gym);
          if (gym.latitud !== null && gym.longitud !== null) mapRef.current?.animateToRegion({ latitude: gym.latitud, longitude: gym.longitud, latitudeDelta: 0.01, longitudeDelta: 0.01 }, 350);
        }} style={{ borderColor: colors.borderSubtle, borderRadius: radii.md, borderWidth: 1, padding: spacing.md }}><Text style={{ color: colors.text, fontWeight: '600' }}>{gym.nombre}</Text><Text style={{ color: colors.textMuted }}>Sede registrada en GymSheet</Text></Pressable>)}
        {(externalGyms.data ?? []).length === 0 && searchedBounds && !externalGyms.isFetching ? <Text style={{ color: colors.textMuted }}>No hay gimnasios externos registrados en esta zona.</Text> : null}
      </ScrollView>
    </View>
  );
}
