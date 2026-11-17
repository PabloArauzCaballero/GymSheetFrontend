import type { BusinessLocation, LocationInput } from '@gymsheet/schemas';

/**
 * Locations («sedes») of a business (franja 8c, plan §4.2 «Perfil»): the form
 * the panel shows in two short steps (where, and when it opens), its payload
 * and how the opening hours read. The map pin is two optional number fields:
 * no map dependency.
 */

export const WEEKDAYS = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'] as const;
export type Weekday = (typeof WEEKDAYS)[number];

const WEEKDAY_SHORT: Readonly<Record<Weekday, string>> = {
  mon: 'Lun',
  tue: 'Mar',
  wed: 'Mié',
  thu: 'Jue',
  fri: 'Vie',
  sat: 'Sáb',
  sun: 'Dom',
};

/** Three rows instead of seven: Monday to Friday, Saturday, Sunday. Empty = closed. */
export type HoursRow = 'weekdays' | 'sat' | 'sun';
export const hoursRows: ReadonlyArray<{ id: HoursRow; label: string; days: readonly Weekday[] }> = [
  { id: 'weekdays', label: 'Lunes a viernes', days: ['mon', 'tue', 'wed', 'thu', 'fri'] },
  { id: 'sat', label: 'Sábado', days: ['sat'] },
  { id: 'sun', label: 'Domingo', days: ['sun'] },
];

export type LocationForm = {
  name: string;
  city: string;
  address: string;
  latitude: string;
  longitude: string;
  hours: Record<HoursRow, { open: string; close: string }>;
};

export const EMPTY_LOCATION_FORM: LocationForm = {
  name: '',
  city: '',
  address: '',
  latitude: '',
  longitude: '',
  hours: { weekdays: { open: '', close: '' }, sat: { open: '', close: '' }, sun: { open: '', close: '' } },
};

export const locationCopy = {
  addressPublic: 'La dirección que escribas se publica en tu perfil. Si eres coach y atiendes en tu casa, escribe solo la zona.',
  pinHint: 'Opcional. Copia la latitud y la longitud desde tu app de mapas.',
  nameRequired: 'Escribe un nombre de al menos 2 letras, por ejemplo «Sede Centro».',
  cityRequired: 'Escribe la ciudad.',
  pinInvalid: 'Escribe la latitud (−90 a 90) y la longitud (−180 a 180), o deja las dos vacías.',
  hoursInvalid: 'Escribe la hora como 07:00, o deja la fila vacía si cierras ese día.',
  closed: 'Cerrado',
} as const;

const HHMM = /^([01]\d|2[0-3]):[0-5]\d$/u;

/** «7», «7:5», «0700» or «7.30» → «07:00»/«07:30»; null when it is not an hour. */
export function normalizeHour(text: string): string | null {
  const value = text.trim().replace('.', ':').replace('h', '');
  const compact = /^(\d{1,2})(\d{2})$/u.exec(value);
  const parts = compact ? [compact[1], compact[2]] : value.split(':');
  const hours = Number(parts[0]);
  const minutes = parts[1] === undefined || parts[1] === '' ? 0 : Number(parts[1]);
  if (!/^\d{1,2}$/u.test(parts[0] ?? '') || (parts[1] !== undefined && !/^\d{1,2}$/u.test(parts[1]))) return null;
  const hour = `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
  return HHMM.test(hour) ? hour : null;
}

function parseCoordinate(text: string, limit: number): number | null {
  const value = Number(text.trim().replace(',', '.'));
  return text.trim() !== '' && Number.isFinite(value) && Math.abs(value) <= limit ? value : null;
}

export type LocationFormErrors = Partial<Record<'name' | 'city' | 'pin' | 'hours', string>>;

export function locationFormErrors(form: LocationForm): LocationFormErrors {
  const errors: LocationFormErrors = {};
  if (form.name.trim().length < 2) errors.name = locationCopy.nameRequired;
  if (form.city.trim().length < 2) errors.city = locationCopy.cityRequired;
  const anyPin = form.latitude.trim() !== '' || form.longitude.trim() !== '';
  if (anyPin && (parseCoordinate(form.latitude, 90) === null || parseCoordinate(form.longitude, 180) === null)) {
    errors.pin = locationCopy.pinInvalid;
  }
  const badHours = hoursRows.some(({ id }) => {
    const row = form.hours[id];
    const empty = !row.open.trim() && !row.close.trim();
    return !empty && (normalizeHour(row.open) === null || normalizeHour(row.close) === null);
  });
  if (badHours) errors.hours = locationCopy.hoursInvalid;
  return errors;
}

export function locationPayload(form: LocationForm): LocationInput | null {
  if (Object.keys(locationFormErrors(form)).length > 0) return null;
  const businessHours: LocationInput['businessHours'] = {};
  for (const { id, days } of hoursRows) {
    const open = normalizeHour(form.hours[id].open);
    const close = normalizeHour(form.hours[id].close);
    if (open && close) for (const day of days) businessHours[day] = { open, close };
  }
  const pin = form.latitude.trim() !== '';
  return {
    name: form.name.trim(),
    city: form.city.trim(),
    address: form.address.trim() || null,
    latitude: pin ? parseCoordinate(form.latitude, 90) : null,
    longitude: pin ? parseCoordinate(form.longitude, 180) : null,
    businessHours,
  };
}

export function locationFormOf(location: BusinessLocation): LocationForm {
  const row = (day: Weekday) => location.businessHours[day] ?? { open: '', close: '' };
  return {
    name: location.name,
    city: location.city ?? '',
    address: location.address ?? '',
    latitude: location.latitude === null ? '' : String(location.latitude),
    longitude: location.longitude === null ? '' : String(location.longitude),
    hours: { weekdays: { ...row('mon') }, sat: { ...row('sat') }, sun: { ...row('sun') } },
  };
}

/** «Lun–Vie 06:00–22:00 · Sáb 08:00–14:00»; days with the same hours are joined. Empty when no hours. */
export function hoursSummary(hours: Record<string, { open: string; close: string } | undefined>): string {
  const groups: Array<{ from: Weekday; to: Weekday; text: string }> = [];
  for (const day of WEEKDAYS) {
    const slot = hours[day];
    const text = slot ? `${slot.open}–${slot.close}` : '';
    const last = groups[groups.length - 1];
    if (last && last.text === text && WEEKDAYS.indexOf(last.to) === WEEKDAYS.indexOf(day) - 1) last.to = day;
    else groups.push({ from: day, to: day, text });
  }
  return groups
    .filter((group) => group.text)
    .map((group) => `${WEEKDAY_SHORT[group.from]}${group.from === group.to ? '' : `–${WEEKDAY_SHORT[group.to]}`} ${group.text}`)
    .join(' · ');
}

/** A safe link to open the pin in a maps app (coordinates only, no third-party embed). */
export function mapsHref(location: { latitude: number | null; longitude: number | null }): string | null {
  if (location.latitude === null || location.longitude === null) return null;
  return `https://www.openstreetmap.org/?mlat=${location.latitude}&mlon=${location.longitude}#map=17/${location.latitude}/${location.longitude}`;
}
