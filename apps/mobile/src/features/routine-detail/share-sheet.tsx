import { Ionicons } from '@expo/vector-icons';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { Text, View } from 'react-native';
import type { GymDirectoryEntry } from '@gymsheet/schemas';
import { routineSharingService, socialService } from '@/api/services';
import { BottomSheet } from '@/components/bottom-sheet';
import { Skeleton } from '@/components/feedback';
import { PressableScale } from '@/components/motion';
import { Button, Input } from '@/components/ui';
import { useDebouncedValue } from '@/hooks/use-debounced-value';
import { initialsOf } from '@/lib/format';
import { notify } from '@/notifications';
import { colors, fontSizes, iconSizes, minTouchTarget, radii, semibold, spacing } from '@/theme';

function PersonRow({
  person,
  selected,
  onToggle,
}: {
  person: GymDirectoryEntry;
  selected: boolean;
  onToggle: () => void;
}) {
  return (
    <PressableScale
      accessibilityLabel={`${person.displayName}${person.branchName ? `, ${person.branchName}` : ''}`}
      accessibilityRole="checkbox"
      accessibilityState={{ checked: selected }}
      haptic="selection"
      onPress={onToggle}
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.md,
        minHeight: minTouchTarget + 8,
        borderRadius: radii.md,
        borderWidth: 1,
        borderColor: selected ? colors.volt : colors.borderSubtle,
        backgroundColor: colors.surfaceLow,
        padding: spacing.sm,
      }}
      testID={`person-${person.userId}`}
    >
      <View
        style={{ width: 40, height: 40, borderRadius: radii.full, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.surfaceHigh }}
      >
        <Text style={{ color: colors.text, fontWeight: semibold }}>{initialsOf(person.displayName, undefined)}</Text>
      </View>
      <View style={{ flex: 1 }}>
        <Text style={{ color: colors.text, fontSize: fontSizes.md, fontWeight: semibold }}>{person.displayName}</Text>
        {person.branchName ? (
          <Text style={{ color: colors.textMuted, fontSize: fontSizes.sm }}>{person.branchName}</Text>
        ) : null}
      </View>
      <Ionicons
        color={selected ? colors.volt : colors.textMuted}
        name={selected ? 'checkmark-circle' : 'ellipse-outline'}
        size={iconSizes.lg}
      />
    </PressableScale>
  );
}

/**
 * «Compartir con…» (RF-13): buscador de personas del gimnasio (sin email),
 * selección múltiple y «Enviar». El backend crea las invitaciones pendientes.
 */
export function ShareSheet({
  routineId,
  routineName,
  visible,
  onClose,
}: {
  routineId: string;
  routineName: string;
  visible: boolean;
  onClose: () => void;
}) {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [picked, setPicked] = useState<string[]>([]);
  const q = useDebouncedValue(search.trim(), 300);
  const results = useQuery({
    queryKey: ['gym-directory', 'share', q],
    queryFn: () => socialService.directory({ q, limit: 20 }),
    enabled: visible && q.length >= 2,
  });

  const send = useMutation({
    mutationFn: () => routineSharingService.invite(routineId, picked),
    onSuccess: async (result) => {
      await queryClient.invalidateQueries({ queryKey: ['routine-shares', routineId] });
      notify.success(
        result.creados.length > 0
          ? `Invitación enviada (${result.creados.length}).`
          : 'Esas personas ya tenían una invitación.',
      );
      setPicked([]);
      setSearch('');
      onClose();
    },
    onError: (error: Error) => notify.error(error),
  });

  const toggle = (id: string) =>
    setPicked((current) => (current.includes(id) ? current.filter((p) => p !== id) : [...current, id]));

  return (
    <BottomSheet
      onClose={onClose}
      subtitle={`«${routineName}» · quien acepte la verá completa.`}
      testID="share-sheet"
      title="Compartir con…"
      visible={visible}
    >
      <Input
        autoCapitalize="none"
        autoCorrect={false}
        icon="search"
        label="Buscar personas"
        labelHidden
        onChangeText={setSearch}
        placeholder="Nombre de la persona (mín. 2 letras)"
        testID="people-search"
        value={search}
      />
      {q.length < 2 ? (
        <Text style={{ color: colors.textMuted, fontSize: fontSizes.sm }}>
          Escribe al menos 2 letras para buscar en tu gimnasio.
        </Text>
      ) : results.isPending ? (
        <Skeleton height={64} />
      ) : (results.data ?? []).length === 0 ? (
        <Text style={{ color: colors.textMuted, fontSize: fontSizes.sm }}>No encontramos a nadie con ese nombre.</Text>
      ) : (
        results.data?.map((person) => (
          <PersonRow
            key={person.userId}
            onToggle={() => toggle(person.userId)}
            person={person}
            selected={picked.includes(person.userId)}
          />
        ))
      )}
      <Button
        disabled={picked.length === 0}
        label={picked.length > 1 ? `Enviar a ${picked.length} personas` : 'Enviar'}
        loading={send.isPending}
        onPress={() => send.mutate()}
      />
    </BottomSheet>
  );
}
