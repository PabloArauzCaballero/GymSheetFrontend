import { useQuery } from '@tanstack/react-query';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { View } from 'react-native';
import { facilitiesService, profileService } from '@/api/services';
import { CommunityOverflowSheet } from '@/components/community-overflow-sheet';
import { TopGymModal } from '@/components/top-gym-sheet';
import { useScreenTour } from '@/components/tour';
import { DeckHeader, type DeckCategory } from '@/features/discovery/deck-header';
import { DiscoveryDeck } from '@/features/discovery/discovery-deck';
import { EmailVerificationBanner } from '@/features/email-verification/email-verification-banner';
import { SearchPreferencesSheet } from '@/features/discovery/search-preferences-sheet';
import { VerificationCta } from '@/features/verification/verification-cta';
import { colors } from '@/theme';

export default function ComunidadScreen() {
  const router = useRouter();
  useScreenTour('comunidad');

  // Session filters of the deck. Whom to meet comes from the saved discovery preferences.
  const [objetivos, setObjetivos] = useState<string[]>([]);
  const [sucursalId, setSucursalId] = useState<string | null>(null);
  const [category, setCategory] = useState<DeckCategory>('foryou');
  // Defensive: Fast Refresh can leave a stale non-array value behind.
  const safeObjetivos = useMemo(() => (Array.isArray(objetivos) ? objetivos : []), [objetivos]);
  const filters = useMemo(() => ({ objetivos: safeObjetivos, sucursalId }), [safeObjetivos, sucursalId]);

  const [prefsVisible, setPrefsVisible] = useState(false);
  const [overflowVisible, setOverflowVisible] = useState(false);
  const [topGymVisible, setTopGymVisible] = useState(false);

  const routeParams = useLocalSearchParams<{ openTopGym?: string; openMenu?: string }>();
  useEffect(() => {
    if (routeParams.openTopGym === 'true') setTopGymVisible(true);
    if (routeParams.openMenu === 'true') setOverflowVisible(true);
  }, [routeParams.openTopGym, routeParams.openMenu]);

  const branchesQuery = useQuery({
    queryKey: ['facilities', 'my-branches'],
    queryFn: () => facilitiesService.myBranches(),
    staleTime: 5 * 60_000,
  });
  const myProfile = useQuery({
    queryKey: ['profile'],
    queryFn: () => profileService.get(),
    staleTime: 5 * 60_000,
  });

  const selectCategory = (next: DeckCategory) => {
    setCategory(next);
    setObjetivos(next === 'goal' ? [myProfile.data?.objetivo ?? 'HIPERTROFIA'] : []);
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <DeckHeader
        category={category}
        filtersActive={safeObjetivos.length > 0 || sucursalId !== null}
        onCategory={selectCategory}
        onOpenFilters={() => setPrefsVisible(true)}
        onOpenMenu={() => setOverflowVisible(true)}
      />
      {/* Only while the email is unverified; the deck itself answers 403 with the same way out. */}
      <EmailVerificationBanner inset />
      <VerificationCta inset />

      <DiscoveryDeck filters={filters} onOpenFilters={() => setPrefsVisible(true)} />

      <CommunityOverflowSheet
        onClose={() => setOverflowVisible(false)}
        onOpenPreferences={() => setPrefsVisible(true)}
        onOpenTopGym={() => setTopGymVisible(true)}
        visible={overflowVisible}
      />
      <TopGymModal onClose={() => setTopGymVisible(false)} visible={topGymVisible} />
      <SearchPreferencesSheet
        branches={branchesQuery.data ?? []}
        objetivos={safeObjetivos}
        onClose={() => setPrefsVisible(false)}
        onOpenBlocked={() => {
          setPrefsVisible(false);
          router.push('/personas-bloqueadas');
        }}
        setObjetivos={setObjetivos}
        setSucursalId={setSucursalId}
        sucursalId={sucursalId}
        visible={prefsVisible}
      />
    </View>
  );
}
