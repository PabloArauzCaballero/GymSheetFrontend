import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { ReactNode } from 'react';
import { Text, View } from 'react-native';
import type { UserGender } from '@gymsheet/types';
import { accountService } from '@/api/services';
import { Card, Section } from '@/components/layout';
import { FilterChip } from '@/components/filter-chip';
import { notify } from '@/notifications';
import { SaveStatusLine, useSectionSave } from '@/components/save-status';
import { colors, fontSizes, spacing } from '@/theme';

/**
 * Con qué arquetipos habla la senda.
 *
 * Es la única razón por la que la aplicación conoce el género: no se pide para
 * segmentar ni para informar, se pide para saber si llamarte «Gym Rat» o «Gym
 * Girl». Por eso el control se llama por lo que hace y no por el dato que
 * guarda, y por eso el texto de ayuda dice exactamente para qué sirve.
 *
 * Se guarda al tocar, sin botón de confirmar: es una preferencia reversible de
 * un solo campo, y añadirle un «Guardar» sería fricción sin contrapartida.
 *
 * Mismo control y mismo texto que en el portal web.
 */
const OPTIONS: readonly { value: UserGender; label: string }[] = [
  { value: 'MALE', label: 'Hombre' },
  { value: 'FEMALE', label: 'Mujer' },
  { value: 'UNSPECIFIED', label: 'Prefiero no decirlo' },
];

const GENDER_SAVE_KEY = ['profile', 'gender'] as const;

/** `header`: first row inside the card (pending «+N pts» on the edit screen). */
export function GenderPreference({ header }: { header?: ReactNode } = {}) {
  const queryClient = useQueryClient();
  const account = useQuery({ queryKey: ['user', 'me'], queryFn: () => accountService.getMe() });

  const save = useMutation({
    mutationKey: GENDER_SAVE_KEY,
    mutationFn: (genero: UserGender) => accountService.setGender(genero),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['user', 'me'] }),
        // Sin esto se seguirían viendo los rangos de la rama anterior hasta
        // reabrir la aplicación, que es justo el cambio que se acaba de pedir.
        queryClient.invalidateQueries({ queryKey: ['progression'] }),
      ]);
    },
    onError: (error: Error) => notify.error(error.message),
  });

  // Nothing is preselected until the person answers: showing «Prefiero no
  // decirlo» ticked for a null value claimed an answer nobody gave.
  const current = account.data?.genero ?? null;
  // A one-tap choice saves on tap and confirms in the same status line as the sections with a button.
  const status = useSectionSave(GENDER_SAVE_KEY, false);

  return (
    <Section title="Rangos de tu senda">
      <Card>
        {header}
        <Text style={{ color: colors.textMuted, fontSize: fontSizes.sm, lineHeight: 20 }}>
          Elige con qué rangos e insignias te habla tu senda. Puedes cambiarlo cuando quieras.
        </Text>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm }}>
          {OPTIONS.map((option) => {
            const active = option.value === current;
            return (
              <FilterChip
                accessibilityLabel={option.label}
                key={String(option.value)}
                label={option.label}
                onPress={() => save.mutate(option.value)}
                selected={active}
              />
            );
          })}
        </View>
        <SaveStatusLine saved="Preferencia guardada." status={status} testID="gender-status" />
      </Card>
    </Section>
  );
}
