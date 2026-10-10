import { Ionicons } from '@expo/vector-icons';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Text, View } from 'react-native';
import type { Exercise } from '@gymsheet/types';
import { exerciseCommunityService } from '@/api/services';
import { PressableScale } from '@/components/motion';
import { notify } from '@/notifications';
import { alpha, colors, fontSizes, iconSizes, minTouchTarget, radii, semibold, spacing } from '@/theme';

type Patch = Partial<Pick<Exercise, 'meGusta' | 'meGustaTotal' | 'esFavorito'>>;

function ToggleButton({
  active,
  icon,
  activeIcon,
  label,
  accessibilityLabel,
  onPress,
  disabled,
  testID,
}: {
  active: boolean;
  icon: keyof typeof Ionicons.glyphMap;
  activeIcon: keyof typeof Ionicons.glyphMap;
  label: string;
  accessibilityLabel: string;
  onPress: () => void;
  disabled: boolean;
  testID: string;
}) {
  return (
    <PressableScale
      accessibilityLabel={accessibilityLabel}
      accessibilityRole="button"
      accessibilityState={{ selected: active, disabled }}
      disabled={disabled}
      haptic="selection"
      hitSlop={spacing.xs}
      onPress={onPress}
      style={{
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: spacing.sm,
        minHeight: minTouchTarget,
        borderRadius: radii.md,
        borderWidth: 1,
        borderColor: active ? colors.volt : colors.border,
        backgroundColor: active ? alpha(colors.volt, 0.08) : colors.surface,
      }}
      testID={testID}
    >
      <Ionicons
        accessibilityElementsHidden
        color={active ? colors.accentInk : colors.textMuted}
        importantForAccessibility="no-hide-descendants"
        name={active ? activeIcon : icon}
        size={iconSizes.md}
      />
      <Text
        style={{
          color: active ? colors.accentInk : colors.text,
          fontSize: fontSizes.sm,
          fontWeight: semibold,
        }}
      >
        {label}
      </Text>
    </PressableScale>
  );
}

/**
 * ♥ «me gusta» (público, con contador) y ☆ favorito (privado) de un ejercicio
 * (RF-07, D7). Ambos son optimistas: la ficha cambia al tocar y, si el servidor
 * rechaza, vuelve a como estaba y avisa.
 *
 * El contador se pinta con lo que devuelve el servidor, no con una cuenta propia:
 * dos personas dando «me gusta» a la vez no deben desincronizarse.
 */
export function ExerciseSocial({ exercise }: { exercise: Exercise }) {
  const queryClient = useQueryClient();
  const key = ['exercise', exercise.id] as const;

  const patch = (change: Patch) =>
    queryClient.setQueryData<Exercise>(key, (current) =>
      current ? { ...current, ...change } : current,
    );

  const like = useMutation({
    mutationFn: (next: boolean) =>
      next
        ? exerciseCommunityService.like(exercise.id)
        : exerciseCommunityService.unlike(exercise.id),
    onMutate: (next) => {
      const previous = {
        meGusta: exercise.meGusta ?? false,
        meGustaTotal: exercise.meGustaTotal,
      };
      patch({
        meGusta: next,
        meGustaTotal: Math.max(0, exercise.meGustaTotal + (next ? 1 : -1)),
      });
      return previous;
    },
    onSuccess: (result) => patch({ meGusta: result.meGusta, meGustaTotal: result.meGustaTotal }),
    onError: (error, _next, previous) => {
      if (previous) patch(previous);
      notify.error(error);
    },
  });

  const favorite = useMutation({
    mutationFn: (next: boolean) => exerciseCommunityService.setFavorite(exercise.id, next),
    onMutate: (next) => {
      const previous = { esFavorito: exercise.esFavorito ?? false };
      patch({ esFavorito: next });
      return previous;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['exercises'] }),
    onError: (error, _next, previous) => {
      if (previous) patch(previous);
      notify.error(error);
    },
  });

  const liked = exercise.meGusta ?? false;
  const isFavorite = exercise.esFavorito ?? false;
  const total = exercise.meGustaTotal;

  return (
    <View style={{ flexDirection: 'row', gap: spacing.sm }}>
      <ToggleButton
        accessibilityLabel={
          liked
            ? `Me gusta, activado. ${total} ${total === 1 ? 'persona' : 'personas'}`
            : `Dar me gusta. ${total} ${total === 1 ? 'persona' : 'personas'}`
        }
        active={liked}
        activeIcon="heart"
        disabled={like.isPending}
        icon="heart-outline"
        label={`Me gusta · ${total}`}
        onPress={() => like.mutate(!liked)}
        testID="exercise-like"
      />
      <ToggleButton
        accessibilityLabel={
          isFavorite ? 'Favorito, activado. Solo tú lo ves' : 'Marcar como favorito. Solo tú lo ves'
        }
        active={isFavorite}
        activeIcon="star"
        disabled={favorite.isPending}
        icon="star-outline"
        label="Favorito"
        onPress={() => favorite.mutate(!isFavorite)}
        testID="exercise-favorite"
      />
    </View>
  );
}
