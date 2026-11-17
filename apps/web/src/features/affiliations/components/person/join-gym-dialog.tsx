'use client';

import {
  affiliationCopy,
  ciDigitsOf,
  isSwitchGymConflict,
  joinGymErrors,
  joinGymFormOf,
  joinGymPayload,
  type JoinGymForm,
} from '@gymsheet/domain';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { ApiError } from '@/shared/api/api-error';
import { personAffiliationKeys, queryKeys } from '@/shared/api/query-keys';
import type { AffiliationKind, PublicLocation } from '@/shared/api/schemas';
import { Button } from '@/shared/components/ui/button';
import { Dialog, DialogContent } from '@/shared/components/ui/dialog';
import { Field } from '@/shared/components/ui/field';
import { Input } from '@/shared/components/ui/input';
import { confirm, notify } from '@/shared/notifications';
import { affiliationErrorText, personAffiliationsService } from '../../services/affiliations-client';

export type JoinGymTarget = { entityId: string; handle: string; name: string };

const KINDS: ReadonlyArray<{ value: AffiliationKind; title: string; hint: string }> = [
  { value: 'SOCIO', title: 'Socio', hint: 'Entrenas aquí. Solo de un gimnasio.' },
  { value: 'ENTRENADOR', title: 'Entrenador', hint: 'Das clases o entrenas a gente aquí.' },
];

/**
 * «Hacerme socio» in one step (plan §4.3): kind, sede and the last 3 CI
 * digits, three fields. Already a confirmed SOCIO elsewhere, the backend asks
 * for the switch (409 SOCIO_OF_ANOTHER_GYM): we confirm once and resend.
 */
export function JoinGymDialog({
  gym,
  locations,
  initialKind,
  onClose,
}: Readonly<{ gym: JoinGymTarget; locations: PublicLocation[]; initialKind: AffiliationKind; onClose: () => void }>) {
  const client = useQueryClient();
  const [form, setForm] = useState<JoinGymForm>(() => joinGymFormOf(locations, initialKind));
  const [tried, setTried] = useState(false);
  const errors = joinGymErrors(form, locations);
  const set = (patch: Partial<JoinGymForm>) => setForm((current) => ({ ...current, ...patch }));

  const send = useMutation({
    mutationFn: (switchGym: boolean) => personAffiliationsService.request(joinGymPayload(form, { handle: gym.handle, entityId: gym.entityId }, switchGym)),
    onSuccess: () => {
      for (const key of personAffiliationKeys()) void client.invalidateQueries({ queryKey: key });
      notify.success(affiliationCopy.sentToast);
      onClose();
    },
    onError: async (error) => {
      if (!(error instanceof ApiError) || !isSwitchGymConflict(error)) return;
      const current = await client.fetchQuery({ queryKey: queryKeys.myGym, queryFn: personAffiliationsService.myGym }).catch(() => null);
      const answer = await confirm({
        title: affiliationCopy.switchTitle(current?.gym?.name ?? 'otro gimnasio'),
        message: affiliationCopy.switchBody(gym.name),
        confirmLabel: affiliationCopy.switchConfirm,
        cancelLabel: 'Quedarme',
      });
      if (answer.confirmed) send.mutate(true);
    },
  });
  const failure = send.error && !(send.error instanceof ApiError && isSwitchGymConflict(send.error)) ? affiliationErrorText(send.error, true) : null;
  const socio = form.kind === 'SOCIO';

  return (
    <Dialog onOpenChange={(open) => !open && onClose()} open>
      <DialogContent className="max-w-lg" description={affiliationCopy.joinBody} title={socio ? affiliationCopy.joinTitle : affiliationCopy.joinCoachTitle}>
        <form
          className="grid gap-5"
          noValidate
          onSubmit={(event) => {
            event.preventDefault();
            setTried(true);
            if (Object.keys(errors).length === 0) send.mutate(false);
          }}
        >
          <fieldset className="grid gap-2 sm:grid-cols-2">
            <legend className="data-label mb-2">Cómo entrenas aquí</legend>
            {KINDS.map((option) => (
              <label className="choice-card gap-1 rounded-[var(--radius-lg)] px-4 py-3" key={option.value}>
                <input checked={form.kind === option.value} className="sr-only" name="kind" onChange={() => set({ kind: option.value })} type="radio" value={option.value} />
                <span className="text-[17px] font-semibold">{option.title}</span>
                <span className="t-subhead text-[var(--text-muted)]">{option.hint}</span>
              </label>
            ))}
          </fieldset>

          {locations.length > 0 ? (
            <fieldset aria-describedby={tried && errors.locationId ? 'join-sede-error' : undefined} className="grid gap-2">
              <legend className="data-label mb-2">{socio ? 'Tu sede' : 'Sede (opcional)'}</legend>
              {locations.map((location) => (
                <label className="choice-card gap-0.5 rounded-[var(--radius-lg)] px-4 py-3" key={location.id}>
                  <input checked={form.locationId === location.id} className="sr-only" name="locationId" onChange={() => set({ locationId: location.id })} type="radio" value={location.id} />
                  <span className="font-semibold">{location.name}</span>
                  {location.address || location.city ? <span className="t-footnote text-[var(--text-muted)]">{[location.address, location.city].filter(Boolean).join(', ')}</span> : null}
                </label>
              ))}
            </fieldset>
          ) : null}
          {tried && errors.locationId ? (
            <p className="t-subhead text-[var(--danger-text)]" id="join-sede-error" role="alert">
              {errors.locationId}
            </p>
          ) : null}

          <Field error={tried ? errors.ciLast3 : undefined} hint={affiliationCopy.ciHint} label={affiliationCopy.ciLabel}>
            <Input
              autoComplete="off"
              className="max-w-32 text-center text-xl tracking-[0.4em] tabular-nums"
              inputMode="numeric"
              maxLength={3}
              name="ciLast3"
              onChange={(event) => set({ ciLast3: ciDigitsOf(event.target.value) })}
              pattern="[0-9]{3}"
              placeholder="123"
              spellCheck={false}
              value={form.ciLast3}
            />
          </Field>

          {failure ? (
            <p className="rounded-[var(--radius-lg)] bg-[var(--danger-bg)] p-4 text-[var(--danger-text)]" role="alert">
              {failure}
            </p>
          ) : null}
          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <Button onClick={onClose} type="button" variant="ghost">
              Ahora no
            </Button>
            <Button loading={send.isPending} type="submit" variant="primary">
              {affiliationCopy.send}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
