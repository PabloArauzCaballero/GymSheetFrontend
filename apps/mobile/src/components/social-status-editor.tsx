import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Text, View } from 'react-native';
import type { SocialStatusValue } from '@gymsheet/schemas';
import { socialService } from '@/api/services';
import { Card, Section } from '@/components/layout';
import { Button } from '@/components/ui';
import { FilterChip } from '@/components/filter-chip';
import { notify } from '@/notifications';
import { colors, fontSizes, spacing } from '@/theme';

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
    <Section title="Tu estado social">
      <Card>
        <Text style={{ color: colors.textMuted, fontSize: fontSizes.sm, lineHeight: 20 }}>
          Solo lo ven tus conexiones aceptadas, y solo si lo dejas visible.
        </Text>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm }}>
          {OPTIONS.map((option) => {
            const active = option.value === current;
            return (
              <FilterChip
                key={option.value}
                label={option.label}
                onPress={() => save.mutate({ socialStatus: option.value, visible })}
                selected={active}
              />
            );
          })}
        </View>
        <Button
          icon={visible ? 'eye-outline' : 'eye-off-outline'}
          label={visible ? 'Visible para tus conexiones' : 'Oculto'}
          loading={save.isPending}
          onPress={() => save.mutate({ socialStatus: current, visible: !visible })}
          variant={visible ? 'secondary' : 'ghost'}
        />
      </Card>
    </Section>
  );
}
