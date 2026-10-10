import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { ScrollView, Text, View } from 'react-native';
import {
  Badge,
  Card,
  Divider,
  Row,
  ScrollScreen,
  ScreenHeader,
  Section,
} from '@/components/layout';
import { ErrorState, Skeleton } from '@/components/feedback';
import { ExerciseDemo, ExerciseImage } from '@/components/media';
import { PressableScale } from '@/components/motion';
import { BackLink } from '@/components/nav';
import { Button } from '@/components/ui';
import { Description, MuscleChip, stepsOf } from '@/features/exercise-detail/detail-parts';
import { ExerciseSocial } from '@/features/exercise-detail/exercise-social';
import { accountService, exerciseService, muscleService } from '@/api/services';
import { colors, fontSizes, radii, semibold, spacing } from '@/theme';

/** Alto reservado al final de la ficha para que el botón fijo no tape el contenido. */
const PICK_BAR_CLEARANCE = 112;

/**
 * Cuando la ficha se abre desde el asistente de rutinas, el botón fijo inferior
 * añade (o quita) el ejercicio del día que se está editando. Sin esto la ficha es
 * la de la pestaña Ejercicios de siempre.
 */
export type DetailPick = { added: boolean; onToggle: () => void };

export function ExerciseDetailView({ id, pick }: { id: string; pick?: DetailPick }) {
  const router = useRouter();

  const exercise = useQuery({
    queryKey: ['exercise', id],
    queryFn: () => exerciseService.get(id),
    enabled: Boolean(id),
  });

  /**
   * El género elige el cuerpo de la demostración. Misma clave que el resto de
   * la app (`['user','me']`), así que se sirve de la caché ya cargada en Perfil
   * en vez de pedir la cuenta otra vez.
   */
  const account = useQuery({
    queryKey: ['user', 'me'],
    queryFn: () => accountService.getMe(),
  });

  // Los músculos con su código canónico: son los que se pueden abrir. Si la
  // consulta falla o aún no llega, la sección simplemente no aparece y quedan
  // los textos de «Objetivo técnico»; no se bloquea nada por ella.
  const muscles = useQuery({
    queryKey: ['exercise', id, 'muscles'],
    queryFn: () => muscleService.forExercise(id),
    enabled: Boolean(id),
    staleTime: 30 * 60 * 1000,
  });

  const group = exercise.data?.grupoMuscular;
  // Same muscle group, minus this exercise: the natural "what else trains
  // this?" question, answered without leaving the screen.
  const similar = useQuery({
    queryKey: ['exercises', 'similar', group],
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
        icon={pick.added ? 'checkmark' : 'add'}
        label={pick.added ? 'Quitar de la rutina' : 'Añadir a la rutina'}
        onPress={pick.onToggle}
        variant={pick.added ? 'ghost' : 'primary'}
      />
    </View>
  ) : undefined;

  if (exercise.isPending) {
    return (
      <ScrollScreen overlay={pickBar}>
        <BackLink />
        <Skeleton height={200} />
        <Skeleton height={120} />
      </ScrollScreen>
    );
  }

  if (exercise.isError) {
    return (
      <ScrollScreen overlay={pickBar}>
        <BackLink />
        <ErrorState error={exercise.error} onRetry={() => void exercise.refetch()} />
      </ScrollScreen>
    );
  }

  const data = exercise.data;
  const steps = stepsOf(data.instructionSteps);
  const others = (similar.data?.items ?? []).filter((item) => item.id !== data.id).slice(0, 10);

  return (
    <ScrollScreen
      onRefresh={() => void exercise.refetch()}
      overlay={pickBar}
      refreshing={exercise.isFetching}
    >
      <BackLink />

      <ExerciseDemo exercise={data} gender={account.data?.genero ?? null} />

      <ScreenHeader subtitle={data.grupoMuscular} title={data.nombre} />

      <ExerciseSocial exercise={data} />

      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm }}>
        {data.bodyPart ? <Badge label={data.bodyPart} tone="success" /> : null}
        {data.tipoEjercicio === 'PERSONAL' ? <Badge label="Personal" tone="warning" /> : null}
      </View>

      {/* Facts as rows, not prose: scannable in a second between sets. */}
      <Section index={0} title="Objetivo técnico">
        <Card>
          <Row label="Músculo objetivo" value={data.targetMuscle ?? '—'} />
          <Divider />
          <Row label="Parte corporal" value={data.bodyPart ?? '—'} />
          <Divider />
          <Row label="Sinergista" value={data.synergistMuscleGroup ?? '—'} />
          {data.secondaryMuscles.length > 0 ? (
            <>
              <Divider />
              <Row label="Secundarios" value={data.secondaryMuscles.join(', ')} />
            </>
          ) : null}
        </Card>
      </Section>

      {!pick &&
      muscles.data &&
      muscles.data.primarios.length +
        muscles.data.secundarios.length +
        muscles.data.estabilizadores.length >
        0 ? (
        <Section icon="body-outline" index={1} title="Músculos que trabaja">
          <Card>
            {(
              [
                ['Principales', muscles.data.primarios, true],
                ['Secundarios', muscles.data.secundarios, false],
                ['Estabilizadores', muscles.data.estabilizadores, false],
              ] as const
            )
              .filter(([, list]) => list.length > 0)
              .map(([label, list, primary], groupIndex) => (
                <View key={label}>
                  {groupIndex > 0 ? <Divider /> : null}
                  <View style={{ gap: spacing.sm, paddingVertical: spacing.xs }}>
                    <Text
                      style={{
                        color: colors.textMuted,
                        fontSize: fontSizes.xs,
                        fontWeight: semibold,
                      }}
                    >
                      {label}
                    </Text>
                    <View
                      style={{
                        flexDirection: 'row',
                        flexWrap: 'wrap',
                        gap: spacing.sm,
                      }}
                    >
                      {list.map((muscle) => (
                        <MuscleChip
                          key={muscle.code}
                          name={muscle.nombre}
                          onPress={() =>
                            router.push({
                              pathname: '/exercises/muscle/[code]',
                              params: { code: muscle.code },
                            })
                          }
                          primary={primary}
                        />
                      ))}
                    </View>
                  </View>
                </View>
              ))}
          </Card>
        </Section>
      ) : null}

      {data.descripcion ? (
        <Section index={1} title="Descripción">
          <Description text={data.descripcion} />
        </Section>
      ) : null}

      {steps.length > 0 ? (
        <Section index={2} title="Secuencia">
          <Card>
            {steps.map((step, index) => (
              <View
                key={`${index}-${step}`}
                style={{
                  flexDirection: 'row',
                  gap: spacing.sm,
                  alignItems: 'flex-start',
                }}
              >
                <View
                  style={{
                    width: 24,
                    height: 24,
                    borderRadius: radii.sm,
                    backgroundColor: colors.surfaceHigh,
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Text
                    style={{
                      color: colors.volt,
                      fontSize: fontSizes.xs,
                      fontWeight: '700',
                      fontVariant: ['tabular-nums'],
                    }}
                  >
                    {index + 1}
                  </Text>
                </View>
                <Text
                  style={{
                    color: colors.text,
                    fontSize: fontSizes.sm,
                    lineHeight: 22,
                    flex: 1,
                  }}
                >
                  {step}
                </Text>
              </View>
            ))}
          </Card>
        </Section>
      ) : null}

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
                onPress={() =>
                  router.push({
                    pathname: '/exercises/[id]',
                    params: { id: item.id },
                  })
                }
                style={{ width: 132, gap: spacing.xs }}
              >
                <ExerciseImage exercise={item} size={132} />
                <Text
                  numberOfLines={2}
                  style={{
                    color: colors.text,
                    fontSize: fontSizes.xs,
                    fontWeight: semibold,
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
