import { affiliationCopy, affiliationEndLabels, affiliationKindLabels, affiliationNoteError, affiliationRejectLabels, ciEndingText, formatDate, gymAffiliationName } from '@gymsheet/domain';
import { queryKeys } from '@gymsheet/hooks';
import { affiliationEndReasons, affiliationRejectReasons, type GymAffiliation } from '@gymsheet/schemas';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { View } from 'react-native';
import { Card } from '@/components/layout';
import { PersonAvatar } from '@/components/person-avatar';
import { Text } from '@/components/text';
import { Button, Input } from '@/components/ui';
import { ChoiceChip } from '@/components/wizard/choice-chip';
import { confirm, notify } from '@/notifications';
import { spacing } from '@/theme';
import { affiliationErrorText, gymAffiliationsService } from './affiliations-service';

const isOneOf = <T extends string>(list: readonly T[], value: string): value is T => (list as readonly string[]).includes(value);

/**
 * A row of «Socios» (plan §4.2): photo, name, sede, date and «CI termina en
 * 123»; Confirmar / Rechazar on a request, Terminar on a member or coach.
 */
export function GymAffiliationRow({ row }: { row: GymAffiliation }) {
  const client = useQueryClient();
  const [mode, setMode] = useState<'reject' | 'end' | null>(null);
  const [code, setCode] = useState<string | null>(null);
  const [note, setNote] = useState('');
  const [tried, setTried] = useState(false);
  const name = gymAffiliationName(row);
  const ci = ciEndingText(row.subject);
  const settle = (message: string) => {
    void client.invalidateQueries({ queryKey: queryKeys.business.affiliations });
    notify.success(message);
  };
  const approve = useMutation({
    mutationFn: () => gymAffiliationsService.confirm(row.id),
    onSuccess: () => settle('Confirmado. Le avisamos.'),
    onError: (error) => notify.error(affiliationErrorText(error)),
  });
  const decide = useMutation({
    mutationFn: (reasonCode: string) => {
      const extra = note.trim() ? { note: note.trim() } : {};
      if (mode === 'reject' && isOneOf(affiliationRejectReasons, reasonCode)) return gymAffiliationsService.reject(row.id, { reasonCode, ...extra });
      if (mode === 'end' && isOneOf(affiliationEndReasons, reasonCode)) return gymAffiliationsService.end(row.id, { reasonCode, ...extra });
      return Promise.reject(new Error('Elige un motivo.'));
    },
    onSuccess: () => settle(mode === 'reject' ? 'Solicitud rechazada. La persona ve el motivo.' : 'Afiliación terminada. Le avisamos.'),
  });
  const noteError = affiliationNoteError(code, note);
  async function askConfirm() {
    const answer = await confirm({ title: `¿Confirmas a ${name}?`, message: 'Confirma solo si coincide con tu registro.', confirmLabel: affiliationCopy.confirm, cancelLabel: 'Todavía no' });
    if (answer.confirmed) approve.mutate();
  }
  const photo = row.subject?.type === 'PERSON' ? row.subject.photoUrl : (row.subject?.logoUrl ?? null);
  const date = row.status === 'REQUESTED' ? `Pidió el ${formatDate(row.requestedAt)}` : row.confirmedAt ? `Desde el ${formatDate(row.confirmedAt)}` : null;
  const codes: readonly string[] = mode === 'reject' ? affiliationRejectReasons : affiliationEndReasons;
  const labels: Readonly<Record<string, string>> = mode === 'reject' ? affiliationRejectLabels : affiliationEndLabels;
  return (
    <Card>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md }}>
        <PersonAvatar id={row.id} name={name} photoUrl={photo} size={48} />
        <View style={{ flex: 1, gap: spacing.xxs }}>
          <Text numberOfLines={1} strong variant="body">{name}</Text>
          <Text tone="secondary" variant="footnote">{[affiliationKindLabels[row.kind], row.location?.name, date].filter(Boolean).join(' · ')}</Text>
          {ci ? <Text strong tabular variant="subhead">{ci}</Text> : null}
        </View>
      </View>
      {mode ? (
        <View style={{ gap: spacing.smd }}>
          <Text accessibilityRole="header" variant="headline">{mode === 'reject' ? '¿Por qué la rechazas?' : '¿Por qué terminas?'}</Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm }}>
            {codes.map((value) => <ChoiceChip key={value} label={labels[value] ?? value} onSelect={() => setCode(value)} selected={code === value} />)}
          </View>
          <Input error={tried && noteError ? noteError : undefined} label={code === 'OTHER' ? 'Nota para la persona' : 'Nota para la persona (opcional)'} maxLength={500} multiline onChangeText={setNote} value={note} />
          {decide.error ? <Text accessibilityRole="alert" tone="danger" variant="subhead">{affiliationErrorText(decide.error)}</Text> : null}
          <Button label={mode === 'reject' ? 'Rechazar solicitud' : 'Terminar afiliación'} loading={decide.isPending} onPress={() => { setTried(true); if (code && !noteError) decide.mutate(code); }} variant="danger" />
          <Button label="Volver" onPress={() => setMode(null)} variant="ghost" />
        </View>
      ) : row.status === 'REQUESTED' ? (
        <View style={{ gap: spacing.sm }}>
          <Button label={affiliationCopy.confirm} loading={approve.isPending} onPress={() => void askConfirm()} />
          <Button label={affiliationCopy.reject} onPress={() => setMode('reject')} variant="ghost" />
        </View>
      ) : (
        <Button label={affiliationCopy.end} onPress={() => setMode('end')} size="sm" variant="ghost" />
      )}
    </Card>
  );
}
