import { STREAK_LOCATION_TIMEOUT_MS, toStreakLocation, type StreakLocation } from '@gymsheet/domain';

/** Pide una posición al navegador sin impedir que la sesión termine. */
export function captureStreakLocation(): Promise<StreakLocation | null> {
  if (typeof navigator === 'undefined' || !navigator.geolocation) return Promise.resolve(null);
  return new Promise((resolve) => {
    let settled = false;
    const finish = (location: StreakLocation | null) => {
      if (settled) return;
      settled = true;
      window.clearTimeout(timer);
      resolve(location);
    };
    const timer = window.setTimeout(() => finish(null), STREAK_LOCATION_TIMEOUT_MS);
    try {
      navigator.geolocation.getCurrentPosition(
        (position) => finish(toStreakLocation(position.coords)),
        () => finish(null),
        { enableHighAccuracy: false, maximumAge: 0, timeout: STREAK_LOCATION_TIMEOUT_MS },
      );
    } catch {
      finish(null);
    }
  });
}
