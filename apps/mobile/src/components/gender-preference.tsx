import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Text, View } from 'react-native';
import type { UserGender } from '@gymsheet/types';
import { accountService } from '@/api/services';
import { Card, Section } from '@/components/layout';
import { PressableScale } from '@/components/motion';
import { notify } from '@/notifications';
import { colors, fontSizes, radii, semibold, spacing } from '@/theme';

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

  const current = account.data?.genero ?? 'UNSPECIFIED';

  return (
    <Section icon="sparkles-outline" title="Tu senda">
      <Card>
        <Text style={{ color: colors.textMuted, fontSize: fontSizes.sm, lineHeight: 20 }}>
          Elige con qué rangos e insignias te habla tu senda. Puedes cambiarlo cuando quieras.
        </Text>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs }}>
          {OPTIONS.map((option) => {
            const active = option.value === current;
            return (
              <PressableScale
                accessibilityLabel={option.label}
                key={option.value}
                onPress={() => save.mutate(option.value)}
                style={{
                  paddingHorizontal: spacing.md,
                  paddingVertical: spacing.sm,
                  borderRadius: radii.full,
                  borderWidth: 1,
                  borderColor: active ? colors.volt : colors.border,
                  backgroundColor: active ? colors.surfaceHigh : colors.surfaceLow,
                }}
              >
                <Text
                  style={{
                    color: active ? colors.text : colors.textMuted,
                    fontSize: fontSizes.sm,
                    fontWeight: active ? semibold : '400',
                  }}
                >
                  {option.label}
                </Text>
              </PressableScale>
            );
          })}
        </View>
      </Card>
    </Section>
  );
}
