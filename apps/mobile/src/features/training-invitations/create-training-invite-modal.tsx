import { useMutation, useQuery } from "@tanstack/react-query";
import { useRef, useState } from "react";
import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  Text,
  View,
} from "react-native";
import { Button, Input } from "@/components/ui";
import { requestId } from "@/lib/request-id";
import { notify } from "@/notifications";
import { colors, fontSizes, radii, semibold, spacing } from "@/theme";
import { trainingInvitationsService } from "./training-invitations-service";
import { localInviteTime } from "./training-invitations-contract";
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
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [durationMinutes, setDurationMinutes] = useState("60");
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
  const duration = Number(durationMinutes);
  const durationIsValid =
    Number.isInteger(duration) && duration >= 15 && duration <= 360;

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
    setDate("");
    setTime("");
    setDurationMinutes("60");
    setPlaceLabel("");
    setNote("");
    setMode("OWN_ROUTINES");
    setRoutineSessionId(null);
    setError(null);
    setCreated(false);
    requestIdRef.current = null;
    onClose();
  }

  return (
    <Modal
      animationType="slide"
      onRequestClose={close}
      transparent
      visible={visible}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={{
          flex: 1,
          justifyContent: "flex-end",
          backgroundColor: colors.background,
        }}
      >
        <Pressable
          accessibilityLabel="Cerrar invitación"
          accessibilityRole="button"
          disabled={create.isPending}
          onPress={close}
          style={{ flex: 1 }}
        />
        <View
          style={{
            maxHeight: "88%",
            borderTopLeftRadius: radii.xl,
            borderTopRightRadius: radii.xl,
            backgroundColor: colors.surface,
            paddingTop: spacing.lg,
            paddingHorizontal: spacing.lg,
            paddingBottom: spacing.lg,
          }}
        >
          <ScrollView
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={{
              gap: spacing.md,
              paddingBottom: spacing.sm,
            }}
          >
            <Text
              accessibilityRole="header"
              style={{
                color: colors.text,
                fontSize: fontSizes.lg,
                fontWeight: semibold,
              }}
            >
              Invitar a entrenar
            </Text>
            <Text
              style={{
                color: colors.textMuted,
                fontSize: fontSizes.sm,
                lineHeight: 21,
              }}
            >
              Propón una sesión a {recipientName}. La invitación se envía solo
              si la conexión sigue activa.
            </Text>
            {created ? (
              <>
                <Text
                  accessibilityLiveRegion="polite"
                  style={{ color: colors.success, fontSize: fontSizes.md }}
                >
                  Invitación enviada a {recipientName}.
                </Text>
                <Button label="Listo" onPress={close} />
              </>
            ) : (
              <>
                <Input
                  accessibilityLabel="Fecha (AAAA-MM-DD)"
                  autoCapitalize="none"
                  editable={!create.isPending}
                  keyboardType="numbers-and-punctuation"
                  label="Fecha (AAAA-MM-DD)"
                  onChangeText={(value) => {
                    setDate(value);
                    changed();
                  }}
                  placeholder="2030-06-02"
                  returnKeyType="next"
                  value={date}
                />
                <Input
                  accessibilityLabel="Hora local (HH:mm)"
                  editable={!create.isPending}
                  keyboardType="numbers-and-punctuation"
                  label={`Hora local (HH:mm) · ${timeZone || "zona desconocida"}`}
                  onChangeText={(value) => {
                    setTime(value);
                    changed();
                  }}
                  placeholder="14:30"
                  returnKeyType="next"
                  value={time}
                />
                <Input
                  accessibilityLabel="Duración en minutos"
                  editable={!create.isPending}
                  keyboardType="number-pad"
                  label="Duración en minutos (15–360)"
                  onChangeText={(value) => {
                    setDurationMinutes(value);
                    changed();
                  }}
                  value={durationMinutes}
                />
                <Input
                  accessibilityLabel="Lugar público"
                  autoCapitalize="sentences"
                  editable={!create.isPending}
                  label="Lugar público"
                  maxLength={180}
                  onChangeText={(value) => {
                    setPlaceLabel(value);
                    changed();
                  }}
                  placeholder="Ej. Parque Central"
                  value={placeLabel}
                />
                <Text
                  style={{
                    color: colors.text,
                    fontSize: fontSizes.sm,
                    fontWeight: semibold,
                  }}
                >
                  Tipo de entrenamiento
                </Text>
                <Button
                  label={
                    mode === "OWN_ROUTINES"
                      ? "Cada quien con su rutina · seleccionado"
                      : "Cada quien con su rutina"
                  }
                  onPress={() => {
                    setMode("OWN_ROUTINES");
                    setRoutineSessionId(null);
                    changed();
                  }}
                  variant={mode === "OWN_ROUTINES" ? "primary" : "ghost"}
                />
                <Button
                  label={
                    mode === "SHARED_SESSION"
                      ? "Compartir una rutina · seleccionado"
                      : "Compartir una rutina"
                  }
                  onPress={() => {
                    setMode("SHARED_SESSION");
                    changed();
                  }}
                  variant={mode === "SHARED_SESSION" ? "primary" : "ghost"}
                />
                {mode === "SHARED_SESSION" ? (
                  <View style={{ gap: spacing.sm }}>
                    <Text
                      style={{
                        color: colors.textMuted,
                        fontSize: fontSizes.sm,
                      }}
                    >
                      Se compartirá solo la estructura acordada. Cada persona
                      conserva sus propios pesos y progreso.
                    </Text>
                    {routines.isPending ? (
                      <Text style={{ color: colors.textMuted }}>
                        Cargando tus rutinas…
                      </Text>
                    ) : null}
                    {routines.isError ? (
                      <Text
                        accessibilityRole="alert"
                        style={{ color: colors.danger }}
                      >
                        No se pudieron cargar tus rutinas.
                      </Text>
                    ) : null}
                    {routines.data?.items.map((routine) => (
                      <Button
                        key={routine.id}
                        label={`${routine.nombre}${routineSessionId === routine.id ? " · seleccionada" : ""}`}
                        onPress={() => {
                          setRoutineSessionId(routine.id);
                          changed();
                        }}
                        testID={`training-shared-routine-${routine.id}`}
                        variant={
                          routineSessionId === routine.id ? "primary" : "ghost"
                        }
                      />
                    ))}
                    {routines.isSuccess && routines.data.items.length === 0 ? (
                      <Text style={{ color: colors.textMuted }}>
                        Crea una rutina antes de compartirla.
                      </Text>
                    ) : null}
                  </View>
                ) : null}
                <Input
                  accessibilityLabel="Nota opcional"
                  editable={!create.isPending}
                  label="Nota (opcional)"
                  maxLength={1000}
                  multiline
                  onChangeText={(value) => {
                    setNote(value);
                    changed();
                  }}
                  placeholder="¿Qué te gustaría entrenar?"
                  style={{ minHeight: 84, textAlignVertical: "top" }}
                  value={note}
                />
                {error ? (
                  <Text
                    accessibilityLiveRegion="assertive"
                    style={{ color: colors.danger, fontSize: fontSizes.sm }}
                  >
                    {error}
                  </Text>
                ) : null}
                <Button
                  disabled={
                    !timeZone ||
                    !date ||
                    !time ||
                    !placeLabel.trim() ||
                    !durationIsValid ||
                    (mode === "SHARED_SESSION" && !routineSessionId)
                  }
                  label="Enviar invitación"
                  loading={create.isPending}
                  onPress={() => {
                    setError(null);
                    create.mutate();
                  }}
                />
                <Button label="Cancelar" onPress={close} variant="ghost" />
              </>
            )}
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}
