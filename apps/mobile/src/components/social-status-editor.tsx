import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Text, View } from 'react-native';
import type { SocialStatusValue } from '@gymsheet/schemas';
import { socialService } from '@/api/services';
import { Card, Section } from '@/components/layout';
import { Button } from '@/components/ui';
import { PressableScale } from '@/components/motion';
import { notify } from '@/notifications';
import { colors, fontSizes, radii, semibold, spacing } from '@/theme';

const OPTIONS: readonly { value: SocialStatusValue; label: string }[] = [
  { value: 'OPEN_TO_MEET', label: 'Abierto/a a conocer gente' },
  { value: 'IN_RELATIONSHIP', label: 'En pareja' },
  { value: 'SINGLE', label: 'Soltero/a' },
];

/**
 * Tu estado social: solo lo ve quien tenga una conexión aceptada contigo Y lo
 * dejes visible. Se guarda al tocar, sin botón de confirmar — mismo criterio
 * que `GenderPreference` para una preferencia reversible de un solo campo.
 */
export function SocialStatusEditor() {
  const queryClient = useQueryClient();
  const status = useQuery({
    queryKey: ['social', 'status'],
    queryFn: () => socialService.getSocialStatus(),
  });

  const save = useMutation({
    mutationFn: (input: { socialStatus: SocialStatusValue | null; visible: boolean }) =>
      socialService.updateSocialStatus(input),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['social', 'status'] });
      notify.success('Estado social actualizado.');
    },
    onError: (error: Error) => notify.error(error.message),
  });

  const current = status.data?.socialStatus ?? null;
  const visible = status.data?.visible ?? false;

  return (
    <Section icon="heart-outline" title="Tu estado social">
      <Card>
        <Text style={{ color: colors.textMuted, fontSize: fontSizes.sm, lineHeight: 20 }}>
          Solo lo ven tus conexiones aceptadas, y solo si lo dejas visible.
        </Text>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs }}>
          {OPTIONS.map((option) => {
            const active = option.value === current;
            return (
              <PressableScale
                accessibilityLabel={option.label}
                key={option.value}
                onPress={() => save.mutate({ socialStatus: option.value, visible })}
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
        <Button
          icon={visible ? 'eye-outline' : 'eye-off-outline'}
          label={visible ? 'Visible para tus conexiones' : 'Oculto'}
          loading={save.isPending}
          onPress={() => save.mutate({ socialStatus: current, visible: !visible })}
          variant={visible ? 'primary' : 'ghost'}
        />
      </Card>
    </Section>
  );
}
