import { describe, expect, it } from 'vitest';
import { formatLatLng, isValidLatLng, parseCoordinate, pointOf, roundCoordinate } from './geo';

describe('geo', () => {
  it('validates WGS84 ranges', () => {
    expect(isValidLatLng(-17.78, -63.18)).toBe(true);
    expect(isValidLatLng(90, 180)).toBe(true);
    expect(isValidLatLng(90.1, 0)).toBe(false);
    expect(isValidLatLng(0, -180.5)).toBe(false);
    expect(isValidLatLng(Number.NaN, 0)).toBe(false);
  });

  it('parses hand-typed coordinates with dot or comma', () => {
    expect(parseCoordinate(' -17.7833 ')).toBe(-17.7833);
    expect(parseCoordinate('-63,1821')).toBe(-63.1821);
    expect(parseCoordinate('abc')).toBeNull();
    expect(parseCoordinate('')).toBeNull();
    expect(parseCoordinate('1e5')).toBeNull();
  });

  it('rounds to six decimals and formats', () => {
    expect(roundCoordinate(-17.78331234)).toBe(-17.783312);
    expect(formatLatLng({ lat: -17.5, lng: -63 })).toBe('-17.500000, -63.000000');
  });

  it('only returns a point for complete, valid coordinates', () => {
    expect(pointOf({ latitud: -17.7, longitud: -63.1 })).toEqual({ lat: -17.7, lng: -63.1 });
    expect(pointOf({ latitud: null, longitud: -63.1 })).toBeNull();
    expect(pointOf({ latitud: 120, longitud: -63.1 })).toBeNull();
  });
});
