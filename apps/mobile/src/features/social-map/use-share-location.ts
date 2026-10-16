import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import * as Location from 'expo-location';
import { useCallback, useEffect, useRef, useState } from 'react';
import { ApiError } from '@gymsheet/api-client';
import type { SocialMapCoordinates } from '@gymsheet/schemas';
import { profileService, socialService } from '@/api/services';
import { notify } from '@/notifications';

const SETTINGS_KEY = ['social', 'discovery-settings'] as const;

async function currentPosition(): Promise<SocialMapCoordinates | null> {
  try {
    const position = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
    return { latitude: position.coords.latitude, longitude: position.coords.longitude };
  } catch {
    return null;
  }
}

/**
 * Where the viewer is and whether they appear on the map.
 *
 * The exact position is only sent to the server once the person turned on
 * their social profile and the map; the server turns it into a ~2 km cell and
 * never hands the coordinate back to anyone.
 */
export function useShareLocation() {
  const queryClient = useQueryClient();
  const [coords, setCoords] = useState<SocialMapCoordinates | null>(null);
  const savedRef = useRef(false);
  const settings = useQuery({ queryKey: SETTINGS_KEY, queryFn: socialService.getDiscoverySettings });
  const sharing = Boolean(settings.data?.profileEnabled && settings.data.mapEnabled);
  const profile = useQuery({
    queryKey: ['profile', 'me'],
    queryFn: () => profileService.get(),
    retry: (failureCount, error) => !(error instanceof ApiError && error.kind === 'not-found') && failureCount < 1,
  });
  const notOnboarded = profile.error instanceof ApiError && profile.error.kind === 'not-found';
  /**
   * The server only shows verified adults on the map, and the age lives in the
   * anthropometric profile. Without it, «Aparecer» would succeed and the
   * person would still be invisible, so the map asks for it first.
   */
  const missingAge = notOnboarded || (profile.isSuccess && !profile.data.fechaNacimiento && profile.data.edad === null);

  useEffect(() => {
    let cancelled = false;
    void Location.getForegroundPermissionsAsync().then(async (permission) => {
      if (!permission.granted) return;
      const position = await currentPosition();
      if (!cancelled && position) setCoords(position);
    }).catch(() => undefined);
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    if (!sharing || !coords || savedRef.current) return;
    savedRef.current = true;
    void socialService.saveMapLocation(coords).catch(() => { savedRef.current = false; });
  }, [coords, sharing]);

  const locate = useCallback(async () => {
    const permission = await Location.requestForegroundPermissionsAsync();
    if (!permission.granted) {
      notify.error('Activa la ubicación en Ajustes para ver quién entrena cerca.');
      return null;
    }
    const position = await currentPosition();
    if (position) setCoords(position);
    return position;
  }, []);

  const appear = useMutation({
    mutationFn: async () => {
      if (missingAge) throw new Error('Añade tu fecha de nacimiento en tu perfil para aparecer en el mapa.');
      const current = settings.data ?? (await socialService.getDiscoverySettings());
      const position = coords ?? (await locate());
      if (!position) throw new Error('Necesitamos tu ubicación para mostrarte en el mapa.');
      await socialService.updateDiscoverySettings({
        profileEnabled: true,
        crossGymEnabled: current.crossGymEnabled,
        mapEnabled: true,
        expectedVersion: current.version,
      });
      await socialService.saveMapLocation(position);
      savedRef.current = true;
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: SETTINGS_KEY });
      await queryClient.invalidateQueries({ queryKey: ['social-map'] });
      notify.success('Ya apareces en el mapa, en una zona aproximada.');
    },
    onError: (error: Error) => notify.error(error.message || 'No se pudo activar el mapa. Intenta de nuevo.'),
  });

  return { coords, sharing, settingsLoaded: settings.isSuccess, missingAge, notOnboarded, locate, appear };
}
