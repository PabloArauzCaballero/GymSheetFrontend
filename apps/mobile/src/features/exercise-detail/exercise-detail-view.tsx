import { exerciseDisplayName } from "@gymsheet/hooks";
import { useQuery } from "@tanstack/react-query";
import { useRouter } from "expo-router";
import { ScrollView, Text, View } from "react-native";
import {
  bodyPartLabelEs,
  exerciseGroupLabelEs,
  muscleLabelEs,
} from "@gymsheet/domain";
import {
  Badge,
  ScrollScreen,
  ScreenHeader,
  Section,
} from "@/components/layout";
import { ErrorState } from "@/components/feedback";
import { ExerciseDemo, ExerciseImage } from "@/components/media";
import { PressableScale } from "@/components/motion";
import { BackLink } from "@/components/nav";
import { Button } from "@/components/ui";
import { Description, stepsOf } from "@/features/exercise-detail/detail-parts";
import {
  distinctLabels,
  ExerciseDetailSkeleton,
  FactGrid,
  MuscleGroups,
  StepsTimeline,
  type Fact,
  type MuscleGroup,
} from "@/features/exercise-detail/detail-sections";
import { ExerciseSocial } from "@/features/exercise-detail/exercise-social";
import { ExerciseCommentsSection } from "@/features/exercise-comments/exercise-comments-section";
import { accountService, exerciseService, muscleService } from "@/api/services";
import { colors, fontSizes, radii, semibold, spacing } from "@/theme";
import { routes } from "@/lib/routes";

/** Alto reservado al final de la ficha para que el botón fijo no tape el contenido. */
const PICK_BAR_CLEARANCE = 112;

/**
 * Cuando la ficha se abre desde el asistente de rutinas, el botón fijo inferior
 * añade (o quita) el ejercicio del día que se está editando. Sin esto la ficha es
 * la de la pestaña Ejercicios de siempre.
 */
export type DetailPick = { added: boolean; onToggle: () => void };

export function ExerciseDetailView({
  id,
  pick,
}: {
  id: string;
  pick?: DetailPick;
}) {
  const router = useRouter();

  const exercise = useQuery({
    queryKey: ["exercise", id],
    queryFn: () => exerciseService.get(id),
    enabled: Boolean(id),
    // Se guarda en disco: una ficha ya vista abre al instante y se revalida detrás.
    staleTime: 10 * 60 * 1000,
  });

  /**
   * El género elige el cuerpo de la demostración. Misma clave que el resto de
   * la app (`['user','me']`), así que se sirve de la caché ya cargada en Perfil
   * en vez de pedir la cuenta otra vez.
   */
  const account = useQuery({
    queryKey: ["user", "me"],
    queryFn: () => accountService.getMe(),
  });

  // Los músculos con su código canónico: son los que se pueden abrir. Si la
  // consulta falla o aún no llega, la sección simplemente no aparece y quedan
  // los textos de «Objetivo técnico»; no se bloquea nada por ella.
  const muscles = useQuery({
    queryKey: ["exercise", id, "muscles"],
    queryFn: () => muscleService.forExercise(id),
    enabled: Boolean(id),
    staleTime: 30 * 60 * 1000,
  });

  const group = exercise.data?.grupoMuscular;
  // Same muscle group, minus this exercise: the natural "what else trains
  // this?" question, answered without leaving the screen.
  const similar = useQuery({
    queryKey: ["exercises", "similar", group],
    queryFn: () => exerciseService.list({ grupoMuscular: group, pageSize: 12 }),
    enabled: Boolean(group),
  });

  const pickBar = pick ? (
    <View
      style={{
        borderRadius: radii.lg,
        borderWidth: 1,
        borderColor: colors.border,
        backgroundColor: colors.surface,
        padding: spacing.sm,
      }}
    >
      <Button
        icon={pick.added ? "checkmark" : "add"}
        label={pick.added ? "Quitar de la rutina" : "Añadir a la rutina"}
        onPress={pick.onToggle}
        variant={pick.added ? "ghost" : "primary"}
      />
    </View>
  ) : undefined;

  if (exercise.isPending) {
    return (
      <ScrollScreen overlay={pickBar}>
        <BackLink />
        <ExerciseDetailSkeleton />
      </ScrollScreen>
    );
  }

  if (exercise.isError) {
    return (
      <ScrollScreen overlay={pickBar}>
        <BackLink />
        <ErrorState
          error={exercise.error}
          onRetry={() => void exercise.refetch()}
        />
      </ScrollScreen>
    );
  }

  const data = exercise.data;
  const steps = stepsOf(data.instructionSteps);
  const others = (similar.data?.items ?? [])
    .filter((item) => item.id !== data.id)
    .slice(0, 10);

  // Cada músculo se dice una sola vez: el objetivo no vuelve a salir como
  // sinergista ni entre los secundarios (antes «Cuádriceps» aparecía tres veces).
  const target = muscleLabelEs(data.targetMuscle);
  const synergist = distinctLabels(
    [exerciseGroupLabelEs(data.synergistMuscleGroup)],
    [target],
  );
  const secondary = distinctLabels(data.secondaryMuscles.map(muscleLabelEs), [
    target,
    ...synergist,
  ]);
  const facts: Fact[] = [
    { label: "Músculo objetivo", value: target },
    { label: "Parte corporal", value: bodyPartLabelEs(data.bodyPart) },
    { label: "Sinergista", value: synergist[0] ?? "" },
    { label: "Secundarios", value: secondary.join(", ") },
  ].filter((fact) => fact.value);

  const taken: string[] = [];
  const muscleGroups: MuscleGroup[] = (
    [
      ["Principales", muscles.data?.primarios ?? [], true],
      ["Secundarios", muscles.data?.secundarios ?? [], false],
      ["Estabilizadores", muscles.data?.estabilizadores ?? [], false],
    ] as const
  )
    .map(([label, list, primary]) => {
      const items = list.filter((muscle) => {
        const name = muscle.nombre.trim().toLowerCase();
        if (taken.includes(name)) return false;
        taken.push(name);
        return true;
      });
      return {
        label,
        primary,
        items: items.map((muscle) => ({
          code: muscle.code,
          name: muscle.nombre,
        })),
      };
    })
    .filter((group) => group.items.length > 0);

  return (
    <ScrollScreen
      onRefresh={() => void exercise.refetch()}
      overlay={pickBar}
      refreshing={exercise.isFetching}
    >
      <BackLink />

      <ExerciseDemo exercise={data} gender={account.data?.genero ?? null} />

      <ScreenHeader
        subtitle={exerciseGroupLabelEs(data.grupoMuscular)}
        title={exerciseDisplayName(data)}
      />

      <ExerciseSocial exercise={data} />

      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: spacing.sm }}>
        {data.bodyPart ? (
          <Badge label={bodyPartLabelEs(data.bodyPart)} tone="success" />
        ) : null}
        {data.tipoEjercicio === "PERSONAL" ? (
          <Badge label="Personal" tone="warning" />
        ) : null}
      </View>

      {facts.length > 0 ? (
        <Section index={0} title="Objetivo técnico">
          <FactGrid facts={facts} />
        </Section>
      ) : null}

      {!pick && muscleGroups.length > 0 ? (
        <Section icon="body-outline" index={1} title="Músculos que trabaja">
          <MuscleGroups
            groups={muscleGroups}
            onOpen={(code) => router.push(routes.muscle(code))}
          />
        </Section>
      ) : null}

      {data.descripcion ? (
        <Section index={1} title="Descripción">
          <Description text={data.descripcion} />
        </Section>
      ) : null}

      {steps.length > 0 ? (
        <Section index={2} title="Secuencia">
          <StepsTimeline steps={steps} />
        </Section>
      ) : null}

      {/* Consejos y dudas de otras personas. No en el asistente de rutinas:
          ahí la ficha solo sirve para decidir si el ejercicio entra en el día. */}
      {!pick ? <ExerciseCommentsSection exerciseId={data.id} /> : null}

      {!pick && others.length > 0 ? (
        <Section index={4} title="Ejercicios similares">
          {/* Horizontal rail: browsing alternatives should not push the page down. */}
          <ScrollView
            horizontal
            contentContainerStyle={{
              gap: spacing.sm,
              paddingRight: spacing.lg,
            }}
            showsHorizontalScrollIndicator={false}
          >
            {others.map((item) => (
              <PressableScale
                accessibilityLabel={item.nombre}
                key={item.id}
                onPress={() => router.push(routes.exercise(item.id))}
                style={{
                  width: 148,
                  overflow: "hidden",
                  borderRadius: radii.lg,
                  borderCurve: "continuous",
                  borderWidth: 1,
                  borderColor: colors.borderSubtle,
                  backgroundColor: colors.surfaceLow,
                }}
              >
                <ExerciseImage exercise={item} rounded={0} size={148} />
                <Text
                  numberOfLines={2}
                  style={{
                    minHeight: 52,
                    padding: spacing.sm,
                    color: colors.text,
                    fontSize: fontSizes.xs + 1,
                    fontWeight: semibold,
                    lineHeight: 18,
                  }}
                >
                  {item.nombre}
                </Text>
              </PressableScale>
            ))}
          </ScrollView>
        </Section>
      ) : null}
      {pick ? <View style={{ height: PICK_BAR_CLEARANCE }} /> : null}
    </ScrollScreen>
  );
}
