import {
  reelSchema,
  reelsFeedSchema,
  type ReelDTO,
  type ReelsFeed,
} from "@gymsheet/schemas";
import { apiClient } from "@/api/client";

export type ReelFeedTab = "MINE" | "FOR_YOU" | "CONNECTIONS";

const commentSchema = z.object({
  id: z.string().uuid(),
  reelId: z.string().uuid(),
  parentCommentId: z.string().uuid().nullable(),
  userId: z.string().uuid(),
  displayName: z.string(),
  body: z.string().nullable(),
  deleted: z.boolean(),
  createdAt: z.string().datetime(),
});
const commentsSchema = z.array(commentSchema);
const actionResultSchema = z.object({
  saved: z.boolean().optional(),
  reposted: z.boolean().optional(),
  liked: z.boolean().optional(),
});

/** Shared server-validated read and multipart publication operations for reels. */
export const reelsService = {
  feed: (tab: ReelFeedTab = "MINE", cursor?: string) => {
    const params = new URLSearchParams({ tab });
    if (cursor) params.set("cursor", cursor);
    return apiClient.request(
      `/me/reels/feed?${params.toString()}`,
      reelsFeedSchema,
      { method: "GET" },
    );
  },
  saved: () =>
    apiClient.request("/me/reels/saved", reelsFeedSchema, { method: "GET" }),
  save: (reelId: string, saved: boolean) =>
    apiClient.request(`/me/reels/${reelId}/save`, actionResultSchema, {
      method: "POST",
      body: { saved },
    }),
  repost: (reelId: string, reposted: boolean) =>
    apiClient.request(`/me/reels/${reelId}/repost`, actionResultSchema, {
      method: "POST",
      body: { reposted },
    }),
  like: (reelId: string, liked: boolean) =>
    apiClient.request(`/me/reels/${reelId}/like`, actionResultSchema, {
      method: "POST",
      body: { liked },
    }),
  comments: (reelId: string) =>
    apiClient.request(`/me/reels/${reelId}/comments`, commentsSchema, {
      method: "GET",
    }),
  createComment: (reelId: string, body: string, parentCommentId?: string) =>
    apiClient.request(`/me/reels/${reelId}/comments`, commentSchema, {
      method: "POST",
      body: { body, ...(parentCommentId ? { parentCommentId } : {}) },
    }),
  upload: (file: { uri: string; name: string; mimeType: string }) => {
    const form = new FormData();
    form.append("file", {
      uri: file.uri,
      name: file.name,
      type: file.mimeType,
    } as unknown as Blob);
    return apiClient.upload("/me/reels", reelSchema, form);
  },
};

export type { ReelDTO, ReelsFeed };
import { z } from "zod";
