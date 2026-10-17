import { Text, View } from 'react-native';
import type { Ionicons } from '@expo/vector-icons';
import type { CardioModality } from '@gymsheet/types';
import { cardioModalityLabels } from '@gymsheet/hooks';
import { AnimatedIcon, type IconMotion } from '@/components/animated-icon';
import { PressableScale } from '@/components/motion';
import { useReduceMotion } from '@/notifications/use-reduce-motion';
import { accentContrast, colors, fontSizes, motion, radii, semibold, spacing } from '@/theme';

const LOOK: Record<CardioModality, { icon: keyof typeof Ionicons.glyphMap; motion: IconMotion; hint: string }> = {
  CORRER: { icon: 'walk', motion: 'bounce', hint: 'Ritmo constante al aire libre o en cinta' },
  CAMINAR: { icon: 'footsteps', motion: 'sway', hint: 'Suave con las articulaciones' },
  BICI: { icon: 'bicycle', motion: 'sway', hint: 'Calle o estática, mucho volumen' },
  REMO: { icon: 'boat', motion: 'sway', hint: 'Cuerpo completo' },
  ELIPTICA: { icon: 'infinite', motion: 'spin', hint: 'Sin impacto' },
  ESCALADORA: { icon: 'trending-up', motion: 'lift', hint: 'Piernas y glúteo' },
  NADAR: { icon: 'water', motion: 'float', hint: 'Cero impacto' },
  HIIT: { icon: 'flash', motion: 'pulse', hint: 'Intervalos cortos e intensos' },
  OTRO: { icon: 'fitness', motion: 'beat', hint: 'Lo que tú prefieras' },
};

/**
 * Tarjeta grande de modalidad: icono animado + nombre + una línea. El icono
 * solo se mueve en la elegida; el relleno viaja de un estado a otro.
 */
export function ModalityCard({
  modality,
  selected,
  onSelect,
  index,
}: {
  modality: CardioModality;
  selected: boolean;
  onSelect: () => void;
  index: number;
}) {
  const look = LOOK[modality];
  const reduceMotion = useReduceMotion();
  const ink = selected ? accentContrast() : colors.text;
  return (
    <PressableScale
      accessibilityLabel={`${cardioModalityLabels[modality]}. ${look.hint}`}
      accessibilityState={{ selected }}
      haptic="selection"
      onPress={onSelect}
      scaleTo={0.95}
      style={{
        width: '48%',
        gap: spacing.sm,
        padding: spacing.md,
        minHeight: 128,
        borderRadius: radii.lg,
        borderCurve: 'continuous',
        borderWidth: 1,
        borderColor: selected ? colors.volt : colors.border,
        backgroundColor: selected ? colors.volt : colors.surface,
        transitionProperty: ['backgroundColor', 'borderColor'],
        transitionDuration: reduceMotion ? 0 : motion.enter,
        transitionTimingFunction: 'ease-out',
      }}
      testID={`modality-${modality}`}
    >
      <AnimatedIcon active={selected} color={ink} delay={index * 40} motion={look.motion} name={look.icon} size={32} />
      <View style={{ gap: 2 }}>
        <Text style={{ color: ink, fontSize: fontSizes.md, fontWeight: semibold }}>{cardioModalityLabels[modality]}</Text>
        <Text style={{ color: selected ? ink : colors.textMuted, fontSize: fontSizes.xs }}>{look.hint}</Text>
      </View>
    </PressableScale>
  );
}
