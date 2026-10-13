import { beforeEach, describe, expect, it, vi } from "vitest";

const requestMock = vi.hoisted(() => vi.fn());
const uploadMock = vi.hoisted(() => vi.fn());
vi.mock("@/api/client", () => ({
  apiClient: { request: requestMock, upload: uploadMock },
}));

import { reelSchema, reelsFeedSchema } from "@gymsheet/schemas";
import { reelsService } from "./reels-service";

const reel = {
  id: "0190e2cb-a6d4-7ec3-8f91-a6c735631501",
  userId: "0190e2cb-a6d4-7ec3-8f91-a6c735631502",
  mediaUrl: "/me/reels/0190e2cb-a6d4-7ec3-8f91-a6c735631501/media",
  durationSeconds: 60,
  status: "READY",
  createdAt: "2026-10-10T12:00:00.000Z",
};

describe("reelsService (mobile)", () => {
  beforeEach(() => {
    requestMock.mockReset();
    uploadMock.mockReset();
  });

  it("gets the feed with the shared response schema", async () => {
    requestMock.mockResolvedValue({ items: [reel], nextCursor: null });

    await reelsService.feed();

    expect(requestMock).toHaveBeenCalledWith(
      "/me/reels/feed?tab=MINE",
      reelsFeedSchema,
      { method: "GET" },
    );
  });

  it("uploads the selected asset as the only multipart field", async () => {
    uploadMock.mockResolvedValue(reel);
    const file = {
      uri: "file:///reel.mp4",
      name: "reel.mp4",
      mimeType: "video/mp4",
    };
    const appendMock = vi.fn();
    class CapturedFormData {
      append = appendMock;
    }
    vi.stubGlobal("FormData", CapturedFormData);

    try {
      await reelsService.upload(file);

      expect(uploadMock).toHaveBeenCalledTimes(1);
      expect(uploadMock).toHaveBeenCalledWith(
        "/me/reels",
        reelSchema,
        expect.any(CapturedFormData),
      );
      expect(appendMock).toHaveBeenCalledTimes(1);
      expect(appendMock).toHaveBeenCalledWith("file", {
        uri: file.uri,
        name: file.name,
        type: file.mimeType,
      });
    } finally {
      vi.unstubAllGlobals();
    }
  });

  it("accepts READY reel DTOs and signed continuation cursors", () => {
    expect(reelSchema.safeParse(reel).success).toBe(true);
    expect(
      reelSchema.safeParse({ ...reel, status: "PROCESSING" }).success,
    ).toBe(false);
    expect(
      reelsFeedSchema.safeParse({ items: [reel], nextCursor: null }).success,
    ).toBe(true);
    expect(
      reelsFeedSchema.safeParse({ items: [reel], nextCursor: "cursor" })
        .success,
    ).toBe(true);
  });

  it("requests the chosen social tab and signed continuation cursor", async () => {
    requestMock.mockResolvedValue({ items: [], nextCursor: null });

    await reelsService.feed("CONNECTIONS", "signed-cursor");

    expect(requestMock).toHaveBeenCalledWith(
      "/me/reels/feed?tab=CONNECTIONS&cursor=signed-cursor",
      reelsFeedSchema,
      { method: "GET" },
    );
  });

  it("preserves transport errors from feed and upload", async () => {
    const feedError = new Error("feed unavailable");
    const uploadError = new Error("upload rejected");
    requestMock.mockRejectedValue(feedError);
    uploadMock.mockRejectedValue(uploadError);

    await expect(reelsService.feed()).rejects.toBe(feedError);
    await expect(
      reelsService.upload({
        uri: "file:///reel.mp4",
        name: "reel.mp4",
        mimeType: "video/mp4",
      }),
    ).rejects.toBe(uploadError);
  });
});
