'use client';

import { affiliationCopy, affiliationEndLabels, affiliationNoteError, affiliationRejectLabels, gymAffiliationName } from '@gymsheet/domain';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { queryKeys } from '@/shared/api/query-keys';
import { affiliationEndReasons, affiliationRejectReasons, type GymAffiliation } from '@/shared/api/schemas';
import { Button } from '@/shared/components/ui/button';
import { ChoiceChip } from '@/shared/components/ui/choice-chip';
import { Field } from '@/shared/components/ui/field';
import { Textarea } from '@/shared/components/ui/textarea';
import { confirm, notify } from '@/shared/notifications';
import { affiliationErrorText, gymAffiliationsService } from '../../services/affiliations-client';

type Mode = 'reject' | 'end';

const isOneOf = <T extends string>(list: readonly T[], value: string): value is T => (list as readonly string[]).includes(value);

/** Every write changes the inbox, the lists and the badge: one prefix refreshes them all. */
function useSettle() {
  const client = useQueryClient();
  return (message: string) => {
    void client.invalidateQueries({ queryKey: queryKeys.business.affiliations });
    notify.success(message);
  };
}

/** Reject (request) or end (member, coach) with a reason chip; «Otro motivo» needs a note. */
function ReasonForm({ row, mode, onBack }: Readonly<{ row: GymAffiliation; mode: Mode; onBack: () => void }>) {
  const settle = useSettle();
  const [code, setCode] = useState<string | null>(null);
  const [note, setNote] = useState('');
  const [tried, setTried] = useState(false);
  const noteError = affiliationNoteError(code, note);
  const codes: readonly string[] = mode === 'reject' ? affiliationRejectReasons : affiliationEndReasons;
  const labels: Readonly<Record<string, string>> = mode === 'reject' ? affiliationRejectLabels : affiliationEndLabels;
  const decide = useMutation({
    mutationFn: (reasonCode: string) => {
      const extra = note.trim() ? { note: note.trim() } : {};
      if (mode === 'reject' && isOneOf(affiliationRejectReasons, reasonCode)) return gymAffiliationsService.reject(row.id, { reasonCode, ...extra });
      if (mode === 'end' && isOneOf(affiliationEndReasons, reasonCode)) return gymAffiliationsService.end(row.id, { reasonCode, ...extra });
      return Promise.reject(new Error('Elige un motivo.'));
    },
    onSuccess: () => settle(mode === 'reject' ? 'Solicitud rechazada. La persona ve el motivo.' : 'Afiliación terminada. Le avisamos.'),
  });
  const titleId = `reason-${row.id}`;
  return (
    <form
      aria-labelledby={titleId}
      className="grid gap-4"
      onSubmit={(event) => {
        event.preventDefault();
        setTried(true);
        if (code && !noteError) decide.mutate(code);
      }}
    >
      <h3 className="t-headline" id={titleId}>
        {mode === 'reject' ? '¿Por qué la rechazas?' : `¿Por qué terminas con ${gymAffiliationName(row)}?`}
      </h3>
      <div aria-label="Motivo" className="flex flex-wrap gap-2" role="group">
        {codes.map((value) => (
          <ChoiceChip key={value} onClick={() => setCode(value)} selected={code === value}>
            {labels[value]}
          </ChoiceChip>
        ))}
      </div>
      <Field error={tried && noteError ? noteError : undefined} hint={code === 'OTHER' ? 'Obligatoria con «Otro motivo».' : 'Opcional. La persona la lee.'} label="Nota para la persona">
        <Textarea maxLength={500} name="note" onChange={(event) => setNote(event.target.value)} rows={2} value={note} />
      </Field>
      {decide.error ? (
        <p className="t-subhead text-[var(--danger-text)]" role="alert">
          {affiliationErrorText(decide.error)}
        </p>
      ) : null}
      <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        <Button onClick={onBack} type="button" variant="ghost">
          Volver
        </Button>
        <Button loading={decide.isPending} type="submit" variant="danger">
          {mode === 'reject' ? 'Rechazar solicitud' : 'Terminar afiliación'}
        </Button>
      </div>
    </form>
  );
}

/**
 * Confirmar / Rechazar on a request, Terminar on a member or a coach (plan
 * §4.2). Confirming asks once: the gym says it compared the CI digits.
 */
export function AffiliationDecision({ row }: Readonly<{ row: GymAffiliation }>) {
  const settle = useSettle();
  const [mode, setMode] = useState<Mode | null>(null);
  const confirmRow = useMutation({
    mutationFn: () => gymAffiliationsService.confirm(row.id),
    onSuccess: () => settle(row.kind === 'SOCIO' ? 'Socio confirmado. Le avisamos.' : 'Entrenador confirmado. Le avisamos.'),
    onError: (error) => notify.error(affiliationErrorText(error)),
  });
  async function askConfirm() {
    const answer = await confirm({
      title: `¿Confirmas a ${gymAffiliationName(row)}?`,
      message: row.kind === 'SOCIO' ? 'Confirma solo si coincide con tu registro de socios.' : 'Confirma solo si entrena en tu gimnasio.',
      confirmLabel: affiliationCopy.confirm,
      cancelLabel: 'Todavía no',
    });
    if (answer.confirmed) confirmRow.mutate();
  }

  if (mode) return <ReasonForm mode={mode} onBack={() => setMode(null)} row={row} />;
  if (row.status === 'REQUESTED') {
    return (
      <div className="grid gap-2 sm:grid-cols-2">
        <Button loading={confirmRow.isPending} onClick={() => void askConfirm()} variant="primary">
          {affiliationCopy.confirm}
        </Button>
        <Button onClick={() => setMode('reject')} variant="ghost">
          {affiliationCopy.reject}
        </Button>
      </div>
    );
  }
  return (
    <Button className="justify-self-start" onClick={() => setMode('end')} size="sm" variant="ghost">
      {affiliationCopy.end}
    </Button>
  );
}
