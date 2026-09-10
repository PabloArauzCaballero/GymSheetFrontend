'use client';

import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import { useEffect } from 'react';
import { MapContainer, Marker, Popup, TileLayer, useMap } from 'react-leaflet';

type MapPoint = { id: string; nombre: string; latitud: number; longitud: number };

function markerIcon(active: boolean) {
  const size = active ? 20 : 14;
  return L.divIcon({
    className: '',
    html: `<span style="display:block;width:${size}px;height:${size}px;border-radius:9999px;background:${
      active ? 'var(--volt)' : 'var(--surface)'
    };border:2px solid ${active ? 'var(--accent-contrast)' : 'var(--volt)'};box-shadow:var(--shadow-sm);"></span>`,
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
  });
}

/** Ajusta el encuadre a todos los puntos cuando hay más de una sede; con una sola, el `center`/`zoom` del mapa ya alcanzan. */
function FitBounds({ points }: Readonly<{ points: MapPoint[] }>) {
  const map = useMap();
  useEffect(() => {
    if (points.length < 2) return;
    map.fitBounds(
      points.map((point) => [point.latitud, point.longitud]),
      { padding: [40, 40] },
    );
  }, [map, points]);
  return null;
}

/**
 * Mapa de sedes con OpenStreetMap (sin API key ni facturación): el embed
 * simple de Google Maps solo admite un punto por `iframe`, y acá el pedido es
 * mostrar TODAS las sucursales de la cadena a la vez.
 */
export function BranchesMap({
  branches,
  activeId,
  onSelect,
}: Readonly<{
  branches: MapPoint[];
  activeId?: string;
  onSelect?: (id: string) => void;
}>) {
  const first = branches[0];
  if (!first) return null;

  return (
    <MapContainer
      center={[first.latitud, first.longitud]}
      className="size-full"
      scrollWheelZoom={false}
      zoom={14}
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      <FitBounds points={branches} />
      {branches.map((branch) => (
        <Marker
          eventHandlers={onSelect ? { click: () => onSelect(branch.id) } : undefined}
          icon={markerIcon(branch.id === activeId)}
          key={branch.id}
          position={[branch.latitud, branch.longitud]}
        >
          <Popup>{branch.nombre}</Popup>
        </Marker>
      ))}
    </MapContainer>
  );
}
