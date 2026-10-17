'use client';

import 'leaflet/dist/leaflet.css';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { CircleMarker, MapContainer, Popup, TileLayer, useMap, useMapEvents } from 'react-leaflet';
import type { Map as LeafletMap } from 'leaflet';
import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { socialService } from '@/features/social/services/social-service';
import { publicFacilitiesClient } from '@/features/public-facilities/services/public-facilities-client';
import type { SocialMapBounds } from '@/shared/api/schemas';
import { mapMarkerColors } from '@/shared/theme/map-marker-colors';

type Layer = 'BOTH' | 'PEOPLE' | 'GYMS';
const MAP_TILE_URL = process.env.NEXT_PUBLIC_MAP_TILE_URL ||
  (process.env.NODE_ENV === 'development' ? 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png' : null);
const MAP_TILE_ATTRIBUTION = process.env.NEXT_PUBLIC_MAP_TILE_ATTRIBUTION ||
  '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap contributors</a>';

function CityRelocator({ city }: Readonly<{ city: { latitude: number; longitude: number } | null }>) {
  const map = useMap();
  useEffect(() => {
    if (city) map.flyTo([city.latitude, city.longitude], 13, { duration: 0.5 });
  }, [city, map]);
  return null;
}

function boundsForMap(map: LeafletMap): SocialMapBounds {
  const bounds = map.getBounds();
  return {
    south: bounds.getSouth(),
    west: bounds.getWest(),
    north: bounds.getNorth(),
    east: bounds.getEast(),
  };
}

function BoundsWatcher({ onChange }: Readonly<{ onChange: (bounds: SocialMapBounds) => void }>) {
  const map = useMapEvents({ moveend: (event) => onChange(boundsForMap(event.target)) });
  useEffect(() => onChange(boundsForMap(map)), [map, onChange]);
  return null;
}

export function SocialMapClient({ viewerId }: Readonly<{ viewerId: string }>) {
  const [layer, setLayer] = useState<Layer>('BOTH');
  const [pendingBounds, setPendingBounds] = useState<SocialMapBounds | null>(null);
  const [searchedBounds, setSearchedBounds] = useState<SocialMapBounds | null>(null);
  const [cellId, setCellId] = useState<string | null>(null);
  const [cityText, setCityText] = useState('');
  const [citySearch, setCitySearch] = useState('');
  const [selectedCity, setSelectedCity] = useState<{ latitude: number; longitude: number } | null>(null);
  const queryClient = useQueryClient();
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
  const registeredGyms = useQuery({ queryKey: ['social-map', 'registered-gyms'], queryFn: publicFacilitiesClient.branches });
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
  const connect = useMutation({
    mutationFn: (userId: string) => socialService.sendConnection(userId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['social-map', viewerId, 'people', cellId] }),
  });

  const visibleGyms = useMemo(() => {
    if (!searchedBounds) return [];
    return (registeredGyms.data ?? []).filter((gym) => {
      const { latitud, longitud } = gym;
      return latitud !== null && longitud !== null &&
        latitud >= searchedBounds.south && latitud <= searchedBounds.north &&
        longitud >= searchedBounds.west && longitud <= searchedBounds.east;
    });
  }, [registeredGyms.data, searchedBounds]);

  return (
    <main className="grid gap-5">
      <header className="grid gap-2">
        <p className="data-label text-[var(--accent-ink)]">COMUNIDAD · EXPLORAR</p>
        <h1 className="display-title">Personas y gimnasios cerca</h1>
        <p className="max-w-2xl text-sm leading-6 text-[var(--text-muted)]">
          Explora zonas aproximadas de personas que eligieron aparecer en el mapa. Arrastra el mapa
          a otra zona y pulsa «Buscar en esta zona» para actualizar los resultados.
        </p>
      </header>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <form className="flex min-w-64 flex-1 flex-wrap gap-2" onSubmit={(event) => { event.preventDefault(); setCitySearch(cityText.trim()); }}>
          <label className="sr-only" htmlFor="social-map-city">Buscar ciudad</label>
          <input id="social-map-city" className="min-w-52 flex-1 rounded-full border border-[var(--border-subtle)] bg-[var(--surface-low)] px-4 py-2 text-sm" value={cityText} onChange={(event) => setCityText(event.target.value)} placeholder="Busca una ciudad" />
          <button className="rounded-full border border-[var(--border-subtle)] px-4 py-2 text-sm" type="submit">Buscar ciudad</button>
        </form>
        <fieldset className="flex flex-wrap gap-2" aria-label="Capas del mapa">
          {([
            ['BOTH', 'Ambos'], ['PEOPLE', 'Personas'], ['GYMS', 'Gimnasios'],
          ] as const).map(([value, label]) => (
            <button
              aria-pressed={layer === value}
              className={`rounded-full border px-4 py-2 text-sm ${layer === value ? 'border-[var(--volt)] bg-[var(--surface-high)]' : 'border-[var(--border-subtle)]'}`}
              key={value}
              onClick={() => setLayer(value)}
              type="button"
            >{label}</button>
          ))}
        </fieldset>
        <button
          className="rounded-full bg-[var(--volt)] px-5 py-2.5 text-sm font-semibold text-[var(--accent-contrast)] disabled:opacity-50"
          disabled={!pendingBounds}
          onClick={() => { setCellId(null); setSearchedBounds(pendingBounds); }}
          type="button"
        >Buscar en esta zona</button>
      </div>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_22rem]">
        <div className="h-[min(68vh,46rem)] min-h-80 overflow-hidden rounded-3xl border border-[var(--border-subtle)]">
          <MapContainer center={[-16.5, -68.15]} className="size-full" scrollWheelZoom zoom={12}>
            <CityRelocator city={selectedCity} />
            {MAP_TILE_URL ? <TileLayer attribution={MAP_TILE_ATTRIBUTION} url={MAP_TILE_URL} /> : null}
            <BoundsWatcher onChange={setPendingBounds} />
            {layer !== 'GYMS' && (areas.data?.cells ?? []).map((cell) => (
              <CircleMarker
                center={[cell.center.latitude, cell.center.longitude]}
                eventHandlers={{ click: () => setCellId(cell.id) }}
                key={cell.id}
                pathOptions={{ color: mapMarkerColors.people, fillColor: mapMarkerColors.people, fillOpacity: 0.72, weight: 2 }}
                radius={Math.min(26, 9 + cell.count)}
              >
                <Popup>{cell.count} {cell.count === 1 ? 'persona' : 'personas'} eligibles · zona aproximada</Popup>
              </CircleMarker>
            ))}
            {layer !== 'PEOPLE' && visibleGyms.map((gym) => (
              <CircleMarker
                center={[gym.latitud as number, gym.longitud as number]}
                key={gym.id}
                pathOptions={{ color: mapMarkerColors.registeredGym, fillColor: mapMarkerColors.registeredGym, fillOpacity: 0.9, weight: 2 }}
                radius={8}
              >
                <Popup><Link href={`/gimnasios/${gym.id}`}>{gym.nombre}</Link><br />Gimnasio registrado</Popup>
              </CircleMarker>
            ))}
            {layer !== 'PEOPLE' && (externalGyms.data ?? []).map((gym) => (
              <CircleMarker center={[gym.latitude, gym.longitude]} key={gym.sourceId} pathOptions={{ color: mapMarkerColors.externalGym, fillColor: mapMarkerColors.externalGym, fillOpacity: 0.9, weight: 2 }} radius={7}>
                <Popup>
                  <strong>{gym.name}</strong><br />{gym.address ?? gym.city ?? 'Dirección no disponible'}<br />
                  OpenStreetMap · externo<br /><a href="https://www.openstreetmap.org/copyright" rel="noreferrer" target="_blank">© OpenStreetMap contributors</a>
                </Popup>
              </CircleMarker>
            ))}
          </MapContainer>
        </div>

        <aside aria-live="polite" className="max-h-[min(68vh,46rem)] overflow-y-auto rounded-3xl border border-[var(--border-subtle)] bg-[var(--surface-low)] p-5">
          {cellId ? (
            <>
              <button className="mb-4 text-sm text-[var(--accent-ink)]" onClick={() => setCellId(null)} type="button">← Todas las zonas</button>
              <h2 className="mb-4 text-lg font-semibold">Personas en esta zona</h2>
              {people.isLoading ? <p role="status">Buscando personas…</p> : null}
              {people.isError ? <p role="alert">No se pudo cargar esta zona. Intenta de nuevo.</p> : null}
              {people.data?.length === 0 ? <p className="text-sm text-[var(--text-muted)]">Ya no hay perfiles visibles en esta zona.</p> : null}
              <ul className="grid gap-3">
                {(people.data ?? []).map((person) => (
                  <li className="rounded-2xl border border-[var(--border-subtle)] p-4" key={person.userId}>
                    <Link className="font-semibold hover:underline" href={`/perfil/${person.userId}`}>{person.displayName}</Link>
                    <p className="mt-1 text-sm text-[var(--text-muted)]">{person.age ? `${person.age} años` : 'Edad no disponible'}{person.branchName ? ` · ${person.branchName}` : ''}</p>
                    {person.connectionStatus === 'NONE' ? (
                      <button
                        className="mt-3 rounded-full border border-[var(--border)] px-4 py-2 text-sm"
                        disabled={connect.isPending}
                        onClick={() => connect.mutate(person.userId)}
                        type="button"
                      >Conectar</button>
                    ) : <p className="mt-3 text-sm text-[var(--text-muted)]">{person.connectionStatus === 'ACCEPTED' ? 'Ya están conectados' : 'Solicitud pendiente'}</p>}
                  </li>
                ))}
              </ul>
            </>
          ) : (
            <>
              <h2 className="text-lg font-semibold">Explorar el mapa</h2>
              {!MAP_TILE_URL ? <p className="mt-2 text-sm text-[var(--text-muted)]" role="status">El fondo del mapa no está configurado. Puedes seguir buscando ciudades y consultar la lista.</p> : null}
              {cities.isLoading ? <p role="status">Buscando ciudades…</p> : null}
              {cities.isError ? <p role="alert">No se pudo buscar la ciudad. Intenta de nuevo.</p> : null}
              {citySearch.length >= 2 && cities.data?.length === 0 && !cities.isFetching ? <p className="text-sm text-[var(--text-muted)]">No encontramos esa ciudad en el extracto disponible.</p> : null}
              {(cities.data ?? []).length > 0 ? <ul aria-label="Ciudades encontradas" className="mt-2 grid gap-2">{cities.data!.map((city) => <li key={city.id}><button className="w-full rounded-xl border border-[var(--border-subtle)] p-3 text-left" onClick={() => { setSelectedCity({ latitude: city.latitude, longitude: city.longitude }); setCellId(null); }} type="button"><span className="font-medium">{city.name}</span>{city.region ? <span className="text-[var(--text-muted)]"> · {city.region}</span> : null}</button></li>)}</ul> : null}
              <p className="mt-2 text-sm leading-6 text-[var(--text-muted)]">Busca una zona y toca un grupo para ver perfiles disponibles. Los puntos de gimnasios muestran sedes ya registradas en GymSheet.</p>
              {areas.isError ? <p className="mt-4 text-sm" role="alert">No se pudo cargar el mapa. Intenta otra vez.</p> : null}
              {externalGyms.isError ? <p className="mt-3 text-sm" role="alert">No se pudo cargar el directorio externo de gimnasios.</p> : null}
              {(areas.data?.cells.length ?? 0) > 0 && layer !== 'GYMS' ? <ul aria-label="Zonas con personas" className="mt-4 grid gap-2">{areas.data!.cells.map((cell) => <li key={cell.id}><button className="w-full rounded-xl border border-[var(--border-subtle)] p-3 text-left" onClick={() => setCellId(cell.id)} type="button">{cell.count} {cell.count === 1 ? 'persona elegible' : 'personas elegibles'} · zona aproximada</button></li>)}</ul> : null}
              {searchedBounds && layer !== 'PEOPLE' ? <ul aria-label="Gimnasios de esta zona" className="mt-4 grid gap-2">{(externalGyms.data ?? []).map((gym) => <li className="rounded-xl border border-[var(--border-subtle)] p-3" key={gym.sourceId}><p className="font-medium">{gym.name}</p><p className="text-xs text-[var(--text-muted)]">{gym.address ?? gym.city ?? 'Dirección no disponible'} · OpenStreetMap</p></li>)}</ul> : null}
              {searchedBounds && layer !== 'PEOPLE' ? <ul aria-label="Sedes GymSheet de esta zona" className="mt-2 grid gap-2">{visibleGyms.map((gym) => <li className="rounded-xl border border-[var(--border-subtle)] p-3" key={gym.id}><Link className="font-medium" href={`/gimnasios/${gym.id}`}>{gym.nombre}</Link><p className="text-xs text-[var(--text-muted)]">Sede registrada en GymSheet</p></li>)}</ul> : null}
              {searchedBounds && areas.data?.cells.length === 0 ? <p className="mt-4 text-sm text-[var(--text-muted)]">No hay personas visibles en esta zona.</p> : null}
              <p className="mt-6 text-xs text-[var(--text-muted)]">La ubicación de cada persona se agrupa en zonas de aproximadamente 2 km.</p>
              <p className="mt-4 text-xs text-[var(--text-muted)]">Gimnasios visibles: {visibleGyms.length} registrados y {externalGyms.data?.length ?? 0} externos.</p>
              <p className="mt-2 text-xs text-[var(--text-muted)]"><a href="https://www.openstreetmap.org/copyright" rel="noreferrer" target="_blank">© OpenStreetMap contributors</a> · Datos con licencia ODbL.</p>
            </>
          )}
        </aside>
      </div>
    </main>
  );
}
