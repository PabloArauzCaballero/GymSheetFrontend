'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { profileService } from '@/features/profile/services/profile-service';
import type { UserGender } from '@/shared/api/contracts';
import { SaveStatusLine, useSectionSave } from '@/shared/components/feedback/save-status';
import { Field } from '@/shared/components/ui/field';
import { Select } from '@/shared/components/ui/select';
import { notify } from '@/shared/notifications';

/**
 * Con qué arquetipos habla la senda.
 *
 * Vive en `progression` y no en `profile` porque es la única razón por la que
 * la aplicación conoce este dato: no se pide para segmentar ni para informar,
 * se pide para saber si llamarte «Gym Rat» o «Gym Girl». Ponerlo aquí mantiene
 * a la vista que si la senda dejara de filtrar por género, este campo sobraría.
 *
 * Se guarda al soltar el desplegable, sin botón: es una sola preferencia
 * reversible, y un formulario de un campo con su propio «Guardar» es fricción
 * sin contrapartida.
 */
const GENDER_SAVE_KEY = ['profile', 'gender'] as const;

export function GenderPreferenceField({ value }: Readonly<{ value: UserGender | null }>) {
  const queryClient = useQueryClient();

  const save = useMutation({
    mutationKey: GENDER_SAVE_KEY,
    mutationFn: profileService.updateGender,
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['user', 'me'] }),
        // Sin esto se seguirían viendo los rangos de la rama anterior hasta
        // recargar la página, que es justo el cambio que se acaba de pedir.
        queryClient.invalidateQueries({ queryKey: ['progression'] }),
      ]);
    },
    onError: (error: Error) => notify.error(error.message),
  });

  // A one-tap choice saves on change and confirms in the same status line as the sections with a button.
  const status = useSectionSave(GENDER_SAVE_KEY, false);
  return (
    <>
    <Field
      hint="Elige con qué rangos e insignias te habla tu senda. Puedes cambiarlo cuando quieras."
      htmlFor="genero"
      label="Género"
    >
      <Select
        disabled={save.isPending}
        id="genero"
        onChange={(event) => save.mutate(event.target.value as UserGender)}
        // Null means «not asked yet»: show an empty choice instead of claiming
        // «Prefiero no decirlo», which also made that answer impossible to pick.
        value={value ?? ''}
      >
        {value === null ? (
          <option disabled value="">
            Elige una opción
          </option>
        ) : null}
        <option value="UNSPECIFIED">Prefiero no decirlo</option>
        <option value="MALE">Hombre</option>
        <option value="FEMALE">Mujer</option>
      </Select>
    </Field>
    <SaveStatusLine saved="Preferencia guardada." status={status} testId="gender-status" />
    </>
  );
}
