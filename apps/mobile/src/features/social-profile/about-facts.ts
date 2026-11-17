import type { Ionicons } from '@expo/vector-icons';
import { drinkingLabels, orientationLabels, petLabels, smokingLabels } from '@gymsheet/domain';
import type { SocialAbout } from '@gymsheet/schemas';

export type AboutFact = { key: string; label: string; icon: keyof typeof Ionicons.glyphMap };

/**
 * Habits and orientation of another member, as glanceable facts. Orientation
 * only arrives when its owner made it visible, so its presence is the rule.
 */
export function aboutFacts(about: SocialAbout): AboutFact[] {
  const facts: AboutFact[] = [];
  if (about.orientation) facts.push({ key: 'orientation', label: orientationLabels[about.orientation], icon: 'person-outline' });
  if (about.drinking) facts.push({ key: 'drinking', label: drinkingLabels[about.drinking], icon: 'wine-outline' });
  if (about.smoking) facts.push({ key: 'smoking', label: smokingLabels[about.smoking], icon: 'leaf-outline' });
  if (about.pets) facts.push({ key: 'pets', label: petLabels[about.pets], icon: 'paw-outline' });
  return facts;
}

/** True when there is anything to show; an untouched profile renders nothing. */
export function hasAbout(about: SocialAbout | undefined): about is SocialAbout {
  if (!about) return false;
  return Boolean(about.bio?.trim()) || about.interests.length > 0 || aboutFacts(about).length > 0;
}
