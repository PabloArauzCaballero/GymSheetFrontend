'use client';

import { knownReadinessGaps, readinessLabels } from '@gymsheet/domain';
import { useQuery } from '@tanstack/react-query';
import { Camera, CircleUserRound, MailCheck, SlidersHorizontal, type LucideIcon } from 'lucide-react';
import type { DiscoveryReadinessCode } from '@/shared/api/schemas';
import { ButtonLink } from '@/shared/components/ui/button';
import { Card, CardContent, CardHeader } from '@/shared/components/ui/card';
import { socialProfileKeys, socialProfileService } from '../services/social-profile-service';

/** Where each gap is fixed: the same editors the rest of the app uses. */
const GAP_TARGETS: Record<DiscoveryReadinessCode, { href: string; icon: LucideIcon }> = {
  EMAIL_VERIFICATION: { href: '/verificar-correo', icon: MailCheck },
  PROFILE_ENABLED: { href: '/profile#perfil-social', icon: CircleUserRound },
  PREFERENCES: { href: '/onboarding/conocer', icon: SlidersHorizontal },
  PHOTOS: { href: '/profile#fotos', icon: Camera },
};

/**
 * "Para aparecer en Conocer": what still keeps you out of other people's deck.
 *
 * It is a nudge, not a gate: while it loads, if it fails or once you are ready
 * it renders nothing, so the deck below is never held back by it. Codes this
 * client does not know are skipped; the first known one is the next step.
 */
export function DiscoveryReadinessCard({
  omit = [],
}: Readonly<{
  /** Gaps another component on the same page already resolves (e.g. the deck's own preferences form). */
  omit?: readonly DiscoveryReadinessCode[];
}>) {
  const readiness = useQuery({
    queryKey: socialProfileKeys.readiness,
    queryFn: socialProfileService.readiness,
    retry: false,
  });
  const gaps =
    readiness.data && !readiness.data.ready
      ? knownReadinessGaps(readiness.data.missing).filter((code) => !omit.includes(code))
      : [];
  if (gaps.length === 0) return null;

  return (
    <Card aria-label="Para aparecer en Conocer" role="region">
      <CardHeader
        description="Te faltan unos pasos para que otras personas te vean."
        title="Para aparecer en Conocer"
      />
      <CardContent className="grid gap-2 pt-3">
        <ol className="grid gap-2">
          {gaps.map((code, position) => {
            const { href, icon: Icon } = GAP_TARGETS[code];
            const label = readinessLabels[code];
            return (
              <li
                className="flex flex-wrap items-center gap-3 rounded-[var(--radius-lg)] bg-[var(--surface)] px-4 py-3"
                key={code}
              >
                <Icon aria-hidden className="size-5 shrink-0 text-[var(--text-muted)]" />
                <span className="t-headline min-w-0 flex-1">{label.title}</span>
                <ButtonLink href={href} size="sm" variant={position === 0 ? 'primary' : 'secondary'}>
                  {label.action}
                </ButtonLink>
              </li>
            );
          })}
        </ol>
      </CardContent>
    </Card>
  );
}
