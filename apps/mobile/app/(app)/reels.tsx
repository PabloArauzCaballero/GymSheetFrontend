import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useFocusEffect } from "expo-router";
import { memo, useCallback, useEffect, useMemo, useState } from "react";
import * as ImagePicker from "expo-image-picker";
import { VideoView, useVideoPlayer } from "expo-video";
import { Alert, Pressable, Text, TextInput, View } from "react-native";
import {
  reelsService,
  type ReelFeedTab,
  type ReelDTO,
} from "@/api/reels-service";
import { BackLink } from "@/components/nav";
import { Card, ScrollScreen, ScreenHeader, Section } from "@/components/layout";
import { Button } from "@/components/ui";
import { ErrorState, Skeleton } from "@/components/feedback";
import { notify } from "@/notifications";
import { env } from "@/config/env";
import { secureStoreTokenProvider } from "@/storage/secure-store";
import { useAuthStore } from "@/state/auth-store";
import { colors, fontSizes, ink, radii, semibold, spacing } from "@/theme";

const tabs: ReadonlyArray<{ id: ReelFeedTab; label: string }> = [
  { id: "FOR_YOU", label: "Para ti" },
  { id: "CONNECTIONS", label: "Conexiones" },
  { id: "MINE", label: "Mis reels" },
];

const ReelPlayer = memo(function ReelPlayer({ reel, token }: { reel: ReelDTO; token: string | null }) {
  const uri = `${env.apiUrl.replace(/\/+$/, "")}/${reel.mediaUrl.replace(/^\/+/, "")}`;
  const source = useMemo(
    () =>
      token
        ? {
            uri,
            headers: { Authorization: `Bearer ${token}` },
            useCaching: false,
          }
        : null,
    [token, uri],
  );
  const player = useVideoPlayer(
    source,
    (instance) => {
      instance.loop = true;
    },
  );
  useFocusEffect(useCallback(() => () => player.pause(), [player]));

  return (
    <View
      style={{
        aspectRatio: 9 / 16,
        overflow: "hidden",
        borderRadius: radii.lg,
        backgroundColor: ink.black,
      }}
    >
      {token ? (
        <VideoView
          accessibilityLabel="Reel de video"
          contentFit="contain"
          nativeControls
          player={player}
          style={{ width: "100%", height: "100%" }}
        />
      ) : (
        <Text style={{ color: colors.textMuted, padding: spacing.md }}>
          Preparando sesión…
        </Text>
      )}
    </View>
  );
});

export default function ReelsScreen() {
  const queryClient = useQueryClient();
  const userId = useAuthStore((state) => state.principal?.id);
  const [tab, setTab] = useState<ReelFeedTab>("FOR_YOU");
  const [commentsOpen, setCommentsOpen] = useState(false);
  const [commentText, setCommentText] = useState("");
  const [replyTo, setReplyTo] = useState<string | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const feed = useQuery({
    queryKey: ["reels", "feed", tab],
    queryFn: () => reelsService.feed(tab),
  });
  const reel = feed.data?.items[0];
  const comments = useQuery({
    queryKey: ["reels", "comments", reel?.id],
    queryFn: () => reelsService.comments(reel!.id),
    enabled: Boolean(reel && commentsOpen),
  });
  useEffect(() => {
    let active = true;
    void secureStoreTokenProvider.getAccessToken().then((value) => {
      if (active) setToken(value);
    });
    return () => {
      active = false;
    };
  }, []);

  const upload = useMutation({
    mutationFn: (asset: ImagePicker.ImagePickerAsset) =>
      reelsService.upload({
        uri: asset.uri,
        name: asset.fileName ?? `reel-${Date.now()}.mp4`,
        mimeType: asset.mimeType ?? "video/mp4",
      }),
    onSuccess: async () => {
      notify.success("Reel publicado.");
      await queryClient.invalidateQueries({ queryKey: ["reels", "feed"] });
      setTab("MINE");
    },
    onError: (error: Error) => notify.error(error.message),
  });
  const interaction = useMutation({
    mutationFn: ({
      action,
      value,
    }: {
      action: "like" | "save" | "repost";
      value: boolean;
    }) => {
      if (!reel) throw new Error("El reel ya no está disponible.");
      if (action === "like") return reelsService.like(reel.id, value);
      if (action === "save") return reelsService.save(reel.id, value);
      return reelsService.repost(reel.id, value);
    },
    onSuccess: async () =>
      queryClient.invalidateQueries({ queryKey: ["reels", "feed"] }),
    onError: (error: Error) => notify.error(error.message),
  });
  const comment = useMutation({
    mutationFn: (input: { body: string; parentCommentId?: string }) => {
      if (!reel) throw new Error("El reel ya no está disponible.");
      return reelsService.createComment(
        reel.id,
        input.body,
        input.parentCommentId,
      );
    },
    onSuccess: async () => {
      setCommentText("");
      setReplyTo(null);
      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: ["reels", "comments", reel?.id],
        }),
        queryClient.invalidateQueries({ queryKey: ["reels", "feed"] }),
      ]);
    },
    onError: (error: Error) => notify.error(error.message),
  });
  const deleteComment = useMutation({
    mutationFn: (commentId: string) => {
      if (!reel) throw new Error("El reel ya no está disponible.");
      return reelsService.deleteComment(reel.id, commentId);
    },
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: ["reels", "comments", reel?.id],
        }),
        queryClient.invalidateQueries({ queryKey: ["reels", "feed"] }),
      ]);
      notify.success("Comentario eliminado.");
    },
    onError: (error: Error) => notify.error(error.message),
  });
  const report = useMutation({
    mutationFn: (reason: "SPAM" | "ACOSO" | "CONTENIDO_SEXUAL" | "OTRO") => {
      if (!reel) throw new Error("El reel ya no está disponible.");
      return reelsService.report(reel.id, reason);
    },
    onSuccess: async (result) => {
      notify.success(
        result.contentHidden
          ? "Gracias por avisar. Retiramos el reel mientras lo revisamos."
          : "Gracias por avisar.",
      );
      await queryClient.invalidateQueries({ queryKey: ["reels", "feed"] });
    },
    onError: (error: Error) => notify.error(error.message),
  });

  const chooseVideo = async (source: "camera" | "library") => {
    const permission =
      source === "camera"
        ? await ImagePicker.requestCameraPermissionsAsync()
        : await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      notify.warning({
        title: "Permiso necesario",
        message: "Autoriza el acceso para elegir o grabar un video.",
      });
      return;
    }
    const result =
      source === "camera"
        ? await ImagePicker.launchCameraAsync({
            mediaTypes: ["videos"],
            videoMaxDuration: 90,
            quality: 1,
          })
        : await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ["videos"],
            videoMaxDuration: 90,
            quality: 1,
          });
    const asset = result.canceled ? undefined : result.assets[0];
    if (!asset) return;
    if (asset.duration && asset.duration > 90_000) {
      notify.warning({
        title: "Video demasiado largo",
        message: "Recórtalo a 90 segundos o menos antes de publicar.",
      });
      return;
    }
    upload.mutate(asset);
  };

  return (
    <ScrollScreen>
      <BackLink />
      <ScreenHeader
        subtitle="Publica videos y mira reels de tus conexiones."
        title="Reels"
      />
      <Section title="Publicar">
        <Card>
          <View
            style={{ flexDirection: "row", flexWrap: "wrap", gap: spacing.sm }}
          >
            <Button
              label="Grabar video"
              loading={upload.isPending}
              onPress={() => void chooseVideo("camera")}
              variant="ghost"
            />
            <Button
              label="Elegir video"
              loading={upload.isPending}
              onPress={() => void chooseVideo("library")}
              variant="primary"
            />
          </View>
          <Text
            style={{
              color: colors.textMuted,
              fontSize: fontSizes.sm,
              marginTop: spacing.sm,
            }}
          >
            MP4 o QuickTime, hasta 90 segundos. El servidor valida el archivo.
          </Text>
        </Card>
      </Section>
      <View style={{ flexDirection: "row", gap: spacing.xs }}>
        {tabs.map((item) => (
          <Pressable
            accessibilityRole="tab"
            accessibilityState={{ selected: tab === item.id }}
            key={item.id}
            onPress={() => {
              setTab(item.id);
              setCommentsOpen(false);
            }}
            style={{
              flex: 1,
              alignItems: "center",
              borderRadius: radii.full,
              backgroundColor:
                tab === item.id ? colors.volt : colors.surfaceHigh,
              padding: spacing.sm,
            }}
          >
            <Text
              style={{
                color: tab === item.id ? colors.background : colors.text,
                fontSize: fontSizes.sm,
                fontWeight: semibold,
              }}
            >
              {item.label}
            </Text>
          </Pressable>
        ))}
      </View>
      {feed.isPending ? <Skeleton height={460} /> : null}
      {feed.isError ? (
        <ErrorState error={feed.error} onRetry={() => void feed.refetch()} />
      ) : null}
      {feed.isSuccess && !reel ? (
        <Card>
          <Text style={{ color: colors.textMuted }}>
            No hay reels para mostrar todavía.
          </Text>
        </Card>
      ) : null}
      {reel ? (
        <View style={{ gap: spacing.md }}>
          <ReelPlayer reel={reel} token={token} />
          {tab !== "MINE" ? (
            <View
              style={{
                flexDirection: "row",
                flexWrap: "wrap",
                gap: spacing.sm,
              }}
            >
              <Button
                label={reel.likedByMe ? "Quitar me gusta" : "Me gusta"}
                onPress={() =>
                  interaction.mutate({ action: "like", value: !reel.likedByMe })
                }
                variant="ghost"
              />
              <Button
                label={reel.savedByMe ? "Quitar guardado" : "Guardar"}
                onPress={() =>
                  interaction.mutate({ action: "save", value: !reel.savedByMe })
                }
                variant="ghost"
              />
              <Button
                label={reel.repostedByMe ? "Deshacer repost" : "Repostear"}
                onPress={() =>
                  interaction.mutate({
                    action: "repost",
                    value: !reel.repostedByMe,
                  })
                }
                variant="ghost"
              />
              <Button
                label={`Comentarios (${reel.commentsCount ?? 0})`}
                onPress={() => setCommentsOpen((open) => !open)}
                variant="ghost"
              />
              <Button
                label="Reportar"
                onPress={() =>
                  Alert.alert("Reportar reel", "Elige el motivo", [
                    { text: "Spam", onPress: () => report.mutate("SPAM") },
                    { text: "Acoso", onPress: () => report.mutate("ACOSO") },
                    {
                      text: "Contenido sexual",
                      onPress: () => report.mutate("CONTENIDO_SEXUAL"),
                    },
                    { text: "Otro", onPress: () => report.mutate("OTRO") },
                    { text: "Cancelar", style: "cancel" },
                  ])
                }
                variant="ghost"
              />
            </View>
          ) : null}
          {commentsOpen ? (
            <Card>
              {comments.isPending ? <Skeleton height={80} /> : null}
              {comments.isError ? (
                <ErrorState
                  error={comments.error}
                  onRetry={() => void comments.refetch()}
                />
              ) : null}
              {comments.data?.map((item) => (
                <View key={item.id} style={{ marginBottom: spacing.sm }}>
                  <Text style={{ color: colors.text }}>
                    <Text style={{ fontWeight: semibold }}>
                      {item.displayName}:{" "}
                    </Text>
                    {item.body ?? "Comentario eliminado"}
                  </Text>
                  {!item.parentCommentId && item.body ? (
                    <Button
                      label="Responder"
                      onPress={() => setReplyTo(item.id)}
                      variant="ghost"
                    />
                  ) : null}
                  {item.body &&
                  (item.userId === userId || reel.userId === userId) ? (
                    <Button
                      disabled={deleteComment.isPending}
                      label="Eliminar comentario"
                      loading={
                        deleteComment.isPending &&
                        deleteComment.variables === item.id
                      }
                      onPress={() =>
                        Alert.alert(
                          "Eliminar comentario",
                          "El comentario dejará de estar visible para todos.",
                          [
                            { text: "Cancelar", style: "cancel" },
                            {
                              text: "Eliminar",
                              style: "destructive",
                              onPress: () => deleteComment.mutate(item.id),
                            },
                          ],
                        )
                      }
                      variant="ghost"
                    />
                  ) : null}
                </View>
              ))}
              {reel.commentsEnabled !== false ? (
                <View style={{ gap: spacing.sm }}>
                  <TextInput
                    accessibilityLabel="Escribe un comentario"
                    maxLength={1000}
                    multiline
                    onChangeText={setCommentText}
                    placeholder={
                      replyTo
                        ? "Escribe una respuesta"
                        : "Escribe un comentario"
                    }
                    placeholderTextColor={colors.textMuted}
                    style={{
                      minHeight: 48,
                      borderColor: colors.border,
                      borderRadius: radii.md,
                      borderWidth: 1,
                      color: colors.text,
                      padding: spacing.sm,
                    }}
                    value={commentText}
                  />
                  <View style={{ flexDirection: "row", gap: spacing.sm }}>
                    <Button
                      disabled={!commentText.trim() || comment.isPending}
                      label={replyTo ? "Responder" : "Comentar"}
                      loading={comment.isPending}
                      onPress={() =>
                        comment.mutate({
                          body: commentText.trim(),
                          ...(replyTo ? { parentCommentId: replyTo } : {}),
                        })
                      }
                      variant="primary"
                    />
                    {replyTo ? (
                      <Button
                        label="Cancelar respuesta"
                        onPress={() => setReplyTo(null)}
                        variant="ghost"
                      />
                    ) : null}
                  </View>
                </View>
              ) : (
                <Text style={{ color: colors.textMuted }}>
                  Los comentarios están cerrados.
                </Text>
              )}
            </Card>
          ) : null}
        </View>
      ) : null}
    </ScrollScreen>
  );
}
