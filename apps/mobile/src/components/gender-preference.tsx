import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Text, View } from 'react-native';
import { genderOptions } from '@gymsheet/domain';
import type { UserGender } from '@gymsheet/types';
import { accountService } from '@/api/services';
import { Card, Section } from '@/components/layout';
import { FilterChip } from '@/components/filter-chip';
import { notify } from '@/notifications';
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
 * Las opciones salen de `genderOptions` (`@gymsheet/domain`), la misma lista
 * que el alta: «Prefiero no decirlo» es la opción `''`.
 */
// The shared list hides UNSPECIFIED on purpose: it is what the API stores when
// someone chooses not to answer, so '' maps to it on save and back on read.
const toStored = (option: UserGender | ''): UserGender => (option === '' ? 'UNSPECIFIED' : option);
const toOption = (stored: UserGender | null | undefined): UserGender | '' =>
  stored === 'MALE' || stored === 'FEMALE' ? stored : '';

export function GenderPreference() {
  const queryClient = useQueryClient();
  const account = useQuery({ queryKey: ['user', 'me'], queryFn: () => accountService.getMe() });

  const save = useMutation({
    mutationFn: (genero: UserGender) => accountService.setGender(genero),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['user', 'me'] }),
        // Sin esto se seguirían viendo los rangos de la rama anterior hasta
        // reabrir la aplicación, que es justo el cambio que se acaba de pedir.
        queryClient.invalidateQueries({ queryKey: ['progression'] }),
      ]);
      notify.success('Preferencia guardada.');
    },
    onError: (error: Error) => notify.error(error.message),
  });

  const current = toOption(account.data?.genero);

  return (
    <Section title="Rangos de tu senda">
      <Card>
        <Text style={{ color: colors.textMuted, fontSize: fontSizes.sm, lineHeight: 20 }}>
          Elige con qué rangos e insignias te habla tu senda. Puedes cambiarlo cuando quieras.
        </Text>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm }}>
          {genderOptions.map((option) => {
            const active = option.value === current;
            return (
              <FilterChip
                accessibilityLabel={option.label}
                key={String(option.value)}
                label={option.label}
                onPress={() => save.mutate(toStored(option.value))}
                selected={active}
              />
            );
          })}
        </View>
      </Card>
    </Section>
  );
}
