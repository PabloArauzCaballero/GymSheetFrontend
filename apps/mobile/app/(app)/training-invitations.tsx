import { useCallback, useRef } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ApiError } from "@gymsheet/api-client";
import { useFocusEffect } from "expo-router";
import { Alert, Linking, Text, View } from "react-native";
import { BackLink } from "@/components/nav";
import { Card, ScreenHeader, ScrollScreen, Section } from "@/components/layout";
import { EmptyState, ErrorState, Skeleton } from "@/components/feedback";
import { Button } from "@/components/ui";
import { requestId } from "@/lib/request-id";
import { notify } from "@/notifications";
import { useAuthStore } from "@/state/auth-store";
import { colors, fontSizes, radii, semibold, spacing } from "@/theme";
import {
  formatInvitationLocalTime,
  groupTrainingInvitations,
  type ListedTrainingInvitation,
  type RespondTrainingInviteInput,
} from "@/features/training-invitations/training-invitations-contract";
import { trainingInvitationsService } from "@/features/training-invitations/training-invitations-service";
import { shareTrainingInvitationCalendar } from "@/features/training-invitations/calendar-ics";
import { trainingPlaceMapUrl } from "@/features/training-invitations/place-maps";

const queryKey = ["training-invitations", "me"] as const;

function stateLabel(invitation: ListedTrainingInvitation): string {
  if (invitation.state === "ACCEPTED" && !invitation.meeting?.cancelledAt)
    return "Confirmado";
  if (invitation.state === "CANCELLED" || invitation.meeting?.cancelledAt)
    return "Cancelado";
  if (invitation.state === "EXPIRED") return "Vencido";
  if (invitation.state === "DECLINED") return "Rechazado";
  return "Pendiente";
}

function InvitationCard({
  invitation,
  userId,
  responding,
  exporting,
  onRespond,
  onExport,
}: Readonly<{
  invitation: ListedTrainingInvitation;
  userId: string;
  responding: boolean;
  exporting: boolean;
  onRespond: (
    invitation: ListedTrainingInvitation,
    decision: RespondTrainingInviteInput["decision"],
  ) => void;
  onExport: (invitation: ListedTrainingInvitation) => void;
}>) {
  // El backend devuelve la revisión vigente primero. Nunca se acepta una
  // revisión guardada de una lectura anterior sin enviar expectedRevision.
  const revision = invitation.revisions[0]!;
  const received = invitation.participants[1] === userId;
  // Una contrapropuesta invierte el turno: quien creó la invitación puede
  // aceptar si la revisión vigente la propuso la otra persona.
  const canAccept =
    invitation.participants.includes(userId) &&
    invitation.state === "PENDING" &&
    revision.proposerId !== userId;
  const startsAt = invitation.meeting?.startsAt ?? revision.startsAt;
  const placeLabel = invitation.meeting?.placeLabel ?? revision.place.label;
  const sharedSession = useQuery({
    queryKey: ["training-invitation-shared-session", userId, invitation.id],
    queryFn: () => trainingInvitationsService.sharedSession(invitation.id),
    enabled:
      Boolean(userId) &&
      invitation.state === "ACCEPTED" &&
      Boolean(invitation.meeting) &&
      !invitation.meeting?.cancelledAt &&
      revision.mode === "SHARED_SESSION",
  });
  const openPlace = () => {
    void Linking.openURL(trainingPlaceMapUrl(placeLabel)).catch(() =>
      notify.error("No se pudo abrir la aplicación de mapas."),
    );
  };

  return (
    <Card>
      <View
        style={{
          flexDirection: "row",
          justifyContent: "space-between",
          gap: spacing.sm,
        }}
      >
        <Text
          style={{
            flex: 1,
            color: colors.text,
            fontSize: fontSizes.md,
            fontWeight: semibold,
          }}
        >
          {received ? "Invitación recibida" : "Invitación enviada"}
        </Text>
        <Text style={{ color: colors.textMuted, fontSize: fontSizes.sm }}>
          {stateLabel(invitation)}
        </Text>
      </View>
      <Text style={{ color: colors.text, fontSize: fontSizes.sm }}>
        {formatInvitationLocalTime(startsAt)} · {placeLabel}
      </Text>
      {invitation.meeting ? (
        <Button
          label="Abrir lugar en mapas"
          onPress={openPlace}
          variant="ghost"
        />
      ) : null}
      <Text style={{ color: colors.textMuted, fontSize: fontSizes.sm }}>
        {revision.durationMinutes} min ·{" "}
        {revision.mode === "OWN_ROUTINES"
          ? "Cada uno con su rutina"
          : "Sesión compartida"}
      </Text>
      {invitation.state === "ACCEPTED" &&
      invitation.meeting &&
      !invitation.meeting.cancelledAt &&
      revision.mode === "SHARED_SESSION" ? (
        <View
          accessibilityLabel="Rutina compartida acordada"
          style={{ gap: spacing.xs }}
        >
          {sharedSession.isPending ? (
            <Text style={{ color: colors.textMuted }}>
              Cargando rutina acordada…
            </Text>
          ) : null}
          {sharedSession.isError ? (
            <Button
              label="Reintentar rutina compartida"
              onPress={() => {
                void sharedSession.refetch();
              }}
              variant="ghost"
            />
          ) : null}
          {sharedSession.data ? (
            <View
              style={{
                borderRadius: radii.md,
                backgroundColor: colors.surface,
                padding: spacing.md,
                gap: spacing.xs,
              }}
            >
              <Text
                style={{
                  color: colors.text,
                  fontSize: fontSizes.sm,
                  fontWeight: semibold,
                }}
              >
                {sharedSession.data.name} · rutina acordada
              </Text>
              {sharedSession.data.exercises.map((exercise) => (
                <Text
                  key={`${exercise.order}-${exercise.exerciseId}`}
                  style={{ color: colors.textMuted, fontSize: fontSizes.sm }}
                >
                  {exercise.order}. {exercise.exerciseName} ·{" "}
                  {exercise.targetSets} series · {exercise.repsMin ?? "—"}–
                  {exercise.repsMax ?? "—"} reps
                  {exercise.restSeconds
                    ? ` · ${exercise.restSeconds}s descanso`
                    : ""}
                </Text>
              ))}
              <Text style={{ color: colors.textMuted, fontSize: fontSizes.xs }}>
                Es una referencia compartida; tus pesos y registros siguen
                siendo personales.
              </Text>
            </View>
          ) : null}
        </View>
      ) : null}
      {revision.note ? (
        <Text style={{ color: colors.textMuted, fontSize: fontSizes.sm }}>
          {revision.note}
        </Text>
      ) : null}
      {canAccept ? (
        <View style={{ gap: spacing.xs }}>
          <Button
            label="Aceptar invitación"
            loading={responding}
            onPress={() => onRespond(invitation, "ACCEPT")}
          />
          <Button
            label="Rechazar invitación"
            disabled={responding}
            variant="danger"
            onPress={() => onRespond(invitation, "DECLINE")}
          />
        </View>
      ) : null}
      {invitation.state === "PENDING" && !canAccept ? (
        <Text style={{ color: colors.textMuted, fontSize: fontSizes.sm }}>
          Esperando respuesta a la propuesta actual.
        </Text>
      ) : null}
      {invitation.meeting?.cancelledAt ? (
        <Text style={{ color: colors.textMuted, fontSize: fontSizes.sm }}>
          Este encuentro se canceló al terminar la conexión.
        </Text>
      ) : null}
      {invitation.meeting ? (
        <>
          <Button
            label={
              invitation.meeting.cancelledAt
                ? "Compartir cancelación .ics"
                : "Compartir evento .ics"
            }
            testID={`training-invitation-calendar-${invitation.id}`}
            loading={exporting}
            onPress={() => onExport(invitation)}
            variant="ghost"
          />
          <Text style={{ color: colors.textMuted, fontSize: fontSizes.xs }}>
            La agenda de GymSheet funciona sin permiso de calendario. Para usar
            otra app, importa este archivo manualmente; si cambia el encuentro,
            comparte el archivo actualizado.
          </Text>
        </>
      ) : null}
    </Card>
  );
}

export default function TrainingInvitationsScreen() {
  const userId = useAuthStore((state) => state.principal?.id);
  const queryClient = useQueryClient();
  const requestIds = useRef(new Map<string, string>());
  const invitations = useQuery({
    queryKey: [...queryKey, userId],
    queryFn: () => trainingInvitationsService.list(),
    enabled: Boolean(userId),
  });

  useFocusEffect(
    useCallback(() => {
      void invitations.refetch();
    }, [invitations.refetch]),
  );

  const respond = useMutation({
    mutationFn: ({
      invitation,
      decision,
    }: {
      invitation: ListedTrainingInvitation;
      decision: RespondTrainingInviteInput["decision"];
    }) => {
      const key = `${invitation.id}:${invitation.revisions[0]!.revision}:${decision}`;
      let clientRequestId = requestIds.current.get(key);
      if (!clientRequestId) {
        clientRequestId = requestId();
        requestIds.current.set(key, clientRequestId);
      }
      return trainingInvitationsService.respond(invitation.id, {
        expectedRevision: invitation.revisions[0]!.revision,
        decision,
        clientRequestId,
      });
    },
    onSuccess: async (_result, { invitation, decision }) => {
      requestIds.current.delete(
        `${invitation.id}:${invitation.revisions[0]!.revision}:${decision}`,
      );
      await queryClient.invalidateQueries({ queryKey });
      notify.success(
        decision === "ACCEPT"
          ? "Encuentro confirmado."
          : "Invitación rechazada.",
      );
    },
    onError: async (error: Error, { invitation, decision }) => {
      if (error instanceof ApiError && error.status === 409) {
        requestIds.current.delete(
          `${invitation.id}:${invitation.revisions[0]!.revision}:${decision}`,
        );
      }
      await invitations.refetch();
      notify.error(error.message);
    },
  });
  const exportCalendar = useMutation({
    mutationFn: (invitation: ListedTrainingInvitation) =>
      shareTrainingInvitationCalendar(invitation.id),
    onError: (error: Error) => notify.error(error.message),
  });

  const groups = groupTrainingInvitations(invitations.data ?? []);
  const renderCards = (items: ListedTrainingInvitation[]) =>
    items.map((invitation) => (
      <InvitationCard
        key={invitation.id}
        invitation={invitation}
        userId={userId ?? ""}
        responding={
          respond.isPending &&
          respond.variables?.invitation.id === invitation.id
        }
        exporting={
          exportCalendar.isPending &&
          exportCalendar.variables?.id === invitation.id
        }
        onRespond={(item, decision) => {
          if (respond.isPending) return;
          if (decision === "DECLINE") {
            Alert.alert(
              "Rechazar invitación",
              "Esta acción no se puede deshacer.",
              [
                { text: "Cancelar", style: "cancel" },
                {
                  text: "Rechazar",
                  style: "destructive",
                  onPress: () => respond.mutate({ invitation: item, decision }),
                },
              ],
            );
            return;
          }
          respond.mutate({ invitation: item, decision });
        }}
        onExport={(item) => {
          if (!exportCalendar.isPending) exportCalendar.mutate(item);
        }}
      />
    ));

  return (
    <ScrollScreen
      onRefresh={() => void invitations.refetch()}
      refreshing={invitations.isFetching}
    >
      <BackLink />
      <ScreenHeader
        title="Entrenemos juntos"
        subtitle="Tus invitaciones y encuentros, en la hora local de este dispositivo."
      />
      {invitations.isPending ? (
        <Skeleton height={180} />
      ) : invitations.isError ? (
        <ErrorState
          error={invitations.error}
          onRetry={() => void invitations.refetch()}
        />
      ) : invitations.data?.length === 0 ? (
        <EmptyState
          icon="calendar-outline"
          title="Sin invitaciones"
          message="Desde el perfil o chat de una conexión puedes proponer un entrenamiento."
        />
      ) : (
        <View style={{ gap: spacing.lg }}>
          {groups.pending.length > 0 ? (
            <Section icon="mail-unread-outline" title="Pendientes">
              <View style={{ gap: spacing.md }}>
                {renderCards(groups.pending)}
              </View>
            </Section>
          ) : null}
          {groups.agenda.length > 0 ? (
            <Section icon="calendar-outline" title="Agenda">
              <View style={{ gap: spacing.md }}>
                {renderCards(groups.agenda)}
              </View>
            </Section>
          ) : null}
          {groups.history.length > 0 ? (
            <Section icon="time-outline" title="Historial">
              <View style={{ gap: spacing.md }}>
                {renderCards(groups.history)}
              </View>
            </Section>
          ) : null}
        </View>
      )}
    </ScrollScreen>
  );
}
