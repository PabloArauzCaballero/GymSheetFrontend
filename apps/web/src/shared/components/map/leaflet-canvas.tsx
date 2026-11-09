'use client';

import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import { useEffect, useMemo, useRef, type ReactNode, type RefObject } from 'react';
import { MapContainer, Marker, Popup, TileLayer, useMap, useMapEvents } from 'react-leaflet';
import { DEFAULT_MAP_CENTER, DEFAULT_MAP_ZOOM, PLACE_ZOOM, type LatLng } from '@/shared/lib/geo';
import { cn } from '@/shared/lib/cn';
import { useTheme } from '@/shared/theme/theme-provider';

/**
 * Teselas de CARTO sobre datos de OpenStreetMap: tienen variante clara y
 * oscura, así el mapa sigue el tema de la consola en vez de ser un parche
 * blanco en la interfaz oscura. No requieren clave.
 */
const TILES = {
  dark: 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png',
  light: 'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png',
} as const;
const ATTRIBUTION =
  '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a>';

export type MapMarker = {
  id: string;
  position: LatLng;
  label: string;
  tone?: 'active' | 'inactive' | 'draft';
  popup?: ReactNode;
};

/**
 * Pin dibujado con CSS y variables del tema (`map.css`). Los iconos PNG por
 * defecto de Leaflet se pierden al empaquetar y no siguen la marca.
 */
function pinIcon(tone: MapMarker['tone'], selected: boolean) {
  return L.divIcon({
    className: 'map-pin-host',
    html: `<span class="map-pin map-pin--${tone ?? 'active'}${selected ? ' map-pin--selected' : ''}"><span class="map-pin__dot"></span></span>`,
    iconSize: [28, 36],
    iconAnchor: [14, 34],
    popupAnchor: [0, -30],
  });
}

/** Un mapa oculto (pestaña o paso inactivo) mide 0×0: hay que recalcular al mostrarse. */
function SizeWatcher() {
  const map = useMap();
  useEffect(() => {
    const container = map.getContainer();
    const observer = new ResizeObserver(() => map.invalidateSize());
    observer.observe(container);
    return () => observer.disconnect();
  }, [map]);
  return null;
}

function FitToMarkers({ markers, fitKey }: Readonly<{ markers: MapMarker[]; fitKey: number }>) {
  const map = useMap();
  // Se reencuadra cuando cambian las posiciones (no la identidad del arreglo)
  // o cuando se pide «ver todas» incrementando `fitKey`.
  const signature = markers
    .map((marker) => `${marker.position.lat},${marker.position.lng}`)
    .join('|');
  useEffect(() => {
    const positions = signature
      ? signature.split('|').map((pair) => pair.split(',').map(Number) as [number, number])
      : [];
    if (positions.length === 0) return;
    if (positions.length === 1) map.setView(positions[0]!, PLACE_ZOOM - 2);
    else map.fitBounds(L.latLngBounds(positions), { padding: [48, 48], maxZoom: PLACE_ZOOM - 1 });
  }, [map, signature, fitKey]);
  return null;
}

function FlyToSelected({ target }: Readonly<{ target: LatLng | null }>) {
  const map = useMap();
  useEffect(() => {
    if (target) map.flyTo([target.lat, target.lng], PLACE_ZOOM, { duration: 0.6 });
  }, [map, target]);
  return null;
}

function SelectedPopup({
  markerRef,
  selected,
}: Readonly<{ markerRef: RefObject<L.Marker | null>; selected: boolean }>) {
  const map = useMap();
  useEffect(() => {
    if (!selected) return;
    // Se abre al terminar el vuelo hacia el pin: abierto a mitad de animación,
    // el ajuste automático del popup compite con el vuelo y lo deja cortado.
    const open = () => markerRef.current?.openPopup();
    map.once('moveend', open);
    // Si el mapa ya estaba encuadrado no hay movimiento que esperar.
    const fallback = window.setTimeout(open, 900);
    return () => {
      map.off('moveend', open);
      window.clearTimeout(fallback);
    };
  }, [map, markerRef, selected]);
  return null;
}

function BranchMarker({
  marker,
  selected,
  onSelect,
}: Readonly<{ marker: MapMarker; selected: boolean; onSelect?: (id: string) => void }>) {
  const ref = useRef<L.Marker | null>(null);
  const icon = useMemo(() => pinIcon(marker.tone, selected), [marker.tone, selected]);
  return (
    <Marker
      alt={marker.label}
      eventHandlers={{ click: () => onSelect?.(marker.id) }}
      icon={icon}
      position={[marker.position.lat, marker.position.lng]}
      ref={ref}
      title={marker.label}
      zIndexOffset={selected ? 1000 : 0}
    >
      {marker.popup ? <Popup>{marker.popup}</Popup> : null}
      <SelectedPopup markerRef={ref} selected={selected} />
    </Marker>
  );
}

function ThemedTiles() {
  const { theme } = useTheme();
  return <TileLayer attribution={ATTRIBUTION} key={theme} maxZoom={19} url={TILES[theme]} />;
}

export type MarkersMapProps = Readonly<{
  markers: MapMarker[];
  selectedId?: string | null;
  onSelect?: (id: string) => void;
  /** Incrementar para volver a encuadrar todas las sedes. */
  fitKey?: number;
  className?: string;
}>;

/** Mapa interactivo de solo lectura con un pin por sede. */
export function MarkersMapCanvas({
  markers,
  selectedId = null,
  onSelect,
  fitKey = 0,
  className,
}: MarkersMapProps) {
  const target = markers.find((marker) => marker.id === selectedId)?.position ?? null;
  return (
    <div className={cn('map-frame', className)}>
      <MapContainer
        center={[DEFAULT_MAP_CENTER.lat, DEFAULT_MAP_CENTER.lng]}
        className="h-full w-full"
        scrollWheelZoom={false}
        zoom={DEFAULT_MAP_ZOOM}
      >
        <ThemedTiles />
        <SizeWatcher />
        <FitToMarkers fitKey={fitKey} markers={markers} />
        <FlyToSelected target={target} />
        {markers.map((marker) => (
          <BranchMarker
            key={marker.id}
            marker={marker}
            onSelect={onSelect}
            selected={marker.id === selectedId}
          />
        ))}
      </MapContainer>
    </div>
  );
}

function PickHandler({ onPick }: Readonly<{ onPick: (point: LatLng) => void }>) {
  useMapEvents({ click: (event) => onPick({ lat: event.latlng.lat, lng: event.latlng.lng }) });
  return null;
}

function Recenter({ point, zoom }: Readonly<{ point: LatLng | null; zoom: number }>) {
  const map = useMap();
  useEffect(() => {
    if (!point) return;
    if (!map.getBounds().contains([point.lat, point.lng]) || map.getZoom() < zoom - 3) {
      map.setView([point.lat, point.lng], Math.max(map.getZoom(), zoom));
    }
  }, [map, point, zoom]);
  return null;
}

export type PickerMapProps = Readonly<{
  value: LatLng | null;
  onChange: (point: LatLng) => void;
  /** Otras sedes, en gris, como referencia al elegir. */
  context?: MapMarker[];
  initialCenter?: LatLng;
  className?: string;
}>;

/** Mapa para elegir un punto: clic en el mapa o arrastrar el pin. */
export function PickerMapCanvas({
  value,
  onChange,
  context = [],
  initialCenter,
  className,
}: PickerMapProps) {
  const icon = useMemo(() => pinIcon('draft', true), []);
  const center = value ?? initialCenter ?? DEFAULT_MAP_CENTER;
  return (
    <div className={cn('map-frame map-frame--picking', className)}>
      <MapContainer
        center={[center.lat, center.lng]}
        className="h-full w-full"
        zoom={value ? PLACE_ZOOM : initialCenter ? 12 : DEFAULT_MAP_ZOOM}
      >
        <ThemedTiles />
        <SizeWatcher />
        <PickHandler onPick={onChange} />
        <Recenter point={value} zoom={PLACE_ZOOM - 2} />
        {context.map((marker) => (
          <Marker
            alt={marker.label}
            icon={pinIcon('inactive', false)}
            key={marker.id}
            position={[marker.position.lat, marker.position.lng]}
            title={marker.label}
          />
        ))}
        {value ? (
          <Marker
            alt="Ubicación elegida"
            draggable
            eventHandlers={{
              dragend: (event) => {
                const { lat, lng } = (event.target as L.Marker).getLatLng();
                onChange({ lat, lng });
              },
            }}
            icon={icon}
            position={[value.lat, value.lng]}
            title="Arrastra para ajustar"
            zIndexOffset={1000}
          />
        ) : null}
      </MapContainer>
    </div>
  );
}
