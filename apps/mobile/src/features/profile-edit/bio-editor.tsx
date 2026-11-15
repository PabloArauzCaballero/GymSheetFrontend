import { useMutation, useQueryClient } from '@tanstack/react-query';
import { BIO_MAX_LENGTH } from '@gymsheet/domain';
import { type ReactNode, useState } from 'react';
import { View } from 'react-native';
import { accountService } from '@/api/services';
import { Card, Section } from '@/components/layout';
import { Text } from '@/components/text';
import { Button, Input } from '@/components/ui';
import { notify } from '@/notifications';
import { spacing } from '@/theme';

/**
 * Keyed by the saved bio in the parent: a new server value remounts it with a
 * fresh draft instead of syncing state in an effect.
 *
 * «Sobre ti»: 160 caracteres que salen en tu ficha de Conocer. El contador
 * avisa antes del tope; el servidor recorta espacios y saltos de línea, así
 * que lo que se ve al guardar es exactamente lo que verán los demás.
 */
export function BioEditor({ bio, footer }: { bio: string | null; footer?: ReactNode }) {
  const queryClient = useQueryClient();
  const [draft, setDraft] = useState(bio ?? '');
  const dirty = draft.trim() !== (bio ?? '');
  const left = BIO_MAX_LENGTH - draft.length;

  const save = useMutation({
    mutationFn: () => accountService.setBio(draft.trim() === '' ? null : draft),
    onSuccess: async (user) => {
      setDraft(user.bio ?? '');
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['user', 'me'] }),
        queryClient.invalidateQueries({ queryKey: ['progression'] }),
      ]);
      notify.success(user.bio ? 'Bio guardada.' : 'Bio borrada.');
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
          placeholder="Pierna los lunes, café después. Busco compañero para press banca."
          style={{ minHeight: 96, textAlignVertical: 'top' }}
          testID="bio-input"
          value={draft}
        />
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
          <Text style={{ flex: 1 }} tone={left < 20 ? 'warning' : 'muted'} variant="footnote">
            {`${left} caracteres libres`}
          </Text>
          <Button disabled={!dirty} label="Guardar bio" loading={save.isPending} onPress={() => save.mutate()} size="sm" testID="bio-save" />
        </View>
      </Card>
    </Section>
  );
}
