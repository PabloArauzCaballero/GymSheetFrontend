import { useMutation, useQueryClient } from '@tanstack/react-query';
import { BIO_MAX_LENGTH, BIO_PLACEHOLDER } from '@gymsheet/domain';
import { type ReactNode, useState } from 'react';
import { View } from 'react-native';
import { accountService } from '@/api/services';
import { Card, Section } from '@/components/layout';
import { Text } from '@/components/text';
import { SaveStatusLine, useSectionSave } from '@/components/save-status';
import { Button, Input } from '@/components/ui';
import { notify } from '@/notifications';
import { spacing } from '@/theme';
import { useDraftReport } from './unsaved-guard';

/**
 * Keyed by the saved bio in the parent: a new server value remounts it with a
 * fresh draft instead of syncing state in an effect.
 *
 * «Sobre ti»: 160 caracteres que salen en tu ficha de Conocer. El contador
 * avisa antes del tope; el servidor recorta espacios y saltos de línea, así
 * que lo que se ve al guardar es exactamente lo que verán los demás.
 */
const BIO_SAVE_KEY = ['profile', 'bio'] as const;

export function BioEditor({ bio, footer }: { bio: string | null; footer?: ReactNode }) {
  const queryClient = useQueryClient();
  const [draft, setDraft] = useState(bio ?? '');
  const dirty = draft.trim() !== (bio ?? '');
  const left = BIO_MAX_LENGTH - draft.length;
  const status = useSectionSave(BIO_SAVE_KEY, dirty);
  useDraftReport('bio', dirty);

  const save = useMutation({
    mutationKey: BIO_SAVE_KEY,
    mutationFn: () => accountService.setBio(draft.trim() === '' ? null : draft),
    onSuccess: async (user) => {
      setDraft(user.bio ?? '');
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['user', 'me'] }),
        queryClient.invalidateQueries({ queryKey: ['progression'] }),
      ]);
    },
    onError: (error: unknown) => notify.error(error),
  });

  return (
    <Section title="Sobre ti">
      <Card>
        {footer}
        <Input
          accessibilityHint={`Hasta ${BIO_MAX_LENGTH} caracteres`}
          label="Tu bio"
          maxLength={BIO_MAX_LENGTH}
          multiline
          onChangeText={setDraft}
          placeholder={BIO_PLACEHOLDER}
          style={{ minHeight: 96, paddingVertical: spacing.smd, textAlignVertical: 'top' }}
          testID="bio-input"
          value={draft}
        />
        <Text style={{ alignSelf: 'flex-end' }} tone={left < 20 ? 'warning' : 'muted'} variant="footnote">
          {`${left} caracteres libres`}
        </Text>
        {/* One save per section: its status on the left, its button on the right (same row in every section). */}
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
          <SaveStatusLine saved={bio ? 'Bio guardada.' : 'Bio borrada.'} status={status} testID="bio-status" />
          <Button disabled={!dirty} label="Guardar bio" loading={save.isPending} onPress={() => save.mutate()} size="sm" testID="bio-save" />
        </View>
      </Card>
    </Section>
  );
}
