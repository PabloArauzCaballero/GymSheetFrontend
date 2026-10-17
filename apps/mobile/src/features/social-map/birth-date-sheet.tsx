import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { Text, View } from 'react-native';
import type { z } from 'zod';
import type { profileSchema } from '@gymsheet/schemas';
import { profileService } from '@/api/services';
import { BottomSheet } from '@/components/bottom-sheet';
import { numericInputProps } from '@/components/keyboard';
import { Button, Input } from '@/components/ui';
import { BIRTH_DATE_PARTS, ageOn, birthDateError, toIsoBirthDate, type BirthDateParts } from '@/lib/birth-date';
import { notify } from '@/notifications';
import { colors, fontSizes, spacing } from '@/theme';

type Profile = z.infer<typeof profileSchema>;

/**
 * Asks only for the birth date, right on the map. Sending people to the full
 * profile wizard made them walk past weight, height and goal — where the date
 * is optional and easy to skip — and come back to the same request.
 *
 * The API saves the whole anthropometric profile at once, so the fields the
 * person already has travel unchanged next to the new date.
 */
export function BirthDateSheet({ visible, profile, onClose, onSaved }: {
  visible: boolean;
  profile: Profile;
  onClose: () => void;
  onSaved: () => void;
}) {
  const queryClient = useQueryClient();
  const [parts, setParts] = useState<BirthDateParts>({ dia: '', mes: '', anio: '' });
  const [error, setError] = useState<string | null>(null);

  const save = useMutation({
    mutationFn: (fechaNacimiento: string) => profileService.update({
      pesoKg: profile.pesoKg,
      estaturaCm: profile.estaturaCm,
      objetivo: profile.objetivo,
      fechaNacimiento,
    }),
    onSuccess: (saved) => {
      queryClient.setQueryData(['profile', 'me'], saved);
      onSaved();
    },
    onError: (failure: unknown) => notify.error(failure),
  });

  const submit = () => {
    const empty = parts.dia === '' && parts.mes === '' && parts.anio === '';
    const message = empty ? 'Escribe tu fecha de nacimiento.' : birthDateError(parts.dia, parts.mes, parts.anio);
    if (message) { setError(message); return; }
    if (ageOn(Number(parts.anio), Number(parts.mes), Number(parts.dia)) < 18) {
      setError('El mapa es solo para mayores de 18 años.');
      return;
    }
    setError(null);
    save.mutate(toIsoBirthDate(parts));
  };

  return (
    <BottomSheet
      onClose={onClose}
      subtitle="En el mapa solo aparecen mayores de edad. Los demás verán tu edad, nunca la fecha."
      title="¿Cuándo naciste?"
      visible={visible}
    >
      <View style={{ gap: spacing.md }}>
        <View style={{ gap: spacing.xs }}>
          <View style={{ flexDirection: 'row', gap: spacing.sm }}>
            {BIRTH_DATE_PARTS.map((part) => (
              <View key={part.key} style={{ flex: part.flex }}>
                <Input
                  keyboardType="number-pad"
                  {...numericInputProps}
                  label={part.label}
                  maxLength={part.maxLength}
                  onChangeText={(text) => { setParts((current) => ({ ...current, [part.key]: text.replace(/\D/g, '') })); setError(null); }}
                  placeholder={part.placeholder}
                  value={parts[part.key]}
                />
              </View>
            ))}
          </View>
          {error ? <Text style={{ color: colors.danger, fontSize: fontSizes.xs }}>{error}</Text> : null}
        </View>
        <Button icon="eye-outline" label="Guardar y aparecer en el mapa" loading={save.isPending} onPress={submit} />
      </View>
    </BottomSheet>
  );
}
