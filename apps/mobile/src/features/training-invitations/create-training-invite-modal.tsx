import { Ionicons } from "@expo/vector-icons";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useMemo, useRef, useState } from "react";
import { ScrollView, Text, View } from "react-native";
import { BottomSheet } from "@/components/bottom-sheet";
import { FilterChip } from "@/components/filter-chip";
import { PressableScale } from "@/components/motion";
import { StepProgress, type FlowStep } from "@/components/step-flow";
import { Button, Input } from "@/components/ui";
import { PlacePicker, placeLabel, type PickedPlace } from "@/features/place-picker/place-picker";
import { requestId } from "@/lib/request-id";
import { notify } from "@/notifications";
import { colors, fontSizes, iconSizes, minTouchTarget, radii, semibold, spacing } from "@/theme";
import { trainingInvitationsService } from "./training-invitations-service";
import { localInviteTime } from "./training-invitations-contract";
import { InviteTimePicker } from "./invite-time-picker";
import {
  DURATION_OPTIONS,
  dayOptions,
  durationLabel,
  firstAvailableTime,
  isTimeAvailable,
  localDateValue,
} from "./invite-slots";
import { routineService } from "@/api/services";

type Mode = "OWN_ROUTINES" | "SHARED_SESSION";
type IconName = keyof typeof Ionicons.glyphMap;

const STEPS: readonly FlowStep[] = [
  { label: "Cuándo", icon: "calendar-outline" },
  { label: "Dónde", icon: "location-outline" },
  { label: "Cómo", icon: "people-outline" },
  { label: "Enviar", icon: "paper-plane-outline" },
];

const MODES: readonly { value: Mode; title: string; detail: string; icon: IconName }[] = [
  { value: "OWN_ROUTINES", title: "Cada quien su rutina", detail: "Coinciden en el gym, cada uno a lo suyo", icon: "git-branch-outline" },
  { value: "SHARED_SESSION", title: "La misma rutina", detail: "Eliges una de tus rutinas y la hacen juntos", icon: "git-merge-outline" },
];

/** Días con al menos una hora libre: si ya es tarde, «Hoy» no se ofrece. */
function bookableDays(now: Date) {
  return dayOptions(now, 14).filter((day) => firstAvailableTime(day.value, now) !== null);
}

function SectionTitle({ icon, children }: { icon: IconName; children: string }) {
  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: spacing.xs }}>
      <Ionicons color={colors.textSecondary} name={icon} size={iconSizes.sm} />
      <Text style={{ color: colors.textSecondary, fontSize: fontSizes.sm, fontWeight: semibold }}>{children}</Text>
    </View>
  );
}

function SummaryRow({ icon, label, value, onPress }: { icon: IconName; label: string; value: string; onPress: () => void }) {
  return (
    <PressableScale accessibilityHint="Cambiar" accessibilityLabel={`${label}: ${value}`} haptic="selection" onPress={onPress}>
      <View style={{ minHeight: minTouchTarget, flexDirection: "row", alignItems: "center", gap: spacing.md, paddingVertical: spacing.sm }}>
        <View style={{ width: 36, height: 36, borderRadius: radii.full, alignItems: "center", justifyContent: "center", backgroundColor: colors.surfaceHighest }}>
          <Ionicons color={colors.text} name={icon} size={iconSizes.sm} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={{ color: colors.textMuted, fontSize: fontSizes.xs }}>{label}</Text>
          <Text numberOfLines={2} style={{ color: colors.text, fontSize: fontSizes.md, fontWeight: semibold }}>{value}</Text>
        </View>
        <Ionicons color={colors.textMuted} name="pencil" size={iconSizes.sm} />
      </View>
    </PressableScale>
  );
}

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
  // Se recalcula al abrir: la hoja puede quedar montada de un día para otro.
  const now = useMemo(() => new Date(), [visible]);
  const days = useMemo(() => bookableDays(now), [now]);
  const [step, setStep] = useState(0);
  const [date, setDate] = useState(() => days[0]?.value ?? localDateValue(now));
  const [time, setTime] = useState(() => firstAvailableTime(days[0]?.value ?? localDateValue(now), now) ?? "07:00");
  const [durationMinutes, setDurationMinutes] = useState(60);
  const [place, setPlace] = useState<PickedPlace | null>(null);
  const [note, setNote] = useState("");
  const [mode, setMode] = useState<Mode>("OWN_ROUTINES");
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
  const day = days.find((option) => option.value === date) ?? { value: date, label: date, detail: date };
  const routineName = routines.data?.items.find((routine) => routine.id === routineSessionId)?.nombre;
  const label = place ? placeLabel(place) : "";

  const create = useMutation({
    mutationFn: () => {
      if (!requestIdRef.current) requestIdRef.current = requestId();
      return trainingInvitationsService.create({
        recipientId,
        startsAt: localInviteTime(date, time, timeZone),
        timeZone,
        durationMinutes,
        place: { kind: "PUBLIC_PLACE", label },
        mode,
        ...(mode === "SHARED_SESSION" && routineSessionId ? { routineSessionId } : {}),
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
    const first = days[0]?.value ?? localDateValue(new Date());
    setStep(0);
    setDate(first);
    setTime(firstAvailableTime(first, new Date()) ?? "07:00");
    setDurationMinutes(60);
    setPlace(null);
    setNote("");
    setMode("OWN_ROUTINES");
    setRoutineSessionId(null);
    setError(null);
    setCreated(false);
    requestIdRef.current = null;
    onClose();
  }

  const whenReady = Boolean(timeZone) && isTimeAvailable(date, time, new Date());
  const whereReady = label.length >= 2 && place?.label !== "Buscando la dirección…";
  const howReady = mode === "OWN_ROUTINES" || Boolean(routineSessionId);
  const stepReady = [whenReady, whereReady, howReady, whenReady && whereReady && howReady][step];
  const blocker = [
    "Esa hora ya pasó: elige otra",
    "Elige un gimnasio o un punto en el mapa",
    "Elige la rutina que harán juntos",
    "",
  ][step];
  const whenText = `${day.label === day.detail ? day.label : `${day.label} (${day.detail})`} · ${time} · ${durationLabel(durationMinutes)}`;

  const footer = created ? null : (
    <View style={{ gap: spacing.xs }}>
      {!stepReady && blocker ? (
        <Text accessibilityLiveRegion="polite" style={{ color: colors.textMuted, fontSize: fontSizes.xs, textAlign: "center" }}>{blocker}</Text>
      ) : null}
      <View style={{ flexDirection: "row", gap: spacing.sm }}>
        {step > 0 ? (
          <Button icon="chevron-back" label="Atrás" onPress={() => setStep(step - 1)} style={{ flex: 1 }} variant="ghost" />
        ) : null}
        {step < STEPS.length - 1 ? (
          <Button disabled={!stepReady} label="Siguiente" onPress={() => setStep(step + 1)} style={{ flex: 2 }} testID="training-invite-next" />
        ) : (
          <Button
            disabled={!stepReady}
            icon="paper-plane-outline"
            label="Enviar invitación"
            loading={create.isPending}
            onPress={() => {
              setError(null);
              create.mutate();
            }}
            style={{ flex: 2 }}
            testID="training-invite-send"
          />
        )}
      </View>
    </View>
  );

  return (
    <BottomSheet
      footer={footer}
      onClose={close}
      subtitle={created ? undefined : `Propón a ${recipientName} cuándo y dónde.`}
      title="Entrenemos juntos"
      visible={visible}
    >
      {created ? (
        <View style={{ gap: spacing.md, alignItems: "center", paddingVertical: spacing.lg }}>
          <Ionicons color={colors.success} name="checkmark-circle" size={56} />
          <Text accessibilityLiveRegion="polite" style={{ color: colors.text, fontSize: fontSizes.md, textAlign: "center" }}>
            Invitación enviada a {recipientName}. Te avisamos cuando responda.
          </Text>
          <Button label="Listo" onPress={close} style={{ alignSelf: "stretch" }} />
        </View>
      ) : (
        <>
          <StepProgress current={step} steps={STEPS} />

          {step === 0 ? (
            <>
              <View style={{ gap: spacing.sm }}>
                <SectionTitle icon="calendar-outline">Día</SectionTitle>
                <ScrollView contentContainerStyle={{ gap: spacing.xs }} horizontal showsHorizontalScrollIndicator={false}>
                  {days.map((option) => {
                    const selected = date === option.value;
                    const [weekday, number] = option.detail.split(" ");
                    return (
                      <PressableScale
                        accessibilityLabel={option.label === option.detail ? option.label : `${option.label}, ${option.detail}`}
                        accessibilityState={{ selected }}
                        haptic="selection"
                        key={option.value}
                        onPress={() => {
                          setDate(option.value);
                          if (!isTimeAvailable(option.value, time, new Date())) setTime(firstAvailableTime(option.value, new Date()) ?? time);
                          changed();
                        }}
                        scaleTo={0.96}
                        testID={`training-invite-day-${option.value}`}
                      >
                        <View style={{ width: 60, minHeight: 72, alignItems: "center", justifyContent: "center", gap: 2, borderRadius: radii.md, backgroundColor: selected ? colors.text : colors.surfaceHigh }}>
                          <Text style={{ color: selected ? colors.background : colors.textMuted, fontSize: fontSizes.xs, fontWeight: semibold }}>
                            {option.label === option.detail ? weekday : option.label}
                          </Text>
                          <Text style={{ color: selected ? colors.background : colors.text, fontSize: fontSizes.lg, fontWeight: semibold }}>{number}</Text>
                        </View>
                      </PressableScale>
                    );
                  })}
                </ScrollView>
              </View>

              <View style={{ gap: spacing.sm }}>
                <SectionTitle icon="time-outline">Hora</SectionTitle>
                <InviteTimePicker date={date} now={new Date()} onChange={(next) => { setTime(next); changed(); }} value={time} />
              </View>

              <View style={{ gap: spacing.sm }}>
                <SectionTitle icon="hourglass-outline">Duración</SectionTitle>
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
            </>
          ) : null}

          {step === 1 ? (
            <View style={{ gap: spacing.sm }}>
              <SectionTitle icon="location-outline">Dónde entrenan</SectionTitle>
              <PlacePicker onChange={(next) => { setPlace(next); changed(); }} value={place} />
              {place ? (
                <View style={{ flexDirection: "row", alignItems: "center", gap: spacing.sm, padding: spacing.sm, borderRadius: radii.md, backgroundColor: colors.surfaceHigh }}>
                  <Ionicons color={colors.text} name={place.kind === "GYM" ? "barbell" : place.kind === "POINT" ? "pin" : "create-outline"} size={iconSizes.sm} />
                  <Text numberOfLines={2} style={{ flex: 1, color: colors.text, fontSize: fontSizes.sm, fontWeight: semibold }}>{label}</Text>
                </View>
              ) : null}
            </View>
          ) : null}

          {step === 2 ? (
            <>
              <View style={{ gap: spacing.sm }}>
                <SectionTitle icon="people-outline">Cómo entrenan</SectionTitle>
                {MODES.map((option) => {
                  const selected = mode === option.value;
                  return (
                    <PressableScale
                      accessibilityLabel={option.title}
                      accessibilityRole="radio"
                      accessibilityState={{ selected }}
                      haptic="selection"
                      key={option.value}
                      onPress={() => {
                        setMode(option.value);
                        if (option.value === "OWN_ROUTINES") setRoutineSessionId(null);
                        changed();
                      }}
                    >
                      <View style={{ flexDirection: "row", alignItems: "center", gap: spacing.md, padding: spacing.md, borderRadius: radii.lg, borderWidth: 1, borderColor: selected ? colors.text : colors.border, backgroundColor: colors.surfaceHigh }}>
                        <View style={{ width: 40, height: 40, borderRadius: radii.full, alignItems: "center", justifyContent: "center", backgroundColor: selected ? colors.text : colors.surfaceHighest }}>
                          <Ionicons color={selected ? colors.background : colors.text} name={option.icon} size={iconSizes.md} />
                        </View>
                        <View style={{ flex: 1, gap: 2 }}>
                          <Text style={{ color: colors.text, fontSize: fontSizes.md, fontWeight: semibold }}>{option.title}</Text>
                          <Text style={{ color: colors.textMuted, fontSize: fontSizes.sm }}>{option.detail}</Text>
                        </View>
                        <Ionicons color={selected ? colors.text : colors.textMuted} name={selected ? "radio-button-on" : "radio-button-off"} size={iconSizes.md} />
                      </View>
                    </PressableScale>
                  );
                })}
                {mode === "SHARED_SESSION" ? (
                  <View style={{ gap: spacing.xs }}>
                    {routines.isPending ? <Text style={{ color: colors.textMuted }}>Cargando tus rutinas…</Text> : null}
                    {routines.isError ? (
                      <Text accessibilityRole="alert" style={{ color: colors.danger }}>No se pudieron cargar tus rutinas.</Text>
                    ) : null}
                    <View style={{ flexDirection: "row", flexWrap: "wrap", gap: spacing.xs }}>
                      {routines.data?.items.map((routine) => (
                        <FilterChip
                          icon="barbell-outline"
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
                icon="chatbubble-ellipses-outline"
                label="Mensaje (opcional)"
                maxLength={1000}
                onChangeText={(value) => {
                  setNote(value);
                  changed();
                }}
                placeholder="¿Qué te gustaría entrenar?"
                value={note}
              />
            </>
          ) : null}

          {step === 3 ? (
            <View style={{ paddingHorizontal: spacing.md, paddingVertical: spacing.xs, borderRadius: radii.lg, backgroundColor: colors.surfaceHigh }}>
              <SummaryRow icon="calendar-outline" label="Cuándo" onPress={() => setStep(0)} value={whenText} />
              <SummaryRow icon="location-outline" label="Dónde" onPress={() => setStep(1)} value={label || "Sin lugar"} />
              <SummaryRow
                icon="people-outline"
                label="Cómo"
                onPress={() => setStep(2)}
                value={mode === "OWN_ROUTINES" ? "Cada quien su rutina" : `La misma rutina${routineName ? `: ${routineName}` : ""}`}
              />
              {note.trim() ? <SummaryRow icon="chatbubble-ellipses-outline" label="Mensaje" onPress={() => setStep(2)} value={note.trim()} /> : null}
            </View>
          ) : null}

          {error ? (
            <Text accessibilityLiveRegion="assertive" style={{ color: colors.danger, fontSize: fontSizes.sm }}>
              {error}
            </Text>
          ) : null}
        </>
      )}
    </BottomSheet>
  );
}
