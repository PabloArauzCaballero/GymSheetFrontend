import { afterEach, describe, expect, it, vi } from 'vitest';
import { captureStreakLocation } from './streak-location';

afterEach(() => vi.unstubAllGlobals());

describe('captureStreakLocation', () => {
  it('devuelve coordenadas válidas para verificar la racha', async () => {
    vi.stubGlobal('navigator', { geolocation: {
      getCurrentPosition: (success: PositionCallback) => success({ coords: { latitude: -16.5, longitude: -68.1 } } as GeolocationPosition),
    } });
    await expect(captureStreakLocation()).resolves.toEqual({ latitude: -16.5, longitude: -68.1 });
  });

  it('continúa sin ubicación cuando el usuario la deniega', async () => {
    vi.stubGlobal('navigator', { geolocation: {
      getCurrentPosition: (_success: PositionCallback, error: PositionErrorCallback) => error({ code: 1 } as GeolocationPositionError),
    } });
    await expect(captureStreakLocation()).resolves.toBeNull();
  });
});
