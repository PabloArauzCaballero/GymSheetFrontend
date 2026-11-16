'use client';

import { BIO_MAX_LENGTH } from '@gymsheet/domain';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useState, type ReactNode } from 'react';
import { useDraftReport } from '@/features/profile/lib/unsaved-guard';
import { profileService } from '@/features/profile/services/profile-service';
import { SaveStatusLine, useSectionSave } from '@/shared/components/feedback/save-status';
import { Button } from '@/shared/components/ui/button';
import { Field } from '@/shared/components/ui/field';
import { Textarea } from '@/shared/components/ui/textarea';
import { notify } from '@/shared/notifications';

/**
 * The parent keys this component by the saved bio, so a new server value
 * remounts it with a fresh draft instead of syncing state in an effect.
 *
 * «Sobre ti»: 160 caracteres que salen en tu ficha de Conocer (`bio-editor` del móvil). */
const BIO_SAVE_KEY = ['profile', 'bio'] as const;

export function BioEditor({ bio, footer }: Readonly<{ bio: string | null; footer?: ReactNode }>) {
  const queryClient = useQueryClient();
  const [draft, setDraft] = useState(bio ?? '');
  const dirty = draft.trim() !== (bio ?? '');
  const left = BIO_MAX_LENGTH - draft.length;
  const status = useSectionSave(BIO_SAVE_KEY, dirty);
  useDraftReport('bio', dirty);

  const save = useMutation({
    mutationKey: BIO_SAVE_KEY,
    mutationFn: () => profileService.updateBio(draft.trim() === '' ? null : draft),
    onSuccess: async (user) => {
      setDraft(user.bio ?? '');
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['user', 'me'] }),
        queryClient.invalidateQueries({ queryKey: ['progression'] }),
      ]);
    },
    onError: (error: Error) => notify.error(error.message),
  });

  return (
    <form
      className="panel grid gap-4 p-5"
      onSubmit={(event) => {
        event.preventDefault();
        save.mutate();
      }}
    >
      {footer}
      <Field hint={`${left} caracteres libres`} htmlFor="bio" label="Tu bio">
        <Textarea
          id="bio"
          maxLength={BIO_MAX_LENGTH}
          onChange={(event) => setDraft(event.target.value)}
          placeholder="Pierna los lunes, café después. Busco compañero para press banca."
          rows={3}
          value={draft}
        />
      </Field>
      {/* One save per section: its status on the left, its button on the right (same row in every section). */}
      <div className="flex flex-wrap items-center gap-3">
        <SaveStatusLine saved={bio ? 'Bio guardada.' : 'Bio borrada.'} status={status} testId="bio-status" />
        <Button disabled={!dirty} loading={save.isPending} size="sm" type="submit" variant="primary">
          Guardar bio
        </Button>
      </div>
    </form>
  );
}
