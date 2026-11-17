import { ApiError } from '@gymsheet/api-client';
import { affiliationCopy, ciDigitsOf, isSwitchGymConflict, joinGymErrors, joinGymFormOf, joinGymPayload, type JoinGymForm } from '@gymsheet/domain';
import { personAffiliationKeys, queryKeys } from '@gymsheet/hooks';
import type { AffiliationKind, PublicLocation } from '@gymsheet/schemas';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { View } from 'react-native';
import { BottomSheet } from '@/components/bottom-sheet';
import { Text } from '@/components/text';
import { Button, Input } from '@/components/ui';
import { ChoiceCard } from '@/features/business/type-cards';
import { confirm, notify } from '@/notifications';
import { spacing } from '@/theme';
import { affiliationErrorText, personAffiliationsService } from './affiliations-service';

export type JoinGymTarget = { entityId: string; handle: string; name: string };

/**
 * «Hacerme socio» in one sheet (plan §4.3): kind, sede and the last 3 CI
 * digits on a numeric keyboard. Already a confirmed SOCIO elsewhere, the
 * backend asks for the switch: we confirm once and resend with `switchGym`.
 */
export function JoinGymSheet({ gym, locations, kind, onClose }: { gym: JoinGymTarget; locations: PublicLocation[]; kind: AffiliationKind; onClose: () => void }) {
  const client = useQueryClient();
  const [form, setForm] = useState<JoinGymForm>(() => joinGymFormOf(locations, kind));
  const [tried, setTried] = useState(false);
  const errors = tried ? joinGymErrors(form, locations) : {};
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
  function submit() {
    setTried(true);
    if (Object.keys(joinGymErrors(form, locations)).length === 0) send.mutate(false);
  }

  return (
    <BottomSheet
      footer={<Button label={affiliationCopy.send} loading={send.isPending} onPress={submit} testID="join-gym-send" />}
      onClose={onClose}
      subtitle={affiliationCopy.joinBody}
      title={socio ? affiliationCopy.joinTitle : affiliationCopy.joinCoachTitle}
      visible
    >
      <View accessibilityRole="radiogroup" style={{ gap: spacing.sm }}>
        <ChoiceCard description="Entrenas aquí. Solo de un gimnasio." onPress={() => set({ kind: 'SOCIO' })} selected={socio} title="Socio" />
        <ChoiceCard description="Das clases o entrenas a gente aquí." onPress={() => set({ kind: 'ENTRENADOR' })} selected={!socio} title="Entrenador" />
      </View>
      {locations.length > 0 ? (
        <View accessibilityRole="radiogroup" style={{ gap: spacing.sm }}>
          <Text strong variant="subhead">{socio ? 'Tu sede' : 'Sede (opcional)'}</Text>
          {locations.map((location) => (
            <ChoiceCard
              description={[location.address, location.city].filter(Boolean).join(', ') || 'Sede del gimnasio'}
              key={location.id}
              onPress={() => set({ locationId: location.id })}
              selected={form.locationId === location.id}
              title={location.name}
            />
          ))}
        </View>
      ) : null}
      {errors.locationId ? <Text accessibilityRole="alert" tone="danger" variant="footnote">{errors.locationId}</Text> : null}
      <Input
        autoComplete="off"
        error={errors.ciLast3}
        keyboardType="number-pad"
        label={affiliationCopy.ciLabel}
        maxLength={3}
        onChangeText={(text) => set({ ciLast3: ciDigitsOf(text) })}
        placeholder="123"
        testID="join-gym-ci"
        value={form.ciLast3}
      />
      <Text tone="secondary" variant="footnote">{affiliationCopy.ciHint}</Text>
      {failure ? <Text accessibilityRole="alert" tone="danger" variant="subhead">{failure}</Text> : null}
    </BottomSheet>
  );
}
