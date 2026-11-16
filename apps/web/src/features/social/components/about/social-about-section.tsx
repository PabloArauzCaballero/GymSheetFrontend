'use client';

import { drinkingLabels, orientationLabels, petLabels, smokingLabels } from '@gymsheet/domain';
import { Cigarette, PawPrint, Sparkles, Wine, type LucideIcon } from 'lucide-react';
import type { SocialAbout } from '@/shared/api/schemas';
import { ABOUT_CHIP as CHIP, InterestChips } from './social-about-chips';

type Fact = { key: string; label: string; icon?: LucideIcon };

/** Habits and orientation as plain facts. Orientation only exists here if its owner made it visible. */
export function aboutFactsOf(about: SocialAbout): Fact[] {
  const facts: Fact[] = [];
  if (about.drinking) facts.push({ key: 'drinking', label: drinkingLabels[about.drinking], icon: Wine });
  if (about.smoking) facts.push({ key: 'smoking', label: smokingLabels[about.smoking], icon: Cigarette });
  if (about.pets) facts.push({ key: 'pets', label: petLabels[about.pets], icon: PawPrint });
  if (about.orientation) facts.push({ key: 'orientation', label: orientationLabels[about.orientation], icon: Sparkles });
  return facts;
}

/** Whether a member answered anything worth showing. */
export function hasAboutContent(about: SocialAbout | undefined): about is SocialAbout {
  return Boolean(about && (about.bio || about.interests.length > 0 || aboutFactsOf(about).length > 0));
}

/**
 * "Sobre mí" in a member's sheet and profile: bio, interests and habits.
 * Interests are labelled from the catalog; a code it does not know is hidden
 * rather than shown raw. Nothing answered, nothing rendered.
 */
export function SocialAboutSection({ about }: Readonly<{ about: SocialAbout | undefined }>) {
  if (!hasAboutContent(about)) return null;
  const facts = aboutFactsOf(about);
  return (
    <section className="grid gap-3">
      <h3 className="data-label text-[var(--text-muted)]">Sobre mí</h3>
      <div className="grid gap-4 rounded-[var(--radius-lg)] border border-[var(--border-subtle)] bg-[var(--surface-low)] p-4">
        {about.bio ? <p className="whitespace-pre-line text-[15px] leading-6">{about.bio}</p> : null}
        {about.interests.length > 0 ? <InterestChips codes={about.interests} /> : null}
        {facts.length > 0 ? (
          <ul aria-label="Hábitos" className="flex flex-wrap gap-2">
            {facts.map(({ key, label, icon: Icon }) => (
              <li className={CHIP} key={key}>
                {Icon ? <Icon aria-hidden className="size-3.5 text-[var(--text-muted)]" /> : null}
                {label}
              </li>
            ))}
          </ul>
        ) : null}
      </div>
    </section>
  );
}
