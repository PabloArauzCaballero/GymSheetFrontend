import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Text, View } from 'react-native';
import { accountService } from '@/api/services';
import { Card, Section } from '@/components/layout';
import { PressableScale } from '@/components/motion';
import { notify } from '@/notifications';
import { colors, fontSizes, radii, semibold, spacing } from '@/theme';

/**
 * Cuánto suma cada chip rápido al registrar una serie.
 *
 * Estaba fijo en 2.5 kg en el código: no todos los gimnasios cargan los mismos
 * discos, y quien entrena con mancuernas de 1.25 kg tocaba el chip y se pasaba
 * de peso. Se guarda al tocar, como el resto de preferencias de esta pantalla.
 *
 * Mismo control y mismo texto que en el portal web.
 */
const OPTIONS: readonly number[] = [1.25, 2.5, 5];

export function WeightIncrementPreference() {
  const queryClient = useQueryClient();
  const account = useQuery({ queryKey: ['user', 'me'], queryFn: () => accountService.getMe() });

  const save = useMutation({
    mutationFn: (pesoIncrementoKg: number) => accountService.setWeightIncrement(pesoIncrementoKg),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['user', 'me'] });
      notify.success('Preferencia guardada.');
    },
    onError: (error: Error) => notify.error(error.message),
  });

  const current = account.data?.pesoIncrementoKg ?? 2.5;

  return (
    <Section icon="barbell-outline" title="Chips de peso">
      <Card>
        <Text style={{ color: colors.textMuted, fontSize: fontSizes.sm, lineHeight: 20 }}>
          Cuánto suma cada chip («+{current.toLocaleString('es-ES')} kg») al registrar una serie.
        </Text>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs }}>
          {OPTIONS.map((option) => {
            const active = option === current;
            return (
              <PressableScale
                accessibilityLabel={`${option} kilogramos`}
                key={option}
                onPress={() => save.mutate(option)}
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
                  {option.toLocaleString('es-ES')} kg
                </Text>
              </PressableScale>
            );
          })}
        </View>
      </Card>
    </Section>
  );
}
