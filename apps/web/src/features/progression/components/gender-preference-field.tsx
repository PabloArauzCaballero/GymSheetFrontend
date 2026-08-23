'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { profileService } from '@/features/profile/services/profile-service';
import type { UserGender } from '@/shared/api/contracts';
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
export function GenderPreferenceField({ value }: Readonly<{ value: UserGender | null }>) {
  const queryClient = useQueryClient();

  const save = useMutation({
    mutationFn: profileService.updateGender,
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['user', 'me'] }),
        // Sin esto se seguirían viendo los rangos de la rama anterior hasta
        // recargar la página, que es justo el cambio que se acaba de pedir.
        queryClient.invalidateQueries({ queryKey: ['progression'] }),
      ]);
      notify.success('Preferencia guardada.');
    },
    onError: (error: Error) => notify.error(error.message),
  });

  return (
    <Field
      hint="Elige con qué rangos e insignias te habla tu senda. Puedes cambiarlo cuando quieras."
      htmlFor="genero"
      label="Género"
    >
      <Select
        disabled={save.isPending}
        id="genero"
        onChange={(event) => save.mutate(event.target.value as UserGender)}
        value={value ?? 'UNSPECIFIED'}
      >
        <option value="UNSPECIFIED">Prefiero no decirlo</option>
        <option value="MALE">Hombre</option>
        <option value="FEMALE">Mujer</option>
      </Select>
    </Field>
  );
}
