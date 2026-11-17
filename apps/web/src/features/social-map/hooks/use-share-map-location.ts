'use client';

import { useCallback } from 'react';
import type { SocialMapCoordinates } from '@/shared/api/schemas';
import { useConsentGate } from '@/features/privacy/hooks/use-consent-gate';
import { socialService } from '@/features/social/services/social-service';

export type ShareMapLocationOutcome = 'SHARED' | 'DECLINED' | 'NO_POSITION';

function browserPosition(): Promise<SocialMapCoordinates | null> {
  if (typeof navigator === 'undefined' || !navigator.geolocation) return Promise.resolve(null);
  return new Promise((resolve) => {
    navigator.geolocation.getCurrentPosition(
      (position) => resolve({ latitude: position.coords.latitude, longitude: position.coords.longitude }),
      () => resolve(null),
      { enableHighAccuracy: false, maximumAge: 5 * 60_000, timeout: 15_000 },
    );
  });
}

/**
 * Shares where the person is, so they appear on the map (the server keeps a
 * ~2 km cell, never hands the coordinate back). The PRECISE_LOCATION consent
 * is asked first, with its purpose; a 400 CONSENT_REQUIRED asks and retries.
 */
export function useShareMapLocation() {
  const gate = useConsentGate();
  return useCallback(async (): Promise<ShareMapLocationOutcome> => {
    if (!(await gate.ensure('PRECISE_LOCATION'))) return 'DECLINED';
    const position = await browserPosition();
    if (!position) return 'NO_POSITION';
    await gate.withConsent(() => socialService.saveMapLocation(position));
    return 'SHARED';
  }, [gate]);
}
