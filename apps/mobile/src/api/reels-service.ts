import {
  reelSchema,
  reelsFeedSchema,
  type ReelDTO,
  type ReelsFeed,
} from "@gymsheet/schemas";
import { apiClient } from "@/api/client";

/** Shared server-validated read and multipart publication operations for reels. */
export const reelsService = {
  feed: () =>
    apiClient.request("/me/reels/feed", reelsFeedSchema, { method: "GET" }),
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
