'use client';

import { Crosshair, LoaderCircle, MapPin, Search } from 'lucide-react';
import { useEffect, useRef, useState, type KeyboardEvent } from 'react';
import { geocodingClient, type Place } from '@/shared/api/geocoding-client';
import { Button } from '@/shared/components/ui/button';
import { Field } from '@/shared/components/ui/field';
import { Input } from '@/shared/components/ui/input';
import { isValidLatLng, parseCoordinate, roundCoordinate, type LatLng } from '@/shared/lib/geo';
import { PickerMap, type MapMarker } from './index';

type LocationPickerProps = Readonly<{
  defaultPoint?: LatLng | null;
  defaultAddress?: string | null;
  /** Otras sedes, como referencia. */
  context?: MapMarker[];
  initialCenter?: LatLng;
}>;

/**
 * Elegir la ubicación de una sede: buscando la dirección, con la ubicación del
 * equipo, haciendo clic en el mapa, arrastrando el pin o escribiendo las
 * coordenadas. Publica en el formulario `latitud`, `longitud` y `direccion`.
 *
 * La dirección se completa sola a partir del punto mientras el usuario no la
 * haya escrito; en cuanto la toca, es suya y no se vuelve a pisar.
 */
export function LocationPicker({
  defaultPoint = null,
  defaultAddress = null,
  context,
  initialCenter,
}: LocationPickerProps) {
  const [point, setPoint] = useState<LatLng | null>(defaultPoint);
  const [latText, setLatText] = useState(defaultPoint ? String(defaultPoint.lat) : '');
  const [lngText, setLngText] = useState(defaultPoint ? String(defaultPoint.lng) : '');
  const [address, setAddress] = useState(defaultAddress ?? '');
  const addressTouched = useRef(Boolean(defaultAddress));
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Place[] | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [busy, setBusy] = useState<'search' | 'locate' | null>(null);
  const reverseAbort = useRef<AbortController | null>(null);

  useEffect(() => () => reverseAbort.current?.abort(), []);

  const place = (next: LatLng, label?: string) => {
    const rounded = { lat: roundCoordinate(next.lat), lng: roundCoordinate(next.lng) };
    setPoint(rounded);
    setLatText(String(rounded.lat));
    setLngText(String(rounded.lng));
    if (label && !addressTouched.current) {
      setAddress(label);
      return;
    }
    if (addressTouched.current) return;
    reverseAbort.current?.abort();
    const controller = new AbortController();
    reverseAbort.current = controller;
    void geocodingClient.reverse(rounded.lat, rounded.lng, controller.signal).then((result) => {
      if (!controller.signal.aborted && !addressTouched.current && result.places[0]) {
        setAddress(result.places[0].label);
      }
    });
  };

  const syncFromText = (nextLat: string, nextLng: string) => {
    const lat = parseCoordinate(nextLat);
    const lng = parseCoordinate(nextLng);
    if (lat !== null && lng !== null && isValidLatLng(lat, lng)) setPoint({ lat, lng });
  };

  const search = async () => {
    const text = query.trim();
    if (text.length < 3) {
      setStatus('Escribe al menos 3 caracteres para buscar.');
      return;
    }
    setBusy('search');
    setStatus(null);
    const result = await geocodingClient.search(text);
    setBusy(null);
    setResults(result.places);
    if (!result.ok) setStatus('La búsqueda no está disponible. Marca el punto en el mapa.');
    else if (result.places.length === 0) setStatus('Sin resultados. Prueba con calle y ciudad.');
  };

  const onSearchKey = (event: KeyboardEvent<HTMLInputElement>) => {
    // Dentro del asistente, Enter avanzaría de paso: aquí significa «buscar».
    if (event.key === 'Enter') {
      event.preventDefault();
      void search();
    }
  };

  const locate = () => {
    if (!('geolocation' in navigator)) {
      setStatus('Este navegador no ofrece geolocalización.');
      return;
    }
    setBusy('locate');
    setStatus(null);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setBusy(null);
        place({ lat: position.coords.latitude, lng: position.coords.longitude });
      },
      () => {
        setBusy(null);
        setStatus('No se pudo obtener tu ubicación. Revisa el permiso del navegador.');
      },
      { enableHighAccuracy: true, timeout: 10_000 },
    );
  };

  return (
    <div className="grid gap-4">
      <div className="grid gap-2">
        <label className="data-label" htmlFor="location-search">
          Buscar dirección
        </label>
        <div className="flex flex-col gap-2 sm:flex-row">
          <Input
            autoComplete="off"
            id="location-search"
            onChange={(event) => setQuery(event.target.value)}
            onKeyDown={onSearchKey}
            placeholder="Ej.: Av. Monseñor Rivero, Santa Cruz"
            value={query}
          />
          <div className="flex gap-2">
            <Button
              className="flex-1 sm:flex-none"
              loading={busy === 'search'}
              onClick={() => void search()}
              type="button"
            >
              {busy === 'search' ? null : <Search aria-hidden className="size-4" />}
              Buscar
            </Button>
            <Button
              aria-label="Usar mi ubicación actual"
              className="flex-1 sm:flex-none"
              disabled={busy === 'locate'}
              onClick={locate}
              title="Usar mi ubicación actual"
              type="button"
            >
              {busy === 'locate' ? (
                <LoaderCircle aria-hidden className="size-4 animate-spin" />
              ) : (
                <Crosshair aria-hidden className="size-4" />
              )}
              <span className="sm:hidden">Mi ubicación</span>
            </Button>
          </div>
        </div>
        {results && results.length > 0 ? (
          <ul aria-label="Resultados de búsqueda" className="grid gap-1">
            {results.map((result) => (
              <li key={`${result.lat},${result.lng}`}>
                <button
                  className="flex w-full items-start gap-2 rounded-[4px] border border-transparent px-2 py-2 text-left text-sm hover:border-[var(--border)] hover:bg-[var(--surface)]"
                  onClick={() => {
                    place({ lat: result.lat, lng: result.lng }, result.label);
                    setResults(null);
                  }}
                  type="button"
                >
                  <MapPin aria-hidden className="mt-0.5 size-4 shrink-0 text-[var(--accent-ink)]" />
                  <span>{result.label}</span>
                </button>
              </li>
            ))}
          </ul>
        ) : null}
        {status ? (
          <p className="text-xs text-[var(--text-muted)]" role="status">
            {status}
          </p>
        ) : null}
      </div>

      <div className="grid gap-2">
        <PickerMap
          className="h-72"
          context={context}
          initialCenter={initialCenter}
          onChange={(next) => place(next)}
          value={point}
        />
        <p className="text-xs text-[var(--text-muted)]">
          {point
            ? 'Arrastra el pin o haz clic en otro punto para ajustarlo.'
            : 'Haz clic en el mapa para marcar la entrada de la sede.'}
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field htmlFor="location-lat" label="Latitud">
          <Input
            id="location-lat"
            inputMode="decimal"
            autoComplete="off"
            name="latitud"
            spellCheck={false}
            onChange={(event) => {
              setLatText(event.target.value);
              syncFromText(event.target.value, lngText);
            }}
            placeholder="-17.783300"
            value={latText}
          />
        </Field>
        <Field htmlFor="location-lng" label="Longitud">
          <Input
            id="location-lng"
            inputMode="decimal"
            autoComplete="off"
            name="longitud"
            spellCheck={false}
            onChange={(event) => {
              setLngText(event.target.value);
              syncFromText(latText, event.target.value);
            }}
            placeholder="-63.182100"
            value={lngText}
          />
        </Field>
      </div>
      <Field
        hint="Se completa al marcar el punto; puedes corregirla."
        htmlFor="location-address"
        label="Dirección"
      >
        <Input
          id="location-address"
          maxLength={300}
          name="direccion"
          onChange={(event) => {
            addressTouched.current = true;
            setAddress(event.target.value);
          }}
          value={address}
        />
      </Field>
    </div>
  );
}

/** Lee y valida la ubicación publicada por `LocationPicker`. */
export function readLocation(values: FormData): {
  point: LatLng | null;
  address: string | null;
  error: string | null;
} {
  const rawLat = values.get('latitud');
  const rawLng = values.get('longitud');
  const rawAddress = values.get('direccion');
  const address = typeof rawAddress === 'string' && rawAddress.trim() ? rawAddress.trim() : null;
  const lat = typeof rawLat === 'string' ? parseCoordinate(rawLat) : null;
  const lng = typeof rawLng === 'string' ? parseCoordinate(rawLng) : null;
  if (lat === null || lng === null) {
    return { point: null, address, error: 'Marca la ubicación de la sede en el mapa.' };
  }
  if (!isValidLatLng(lat, lng)) {
    return {
      point: null,
      address,
      error: 'Coordenadas fuera de rango: latitud entre -90 y 90, longitud entre -180 y 180.',
    };
  }
  return { point: { lat, lng }, address, error: null };
}
