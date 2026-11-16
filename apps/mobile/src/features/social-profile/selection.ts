import type {
  DiscoveryIntent,
  DrinkingHabit,
  Orientation,
  PetOption,
  SmokingHabit,
  SocialProfile,
  UpdateSocialProfileInput,
} from '@gymsheet/schemas';

/** Pure rules of the "Conocer" questions, shared by the flow and its tests. */

/** `UNSURE` («Aún no lo sé») only lives alone: picking it clears the rest and vice versa. */
export function toggleIntent(current: readonly DiscoveryIntent[], intent: DiscoveryIntent): DiscoveryIntent[] {
  if (current.includes(intent)) return current.filter((value) => value !== intent);
  if (intent === 'UNSURE') return ['UNSURE'];
  return [...current.filter((value) => value !== 'UNSURE'), intent];
}

export type GenderChoice = 'MALE' | 'FEMALE' | 'ALL';
type Gender = 'MALE' | 'FEMALE';

/** «Todos» is both genders; any single chip narrows to that one. */
export function selectGenders(current: readonly Gender[], choice: GenderChoice): Gender[] {
  if (choice === 'ALL') return current.length === 2 ? [] : ['MALE', 'FEMALE'];
  if (current.length === 2) return [choice];
  return current.includes(choice) ? current.filter((value) => value !== choice) : [...current, choice];
}

export function isGenderChoiceSelected(current: readonly Gender[], choice: GenderChoice): boolean {
  if (choice === 'ALL') return current.length === 2;
  return current.length === 1 && current[0] === choice;
}

/** Adds or removes an interest. At the limit a new one is refused (`limited: true`), never swapped silently. */
export function toggleInterest(
  current: readonly string[],
  code: string,
  max: number,
): { next: string[]; limited: boolean } {
  if (current.includes(code)) return { next: current.filter((value) => value !== code), limited: false };
  if (current.length >= max) return { next: [...current], limited: true };
  return { next: [...current, code], limited: false };
}

/** Single choice that a second tap clears: every habit question is optional. */
export function toggleSingle<T extends string>(current: T | null, value: T): T | null {
  return current === value ? null : value;
}

export type SocialDraft = {
  interests: string[];
  drinking: DrinkingHabit | null;
  smoking: SmokingHabit | null;
  pets: PetOption | null;
  orientation: Orientation | null;
  orientationVisible: boolean;
  bio: string;
};

export const emptyDraft: SocialDraft = {
  interests: [],
  drinking: null,
  smoking: null,
  pets: null,
  orientation: null,
  // Hidden by default: showing it is an explicit choice.
  orientationVisible: false,
  bio: '',
};

export function draftFromProfile(profile: SocialProfile | undefined): SocialDraft {
  if (!profile) return emptyDraft;
  return {
    interests: profile.interests,
    drinking: profile.drinking,
    smoking: profile.smoking,
    pets: profile.pets,
    orientation: profile.orientation,
    orientationVisible: profile.orientationVisible,
    bio: profile.bio ?? '',
  };
}

/** The PUT replaces everything, so every field is sent; an empty bio is cleared. */
export function toUpdateInput(draft: SocialDraft, expectedVersion: number): UpdateSocialProfileInput {
  const bio = draft.bio.trim();
  return {
    interests: draft.interests,
    drinking: draft.drinking,
    smoking: draft.smoking,
    pets: draft.pets,
    orientation: draft.orientation,
    // Visibility without an orientation means nothing: keep it off.
    orientationVisible: draft.orientation ? draft.orientationVisible : false,
    bio: bio.length > 0 ? bio : null,
    expectedVersion,
  };
}

export function sameDraft(a: SocialDraft, b: SocialDraft): boolean {
  return JSON.stringify(toUpdateInput(a, 0)) === JSON.stringify(toUpdateInput(b, 0));
}

/** Photos needed to appear in the deck. */
export const MIN_DISCOVERY_PHOTOS = 2;

export function missingPhotos(count: number): number {
  return Math.max(0, MIN_DISCOVERY_PHOTOS - count);
}
