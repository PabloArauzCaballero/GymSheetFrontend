import { Ionicons } from '@expo/vector-icons';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { Text, View } from 'react-native';
import { z } from 'zod';
import { muscleCatalogSchema } from '@gymsheet/schemas';
import { apiClient } from '@/api/client';
import { personalExerciseService } from '@/api/services';
import { BackLink } from '@/components/nav';
import { ErrorState, Skeleton } from '@/components/feedback';
import { Card, ScreenHeader, ScrollScreen, Section } from '@/components/layout';
import { PressableScale } from '@/components/motion';
import { notify } from '@/notifications';
import { Button, Input } from '@/components/ui';
import { colors, fontSizes, iconSizes, radii, semibold, spacing } from '@/theme';

const muscleCatalogService = {
  list: () => apiClient.request('/muscles', muscleCatalogSchema, { method: 'GET' }),
};

const nameSchema = z.string().trim().min(2).max(160);

/**
 * Nuevo ejercicio propio: eliges el músculo, la máquina la pone el catálogo.
 *
 * Es la forma corta a propósito. El formulario largo —grupo muscular, parte
 * corporal, músculo objetivo, equipamiento— existe en el portal web para quien
 * quiera afinarlo; aquí se pide lo único que la persona sabe con certeza, qué
 * quiere entrenar, y el servidor deduce el resto contra el catálogo real.
 *
 * La deducción no se hace en el teléfono: sale de contar con qué se entrena ese
 * músculo en los ejercicios que ya existen. Una tabla músculo→máquina metida en
 * la aplicación sería una opinión, y quedaría desfasada en cuanto el catálogo
 * se sincronizara con su origen.
 */
export default function NuevoEjercicioScreen() {
  const router = useRouter();
  const queryClient = useQueryClient();

  const [name, setName] = useState('');
  const [muscleCode, setMuscleCode] = useState<string | null>(null);
  /** Etiqueta elegida a mano. Nula = se acepta la que propone el catálogo. */
  const [equipmentLabel, setEquipmentLabel] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);

  const muscles = useQuery({
    queryKey: ['muscles', 'catalog'],
    queryFn: muscleCatalogService.list,
    // El catálogo anatómico no cambia entre visitas.
    staleTime: 60 * 60 * 1000,
  });

  const inference = useQuery({
    queryKey: ['equipment-suggestion', muscleCode],
    queryFn: () => personalExerciseService.suggestEquipment(muscleCode ?? ''),
    enabled: muscleCode !== null,
  });

  const create = useMutation({
    mutationFn: () =>
      personalExerciseService.create({
        nombre: name.trim(),
        muscleCode: muscleCode ?? '',
        ...(equipmentLabel ? { equipmentLabel } : {}),
      }),
    onSuccess: async (created) => {
      await queryClient.invalidateQueries({ queryKey: ['exercises'] });
      notify.success('Ejercicio creado.');
      router.replace({ pathname: '/exercises/[id]', params: { id: created.id } });
    },
    onError: (error: Error) => notify.error(error.message),
  });

  /** Agrupados por región: una lista plana de 36 músculos no se recorre. */
  const grouped = useMemo(() => {
    const byGroup = new Map<string, { code: string; nombre: string }[]>();
    for (const muscle of muscles.data ?? []) {
      const bucket = byGroup.get(muscle.grupo.nombre) ?? [];
      bucket.push({ code: muscle.code, nombre: muscle.nombre });
      byGroup.set(muscle.grupo.nombre, bucket);
    }
    return [...byGroup.entries()];
  }, [muscles.data]);

  const suggestion = inference.data;
  const chosen =
    (equipmentLabel
      ? [suggestion?.primary, ...(suggestion?.alternatives ?? [])].find(
          (option) => option?.label === equipmentLabel,
        )
      : suggestion?.primary) ?? suggestion?.primary;

  const nameError = submitted && !nameSchema.safeParse(name).success;
  const muscleError = submitted && muscleCode === null;

  function submit() {
    setSubmitted(true);
    if (!nameSchema.safeParse(name).success || muscleCode === null) return;
    create.mutate();
  }

  return (
    <ScrollScreen>
      <BackLink />
      <ScreenHeader
        subtitle="Dinos qué músculo trabaja y completamos el resto."
        title="Nuevo ejercicio"
      />

      <Section icon="create-outline" index={0} title="Nombre">
        <Card>
          <Input
            autoCapitalize="sentences"
            error={nameError ? 'Usa al menos 2 caracteres.' : undefined}
            label="¿Cómo lo llamas?"
            onChangeText={setName}
            placeholder={suggestion?.suggestedName ?? 'Ej. Mi press inclinado'}
            value={name}
          />
          {name.trim() === '' && suggestion?.suggestedName ? (
            <PressableScale
              accessibilityLabel={`Usar el nombre sugerido: ${suggestion.suggestedName}`}
              onPress={() => setName(suggestion.suggestedName ?? '')}
            >
              <Text style={{ color: colors.accentInk, fontSize: fontSizes.sm }}>
                {`Usar «${suggestion.suggestedName}»`}
              </Text>
            </PressableScale>
          ) : null}
        </Card>
      </Section>

      <Section icon="body-outline" index={1} title="Músculo entrenado">
        {muscles.isPending ? (
          <Skeleton height={180} />
        ) : muscles.isError ? (
          <ErrorState error={muscles.error} onRetry={() => void muscles.refetch()} />
        ) : (
          <Card>
            {muscleError ? (
              <Text style={{ color: colors.danger, fontSize: fontSizes.sm }}>
                Elige el músculo que trabaja el ejercicio.
              </Text>
            ) : null}
            {grouped.map(([groupName, entries]) => (
              <View key={groupName} style={{ gap: spacing.sm }}>
                <Text
                  style={{
                    color: colors.textMuted,
                    fontSize: fontSizes.xs,
                    fontWeight: semibold,
                    letterSpacing: fontSizes.xs * 0.1,
                    textTransform: 'uppercase',
                  }}
                >
                  {groupName}
                </Text>
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs }}>
                  {entries.map((muscle) => {
                    const active = muscle.code === muscleCode;
                    return (
                      <PressableScale
                        accessibilityLabel={muscle.nombre}
                        key={muscle.code}
                        onPress={() => {
                          setMuscleCode(muscle.code);
                          // La elección manual de máquina pertenece al músculo
                          // anterior; conservarla propondría un equipamiento que
                          // el nuevo músculo quizá ni use.
                          setEquipmentLabel(null);
                        }}
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
                          {muscle.nombre}
                        </Text>
                      </PressableScale>
                    );
                  })}
                </View>
              </View>
            ))}
          </Card>
        )}
      </Section>

      {muscleCode === null ? null : (
        <Section icon="cog-outline" index={2} title="Máquina determinada">
          {inference.isPending ? (
            <Skeleton height={120} />
          ) : inference.isError ? (
            <ErrorState error={inference.error} onRetry={() => void inference.refetch()} />
          ) : !chosen ? (
            // No se inventa una máquina: se dice que no hay dato. Es
            // información honesta y no un error.
            <Card>
              <Text style={{ color: colors.textMuted, fontSize: fontSizes.sm, lineHeight: 20 }}>
                Ese músculo todavía no tiene ejercicios en el catálogo, así que no podemos deducir
                la máquina. Puedes crear el ejercicio igual y ajustarlo después desde la web.
              </Text>
            </Card>
          ) : (
            <Card>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md }}>
                <Ionicons color={colors.accentInk} name="cog-outline" size={iconSizes.xl} />
                <View style={{ flex: 1, gap: 2 }}>
                  <Text
                    style={{
                      color: colors.text,
                      fontSize: fontSizes.lg,
                      fontWeight: semibold,
                      letterSpacing: fontSizes.lg * -0.045,
                    }}
                  >
                    {chosen.name}
                  </Text>
                  <Text style={{ color: colors.textMuted, fontSize: fontSizes.sm, lineHeight: 20 }}>
                    {`Lo usan ${chosen.exerciseCount} ejercicios del catálogo para ${suggestion?.muscleName.toLowerCase()} (${Math.round(chosen.share * 100)} %).`}
                  </Text>
                </View>
              </View>

              {(suggestion?.alternatives.length ?? 0) > 0 ? (
                <View style={{ gap: spacing.sm }}>
                  <Text style={{ color: colors.textMuted, fontSize: fontSizes.xs }}>
                    O elige otra:
                  </Text>
                  <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs }}>
                    {[suggestion?.primary, ...(suggestion?.alternatives ?? [])]
                      .filter((option) => option !== null && option !== undefined)
                      .map((option) => {
                        const active = option.label === chosen.label;
                        return (
                          <PressableScale
                            accessibilityLabel={option.name}
                            key={option.label}
                            onPress={() => setEquipmentLabel(option.label)}
                            style={{
                              paddingHorizontal: spacing.md,
                              paddingVertical: spacing.xs,
                              borderRadius: radii.full,
                              borderWidth: 1,
                              borderColor: active ? colors.volt : colors.border,
                              backgroundColor: active ? colors.surfaceHigh : colors.surfaceLow,
                            }}
                          >
                            <Text
                              style={{
                                color: active ? colors.text : colors.textMuted,
                                fontSize: fontSizes.xs,
                              }}
                            >
                              {option.name}
                            </Text>
                          </PressableScale>
                        );
                      })}
                  </View>
                </View>
              ) : null}
            </Card>
          )}
        </Section>
      )}

      <Button label="Crear ejercicio" loading={create.isPending} onPress={submit} />
    </ScrollScreen>
  );
}
