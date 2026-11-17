'use client';

import { gymMembershipLine, myGymPlanText, renewListingId, subscriptionCopy } from '@gymsheet/domain';
import type { MyGym } from '@/shared/api/schemas';
import { Badge } from '@/shared/components/ui/badge';
import { ButtonLink } from '@/shared/components/ui/button';
import { useMySubscriptions } from './use-my-subscriptions';

/**
 * The plan of the confirmed gym on «Mi gimnasio» (plan §2.10): «Socio activo
 * hasta …» or «Socio · plan vencido», with «Renovar» once it ended.
 */
export function MyGymPlan({ myGym }: Readonly<{ myGym: MyGym }>) {
  const subscriptions = useMySubscriptions(myGym.status === 'CONFIRMED');
  const plan = myGymPlanText(myGym, subscriptions.data);
  if (!plan || myGym.status !== 'CONFIRMED') return null;
  const line = gymMembershipLine(subscriptions.data, myGym.gym?.id);
  const renewId = line && (line.status === 'EXPIRED' || line.status === 'EXPIRING') ? renewListingId(line) : null;
  return (
    <div className="flex flex-wrap items-center gap-3" data-testid="my-gym-plan">
      <Badge tone={plan.tone}>{plan.label}</Badge>
      {renewId ? (
        <ButtonLink href={`/publicacion/${renewId}`} size="sm" variant="ghost">
          {subscriptionCopy.renew}
        </ButtonLink>
      ) : null}
    </div>
  );
}
