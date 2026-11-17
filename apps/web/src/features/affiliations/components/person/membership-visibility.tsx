'use client';

import { membershipVisibilityHint, membershipVisibilityLabel } from '@gymsheet/domain';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useId } from 'react';
import { queryKeys } from '@/shared/api/query-keys';
import type { MyGym } from '@/shared/api/schemas';
import { notify } from '@/shared/notifications';
import { affiliationErrorText, personAffiliationsService } from '../../services/affiliations-client';

/**
 * «Mostrar que soy socio de X» (ADR-0027 §6): hides the badge, the member
 * list, the ranking and the SAME_GYM reason. The answer is the new «Mi
 * gimnasio», written straight into the cache.
 */
export function MembershipVisibility({ myGym }: Readonly<{ myGym: MyGym }>) {
  const client = useQueryClient();
  const id = useId();
  const save = useMutation({
    mutationFn: (visible: boolean) => personAffiliationsService.setMembershipVisible(visible),
    onSuccess: (updated) => {
      client.setQueryData(queryKeys.myGym, updated);
      void client.invalidateQueries({ queryKey: queryKeys.leaderboard });
    },
    onError: (error) => notify.error(affiliationErrorText(error)),
  });
  if (!myGym.gym) return null;
  const checked = save.isPending && save.variables !== undefined ? save.variables : myGym.membershipVisible;
  return (
    <div className="grid gap-1.5 rounded-[var(--radius-lg)] bg-[var(--surface)] px-4 py-3">
      <label className="flex min-h-11 cursor-pointer items-center justify-between gap-4" htmlFor={id}>
        <span className="t-headline">{membershipVisibilityLabel(myGym.gym.name)}</span>
        <input
          aria-describedby={`${id}-hint`}
          checked={checked}
          className="size-6 shrink-0 cursor-pointer accent-[var(--volt)] disabled:cursor-not-allowed disabled:opacity-40"
          disabled={save.isPending}
          id={id}
          onChange={(event) => save.mutate(event.target.checked)}
          role="switch"
          type="checkbox"
        />
      </label>
      <p className="t-footnote text-[var(--text-muted)]" id={`${id}-hint`}>
        {membershipVisibilityHint}
      </p>
    </div>
  );
}
