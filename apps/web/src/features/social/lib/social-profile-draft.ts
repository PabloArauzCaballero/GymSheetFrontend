import type {
  DrinkingHabit,
  Orientation,
  PetOption,
  SmokingHabit,
  SocialProfile,
  UpdateSocialProfileInput,
} from '@/shared/api/schemas';

/** What the Conocer editors hold while the person answers. */
export type SocialProfileDraft = {
  interests: string[];
  drinking: DrinkingHabit | null;
  smoking: SmokingHabit | null;
  pets: PetOption | null;
  orientation: Orientation | null;
  orientationVisible: boolean;
  bio: string;
};

export function draftOf(profile: SocialProfile): SocialProfileDraft {
  return {
    interests: profile.interests,
    drinking: profile.drinking,
    smoking: profile.smoking,
    pets: profile.pets,
    orientation: profile.orientation,
    // Hidden by default: visibility is only ever an explicit choice.
    orientationVisible: profile.orientation ? profile.orientationVisible : false,
    bio: profile.bio ?? '',
  };
}

/**
 * The PUT replaces the whole profile, so every answer travels on every save —
 * sending only the current substep would clear the others.
 */
export function toUpdateInput(draft: SocialProfileDraft, expectedVersion: number): UpdateSocialProfileInput {
  const bio = draft.bio.trim();
  return {
    interests: draft.interests,
    drinking: draft.drinking,
    smoking: draft.smoking,
    pets: draft.pets,
    orientation: draft.orientation,
    orientationVisible: draft.orientation ? draft.orientationVisible : false,
    bio: bio.length > 0 ? bio : null,
    expectedVersion,
  };
}
