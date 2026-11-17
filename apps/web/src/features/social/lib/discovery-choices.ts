import type { DiscoveryIntent } from '@/shared/api/schemas';

/**
 * Toggles one intent. `UNSURE` ("Aún no lo sé") only travels alone, the same
 * rule the backend validates: picking it clears the rest, and picking any other
 * intent clears it.
 */
export function toggleIntent(current: readonly DiscoveryIntent[], intent: DiscoveryIntent): DiscoveryIntent[] {
  if (current.includes(intent)) return current.filter((value) => value !== intent);
  if (intent === 'UNSURE') return ['UNSURE'];
  return [...current.filter((value) => value !== 'UNSURE'), intent];
}

export type GenderChoice = 'MALE' | 'FEMALE' | 'ALL';
export type DiscoveryGender = 'MALE' | 'FEMALE';

/** "Todos" is not a third gender: it is both saved values at once. */
export function gendersFor(choice: GenderChoice): DiscoveryGender[] {
  return choice === 'ALL' ? ['MALE', 'FEMALE'] : [choice];
}

export function genderChoiceOf(genders: readonly DiscoveryGender[]): GenderChoice | null {
  if (genders.includes('MALE') && genders.includes('FEMALE')) return 'ALL';
  return genders[0] ?? null;
}

/** Toggles a single-choice answer: tapping the selected option clears it. */
export function toggleSingle<T extends string>(current: T | null, value: T): T | null {
  return current === value ? null : value;
}

/** Toggles an interest without ever going past `max`. */
export function toggleInterest(current: readonly string[], code: string, max: number): string[] {
  if (current.includes(code)) return current.filter((value) => value !== code);
  return current.length >= max ? [...current] : [...current, code];
}
