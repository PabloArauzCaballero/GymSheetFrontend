'use client';

import { useInterestCatalog } from '@/features/social/hooks/use-interest-catalog';
import type { SocialProfileDraft } from '@/features/social/lib/social-profile-draft';
import { ErrorPanel } from '@/shared/components/feedback/error-panel';
import { Skeleton } from '@/shared/components/feedback/skeleton';
import { BioField } from './bio-field';
import { HabitsPicker } from './habits-picker';
import { InterestsPicker } from './interests-picker';
import { OrientationPicker, type OrientationConsentControl } from './orientation-picker';

export type SocialProfileSection = 'interests' | 'habits' | 'orientation' | 'bio';

/**
 * One editor per Conocer question. The onboarding step shows one section at a
 * time and the profile page shows all four: same pieces, no second form.
 */
export function SocialProfileEditor({
  section,
  draft,
  onChange,
  orientationConsent,
}: Readonly<{
  section: SocialProfileSection;
  draft: SocialProfileDraft;
  onChange: (next: SocialProfileDraft) => void;
  orientationConsent?: OrientationConsentControl;
}>) {
  if (section === 'interests') {
    return <InterestsEditor onChange={(interests) => onChange({ ...draft, interests })} selected={draft.interests} />;
  }
  if (section === 'habits') {
    return <HabitsPicker onChange={(habits) => onChange({ ...draft, ...habits })} value={draft} />;
  }
  if (section === 'orientation') {
    return (
      <OrientationPicker
        consent={orientationConsent}
        onChange={(value) => onChange({ ...draft, ...value })}
        value={draft}
      />
    );
  }
  return <BioField onChange={(bio) => onChange({ ...draft, bio })} value={draft.bio} />;
}

function InterestsEditor({
  selected,
  onChange,
}: Readonly<{ selected: string[]; onChange: (next: string[]) => void }>) {
  const { query } = useInterestCatalog();
  if (query.isPending) return <Skeleton className="h-40 rounded-[var(--radius-lg)]" />;
  if (query.isError) {
    return <ErrorPanel message="No pudimos cargar los intereses." onRetry={() => void query.refetch()} />;
  }
  return <InterestsPicker catalog={query.data} onChange={onChange} selected={selected} />;
}
