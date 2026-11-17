import { describe, expect, it } from 'vitest';
import {
  EMPTY_LOCATION_FORM,
  hoursSummary,
  locationFormErrors,
  locationFormOf,
  locationPayload,
  mapsHref,
  normalizeHour,
  type LocationForm,
} from './business-locations';

const form = (patch: Partial<LocationForm>): LocationForm => ({ ...EMPTY_LOCATION_FORM, name: 'Sede Centro', city: 'La Paz', ...patch });

describe('location form', () => {
  it('needs a name and a city, and the pin goes in pairs', () => {
    expect(locationFormErrors(EMPTY_LOCATION_FORM)).toMatchObject({ name: expect.any(String), city: expect.any(String) });
    expect(locationFormErrors(form({ latitude: '-16.5' })).pin).toBeDefined();
    expect(locationFormErrors(form({ latitude: '-16,5', longitude: '-68.15' }))).toEqual({});
    expect(locationFormErrors(form({ latitude: '95', longitude: '0' })).pin).toBeDefined();
  });
  it('builds the payload with the three hour rows spread over the week', () => {
    const payload = locationPayload(
      form({ address: '  ', latitude: '-16,5', longitude: '-68.15', hours: { weekdays: { open: '6', close: '2200' }, sat: { open: '8:00', close: '14' }, sun: { open: '', close: '' } } }),
    );
    expect(payload).toMatchObject({ address: null, latitude: -16.5, longitude: -68.15 });
    expect(payload?.businessHours.mon).toEqual({ open: '06:00', close: '22:00' });
    expect(payload?.businessHours.fri).toEqual({ open: '06:00', close: '22:00' });
    expect(payload?.businessHours.sat).toEqual({ open: '08:00', close: '14:00' });
    expect(payload?.businessHours).not.toHaveProperty('sun');
  });
  it('refuses a half-written hour', () => {
    expect(locationFormErrors(form({ hours: { ...EMPTY_LOCATION_FORM.hours, sat: { open: '25', close: '' } } })).hours).toBeDefined();
    expect(normalizeHour('7.30')).toBe('07:30');
    expect(normalizeHour('24:00')).toBeNull();
  });
  it('reads a saved location back into the form', () => {
    const back = locationFormOf({
      id: 'l1',
      name: 'Norte',
      address: null,
      city: 'El Alto',
      latitude: null,
      longitude: null,
      businessHours: { mon: { open: '07:00', close: '21:00' } },
      displayOrder: 0,
      createdAt: '',
      updatedAt: '',
    });
    expect(back.hours.weekdays).toEqual({ open: '07:00', close: '21:00' });
    expect(back.latitude).toBe('');
  });
});

describe('hoursSummary and maps link', () => {
  it('joins consecutive days with the same hours', () => {
    const week = { open: '06:00', close: '22:00' };
    expect(hoursSummary({ mon: week, tue: week, wed: week, thu: week, fri: week, sat: { open: '08:00', close: '14:00' } })).toBe(
      'Lun–Vie 06:00–22:00 · Sáb 08:00–14:00',
    );
    expect(hoursSummary({})).toBe('');
  });
  it('links a pin only when both coordinates exist', () => {
    expect(mapsHref({ latitude: -16.5, longitude: -68.15 })).toContain('mlat=-16.5');
    expect(mapsHref({ latitude: null, longitude: -68.15 })).toBeNull();
  });
});
