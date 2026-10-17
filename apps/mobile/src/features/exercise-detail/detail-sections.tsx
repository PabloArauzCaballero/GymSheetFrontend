import { Text, View } from "react-native";
import { Shimmer } from "@/components/shimmer";
import { Card, Divider } from "@/components/layout";
import { EnterUp } from "@/components/motion";
import { Text as AppText } from "@/components/text";
import { MuscleChip } from "@/features/exercise-detail/detail-parts";
import {
  accentContrast,
  alpha,
  colors,
  fontFamilies,
  fontSizes,
  radii,
  spacing,
} from "@/theme";

/** Comparación sin tildes ni mayúsculas: «Cuádriceps» y «cuadriceps» son el mismo músculo. */
function norm(value: string): string {
  return value.normalize("NFD").replace(/[̀-ͯ]/g, "").trim().toLowerCase();
}

/** Lista sin repetidos ni vacíos, quitando lo que ya se dijo (`already`). */
export function distinctLabels(
  values: readonly string[],
  already: readonly string[] = [],
): string[] {
  const seen = new Set(already.map(norm));
  const out: string[] = [];
  for (const value of values) {
    const key = norm(value);
    if (!key || seen.has(key)) continue;
    seen.add(key);
    out.push(value);
  }
  return out;
}

export type Fact = { label: string; value: string };

/**
 * «Objetivo técnico» como teselas: etiqueta pequeña arriba y el valor debajo, en
 * dos columnas. Antes eran filas con el valor a la derecha, y un valor largo
 * («Cuádriceps, Gemelos, Isquiotibiales») se partía en dos líneas pegadas al borde.
 */
export function FactGrid({ facts }: { facts: readonly Fact[] }) {
  return (
    <View style={{ flexDirection: "row", flexWrap: "wrap", gap: spacing.sm }}>
      {facts.map((fact, index) => {
        // Los textos largos ocupan la fila entera; los cortos van de dos en dos.
        const wide = fact.value.length > 22;
        return (
          <EnterUp
            index={index}
            key={fact.label}
            style={{ flexGrow: 1, flexBasis: wide ? "100%" : "47%" }}
          >
            <View
              style={{
                gap: 4,
                padding: spacing.md,
                borderRadius: radii.lg,
                borderCurve: "continuous",
                borderWidth: 1,
                borderColor: colors.borderSubtle,
                backgroundColor: colors.surfaceLow,
              }}
            >
              <AppText tone="muted" variant="caption">
                {fact.label}
              </AppText>
              <Text
                style={{
                  color: colors.text,
                  fontFamily: fontFamilies.displaySemibold,
                  fontSize: fontSizes.md,
                  letterSpacing: -0.2,
                  lineHeight: 22,
                }}
              >
                {fact.value}
              </Text>
            </View>
          </EnterUp>
        );
      })}
    </View>
  );
}

export type MuscleGroup = {
  label: string;
  primary: boolean;
  items: { code: string; name: string }[];
};

/** Músculos agrupados por papel, con cada nombre una sola vez (el primer grupo gana). */
export function MuscleGroups({
  groups,
  onOpen,
}: {
  groups: readonly MuscleGroup[];
  onOpen: (code: string) => void;
}) {
  return (
    <Card>
      {groups.map((group, index) => (
        <View key={group.label}>
          {index > 0 ? <Divider /> : null}
          <View style={{ gap: spacing.sm, paddingVertical: spacing.xs }}>
            <AppText
              strong
              tone={group.primary ? "accent" : "muted"}
              variant="caption"
            >
              {group.label}
            </AppText>
            <View
              style={{
                flexDirection: "row",
                flexWrap: "wrap",
                gap: spacing.sm,
              }}
            >
              {group.items.map((muscle) => (
                <MuscleChip
                  key={muscle.code}
                  name={muscle.name}
                  onPress={() => onOpen(muscle.code)}
                  primary={group.primary}
                />
              ))}
            </View>
          </View>
        </View>
      ))}
    </Card>
  );
}

const NODE = 38;

/**
 * La secuencia como línea de nodos: un número vibrante por paso, unido al
 * siguiente por un hilo, y el texto en su propia tarjeta. Se lee de arriba
 * abajo como un recorrido, no como una lista de párrafos.
 */
export function StepsTimeline({ steps }: { steps: readonly string[] }) {
  return (
    <View>
      {steps.map((step, index) => {
        const last = index === steps.length - 1;
        return (
          <EnterUp index={index} key={`${index}-${step}`}>
            <View style={{ flexDirection: "row", gap: spacing.md }}>
              <View style={{ width: NODE, alignItems: "center" }}>
                <View
                  style={{
                    width: NODE,
                    height: NODE,
                    borderRadius: radii.full,
                    alignItems: "center",
                    justifyContent: "center",
                    backgroundColor: colors.volt,
                    boxShadow: `0 0 0 4px ${alpha(colors.volt, 0.16)}, 0 6px 18px ${alpha(colors.volt, 0.5)}`,
                  }}
                >
                  <Text
                    style={{
                      color: accentContrast(),
                      fontFamily: fontFamilies.display,
                      fontSize: fontSizes.md,
                      fontVariant: ["tabular-nums"],
                    }}
                  >
                    {index + 1}
                  </Text>
                </View>
                {!last ? (
                  <View
                    style={{
                      flex: 1,
                      width: 2,
                      marginVertical: 6,
                      borderRadius: 1,
                      backgroundColor: alpha(colors.volt, 0.35),
                    }}
                  />
                ) : null}
              </View>
              <View style={{ flex: 1, paddingBottom: last ? 0 : spacing.md }}>
                <View
                  style={{
                    padding: spacing.md,
                    borderRadius: radii.lg,
                    borderCurve: "continuous",
                    borderWidth: 1,
                    borderColor: colors.borderSubtle,
                    backgroundColor: colors.surfaceLow,
                  }}
                >
                  <Text
                    style={{
                      color: colors.text,
                      fontSize: fontSizes.md - 1,
                      lineHeight: 23,
                    }}
                  >
                    {step}
                  </Text>
                </View>
              </View>
            </View>
          </EnterUp>
        );
      })}
    </View>
  );
}

function Block({
  height,
  width,
  radius = radii.lg,
}: {
  height: number;
  width?: number | `${number}%`;
  radius?: number;
}) {
  return (
    <View
      style={{
        height,
        width: width ?? "100%",
        borderRadius: radius,
        borderCurve: "continuous",
        overflow: "hidden",
        backgroundColor: colors.surfaceLow,
      }}
    >
      <Shimmer />
    </View>
  );
}

/**
 * Lo que se ve mientras llega la ficha: la misma forma que tendrá —portada,
 * título, botones, teselas, tarjeta— con la franja de luz cruzándola. Así la
 * pantalla ya «está» antes de llegar y el contenido solo se enciende.
 */
export function ExerciseDetailSkeleton() {
  return (
    <View
      accessibilityLabel="Cargando ejercicio"
      accessibilityRole="progressbar"
      style={{ gap: spacing.lg }}
    >
      <Block height={300} radius={radii.xl} />
      <View style={{ gap: spacing.sm }}>
        <Block height={30} width="72%" />
        <Block height={16} width="38%" />
      </View>
      <View style={{ flexDirection: "row", gap: spacing.sm }}>
        <View style={{ flex: 1 }}>
          <Block height={52} />
        </View>
        <View style={{ flex: 1 }}>
          <Block height={52} />
        </View>
      </View>
      <View style={{ flexDirection: "row", gap: spacing.sm }}>
        <View style={{ flex: 1 }}>
          <Block height={76} />
        </View>
        <View style={{ flex: 1 }}>
          <Block height={76} />
        </View>
      </View>
      <Block height={140} radius={radii.xl} />
    </View>
  );
}
