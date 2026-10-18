import { Ionicons } from "@expo/vector-icons";
import { useState } from "react";
import { Pressable, Text } from "react-native";
import { PressableScale } from "@/components/motion";
import { Card } from "@/components/layout";
import { alpha, colors, fontSizes, iconSizes, radii, semibold, spacing } from "@/theme";

/**
 * Instruction steps arrive keyed by locale. `es-BO` first — the same order the
 * web app uses, so both clients show the identical copy.
 */
export function stepsOf(steps: Record<string, string[]>): string[] {
  return (
    steps["es-BO"] ??
    steps["es"] ??
    steps["en"] ??
    Object.values(steps)[0] ??
    []
  );
}

/** Músculo tocable: lleva a su pantalla, donde está la figura y sus ejercicios. */
export function MuscleChip({
  name,
  primary,
  onPress,
}: {
  name: string;
  primary: boolean;
  onPress: () => void;
}) {
  return (
    <PressableScale
      accessibilityLabel={`${name}, ver músculo`}
      onPress={onPress}
      style={{
        paddingHorizontal: spacing.md - 2,
        paddingVertical: spacing.sm,
        minHeight: 36,
        borderRadius: radii.full,
        borderWidth: 1,
        borderColor: primary ? colors.accentInk : colors.border,
        backgroundColor: primary
          ? alpha(colors.volt, 0.08)
          : colors.surfaceHigh,
        justifyContent: "center",
      }}
    >
      <Text
        style={{
          color: primary ? colors.accentInk : colors.text,
          fontSize: fontSizes.sm,
          fontWeight: semibold,
        }}
      >
        {name}
      </Text>
    </PressableScale>
  );
}

/** Long copy starts folded: a wall of text is the fastest way to lose a reader. */
export function Description({ text }: { text: string }) {
  const [expanded, setExpanded] = useState(false);
  return (
    <Card>
      <Text
        numberOfLines={expanded ? undefined : 4}
        style={{ color: colors.text, fontSize: fontSizes.sm, lineHeight: 22 }}
      >
        {text}
      </Text>
      <Pressable
        accessibilityRole="button"
        accessibilityState={{ expanded }}
        hitSlop={spacing.sm}
        onPress={() => setExpanded((value) => !value)}
        style={({ pressed }) => ({
          flexDirection: "row",
          alignItems: "center",
          alignSelf: "flex-start",
          gap: spacing.xs,
          opacity: pressed ? 0.6 : 1,
        })}
      >
        <Text
          style={{
            color: colors.accentInk,
            fontSize: fontSizes.sm,
            fontWeight: semibold,
          }}
        >
          {expanded ? "Ver menos" : "Leer más"}
        </Text>
        {/* El chevrón dice hacia dónde se mueve el texto: abre o pliega. */}
        <Ionicons
          accessibilityElementsHidden
          color={colors.accentInk}
          importantForAccessibility="no-hide-descendants"
          name={expanded ? "chevron-up" : "chevron-down"}
          size={iconSizes.sm}
        />
      </Pressable>
    </Card>
  );
}
