import { useMutation, useQuery } from "@tanstack/react-query";
import { useMemo, useRef, useState } from "react";
import { ScrollView, Text, View } from "react-native";
import { BottomSheet } from "@/components/bottom-sheet";
import { FilterChip } from "@/components/filter-chip";
import { Button, Input } from "@/components/ui";
import { requestId } from "@/lib/request-id";
import { notify } from "@/notifications";
import { colors, fontSizes, radii, semibold, spacing } from "@/theme";
import { trainingInvitationsService } from "./training-invitations-service";
import { localInviteTime } from "./training-invitations-contract";
import {
  DURATION_OPTIONS,
  dayOptions,
  durationLabel,
  localDateValue,
  timeOptions,
} from "./invite-slots";
import { routineService } from "@/api/services";

export function CreateTrainingInviteModal({
  onClose,
  recipientId,
  recipientName,
  visible,
}: Readonly<{
  onClose: () => void;
  recipientId: string;
  recipientName: string;
  visible: boolean;
}>) {
  const days = useMemo(() => dayOptions(new Date()), [visible]);
  const [date, setDate] = useState(() => localDateValue(new Date()));
  const [time, setTime] = useState("");
  const [durationMinutes, setDurationMinutes] = useState(60);
  const times = useMemo(() => timeOptions(date, new Date()), [date, visible]);
  const [placeLabel, setPlaceLabel] = useState("");
  const [note, setNote] = useState("");
  const [mode, setMode] = useState<"OWN_ROUTINES" | "SHARED_SESSION">(
    "OWN_ROUTINES",
  );
  const [routineSessionId, setRoutineSessionId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [created, setCreated] = useState(false);
  const requestIdRef = useRef<string | null>(null);
  const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;
  const routines = useQuery({
    queryKey: ["training-invitations", "own-routines"],
    queryFn: routineService.list,
    enabled: visible && mode === "SHARED_SESSION",
  });
  const duration = durationMinutes;
  const day = days.find((option) => option.value === date) ?? { value: date, label: date, detail: date };

  const create = useMutation({
    mutationFn: () => {
      if (!requestIdRef.current) requestIdRef.current = requestId();
      return trainingInvitationsService.create({
        recipientId,
        startsAt: localInviteTime(date, time, timeZone),
        timeZone,
        durationMinutes: duration,
        place: { kind: "PUBLIC_PLACE", label: placeLabel.trim() },
        mode,
        ...(mode === "SHARED_SESSION" && routineSessionId
          ? { routineSessionId }
          : {}),
        ...(note.trim() ? { note: note.trim() } : {}),
        clientRequestId: requestIdRef.current,
      });
    },
    onSuccess: () => {
      setCreated(true);
      setError(null);
      notify.success(`Invitación enviada a ${recipientName}.`);
    },
    onError: (cause: Error) => setError(cause.message),
  });

  function changed() {
    if (create.isPending) return;
    requestIdRef.current = null;
    setError(null);
    setCreated(false);
  }

  function close() {
    if (create.isPending) return;
    setDate(localDateValue(new Date()));
    setTime("");
    setDurationMinutes(60);
    setPlaceLabel("");
    setNote("");
    setMode("OWN_ROUTINES");
    setRoutineSessionId(null);
    setError(null);
    setCreated(false);
    requestIdRef.current = null;
    onClose();
  }

  const sectionLabel = {
    color: colors.textMuted,
    fontSize: fontSizes.xs,
    fontWeight: semibold,
    textTransform: "uppercase" as const,
    letterSpacing: 0.4,
  };
  const ready =
    Boolean(timeZone) &&
    Boolean(time) &&
    placeLabel.trim().length > 0 &&
    (mode === "OWN_ROUTINES" || Boolean(routineSessionId));

  return (
    <BottomSheet
      onClose={close}
      subtitle={created ? undefined : `Propón a ${recipientName} cuándo y dónde.`}
      title="Entrenemos juntos"
      visible={visible}
    >
      {created ? (
        <View style={{ gap: spacing.md }}>
          <Text
            accessibilityLiveRegion="polite"
            style={{ color: colors.success, fontSize: fontSizes.md }}
          >
            Invitación enviada a {recipientName}. Te avisamos cuando responda.
          </Text>
          <Button label="Listo" onPress={close} />
        </View>
      ) : (
        <>
          <View style={{ gap: spacing.sm }}>
            <Text style={sectionLabel}>Día</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: spacing.xs }}>
              {days.map((option) => (
                <FilterChip
                  accessibilityLabel={option.label === option.detail ? option.label : `${option.label}, ${option.detail}`}
                  key={option.value}
                  label={option.label}
                  onPress={() => {
                    setDate(option.value);
                    setTime("");
                    changed();
                  }}
                  selected={date === option.value}
                  testID={`training-invite-day-${option.value}`}
                />
              ))}
            </ScrollView>
          </View>

          <View style={{ gap: spacing.sm }}>
            <Text style={sectionLabel}>Hora</Text>
            {times.length ? (
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: spacing.xs }}>
                {times.map((slot) => (
                  <FilterChip
                    key={slot}
                    label={slot}
                    onPress={() => {
                      setTime(slot);
                      changed();
                    }}
                    selected={time === slot}
                    testID={`training-invite-time-${slot}`}
                  />
                ))}
              </ScrollView>
            ) : (
              <Text style={{ color: colors.textMuted, fontSize: fontSizes.sm }}>
                Ya es tarde para hoy. Elige mañana u otro día.
              </Text>
            )}
          </View>

          <View style={{ gap: spacing.sm }}>
            <Text style={sectionLabel}>Duración</Text>
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: spacing.xs }}>
              {DURATION_OPTIONS.map((minutes) => (
                <FilterChip
                  key={minutes}
                  label={durationLabel(minutes)}
                  onPress={() => {
                    setDurationMinutes(minutes);
                    changed();
                  }}
                  selected={durationMinutes === minutes}
                />
              ))}
            </View>
          </View>

          <Input
            autoCapitalize="sentences"
            editable={!create.isPending}
            icon="location-outline"
            label="Dónde"
            maxLength={180}
            onChangeText={(value) => {
              setPlaceLabel(value);
              changed();
            }}
            placeholder="Tu gimnasio o un lugar público"
            value={placeLabel}
          />

          <View style={{ gap: spacing.sm }}>
            <Text style={sectionLabel}>Cómo</Text>
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: spacing.xs }}>
              <FilterChip
                label="Cada quien su rutina"
                onPress={() => {
                  setMode("OWN_ROUTINES");
                  setRoutineSessionId(null);
                  changed();
                }}
                selected={mode === "OWN_ROUTINES"}
              />
              <FilterChip
                label="La misma rutina"
                onPress={() => {
                  setMode("SHARED_SESSION");
                  changed();
                }}
                selected={mode === "SHARED_SESSION"}
              />
            </View>
            {mode === "SHARED_SESSION" ? (
              <View style={{ gap: spacing.xs }}>
                {routines.isPending ? (
                  <Text style={{ color: colors.textMuted }}>Cargando tus rutinas…</Text>
                ) : null}
                {routines.isError ? (
                  <Text accessibilityRole="alert" style={{ color: colors.danger }}>
                    No se pudieron cargar tus rutinas.
                  </Text>
                ) : null}
                <View style={{ flexDirection: "row", flexWrap: "wrap", gap: spacing.xs }}>
                  {routines.data?.items.map((routine) => (
                    <FilterChip
                      key={routine.id}
                      label={routine.nombre}
                      onPress={() => {
                        setRoutineSessionId(routine.id);
                        changed();
                      }}
                      selected={routineSessionId === routine.id}
                      testID={`training-shared-routine-${routine.id}`}
                    />
                  ))}
                </View>
                {routines.isSuccess && routines.data.items.length === 0 ? (
                  <Text style={{ color: colors.textMuted }}>Crea una rutina antes de compartirla.</Text>
                ) : null}
              </View>
            ) : null}
          </View>

          <Input
            editable={!create.isPending}
            label="Mensaje (opcional)"
            maxLength={1000}
            onChangeText={(value) => {
              setNote(value);
              changed();
            }}
            placeholder="¿Qué te gustaría entrenar?"
            value={note}
          />

          {error ? (
            <Text accessibilityLiveRegion="assertive" style={{ color: colors.danger, fontSize: fontSizes.sm }}>
              {error}
            </Text>
          ) : null}
          <View
            style={{
              gap: spacing.sm,
              padding: spacing.md,
              borderRadius: radii.md,
              backgroundColor: colors.surfaceHigh,
            }}
          >
            <Text style={{ color: colors.text, fontSize: fontSizes.md, fontWeight: semibold }}>
              {time
                ? `${day.label === day.detail ? day.label : `${day.label} (${day.detail})`} · ${time} · ${durationLabel(duration)}`
                : "Elige día y hora"}
            </Text>
            {placeLabel.trim() ? (
              <Text style={{ color: colors.textMuted, fontSize: fontSizes.sm }}>{placeLabel.trim()}</Text>
            ) : null}
            <Button
              disabled={!ready}
              icon="barbell-outline"
              label="Enviar invitación"
              loading={create.isPending}
              onPress={() => {
                setError(null);
                create.mutate();
              }}
              testID="training-invite-send"
            />
          </View>
        </>
      )}
    </BottomSheet>
  );
}
