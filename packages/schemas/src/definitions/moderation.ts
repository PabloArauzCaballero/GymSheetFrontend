import { z } from 'zod';

/** Everything `POST /me/reports` accepts as a target (backend `ModerationTargetKind`). */
export const moderationTargetKinds = [
  'STORY',
  'PROFILE_PHOTO',
  'ROUTINE',
  'EXERCISE',
  'COMMENT',
  'REEL',
  'CHAT_MESSAGE',
  'USER',
  'MUSIC_PLAYLIST',
] as const;

/**
 * What the reporter is told about their own report: only whether someone
 * already looked at it. The resolution stays with the moderation team.
 */
export const myReportStatuses = ['EN_REVISION', 'REVISADA'] as const;

/** `POST /me/reports`. */
export const reportResultSchema = z.object({
  id: z.string(),
  status: z.string(),
  contentHidden: z.boolean(),
});

/** One item of «Tus denuncias» (`GET /me/reports`). */
export const myReportSchema = z.object({
  id: z.string(),
  // A kind this client does not know yet still lists (as «Contenido»); it must not break the page.
  targetKind: z.string(),
  targetId: z.string(),
  /** Name of a routine, exercise or playlist; null for people, messages, photos… or when it is gone. */
  title: z.string().nullable(),
  ownerName: z.string(),
  reason: z.string(),
  status: z.enum(myReportStatuses).catch('EN_REVISION'),
  createdAt: z.string(),
});

export const myReportPageSchema = z.object({
  items: z.array(myReportSchema),
  nextCursor: z.string().nullable(),
});

/** `POST /me/reports/:id/withdraw` (idempotent). */
export const reportWithdrawalSchema = z.object({
  id: z.string(),
  withdrawn: z.literal(true),
  withdrawnAt: z.string(),
  /** The automatic curtain was lifted because fewer than three people still report it. */
  contentRestored: z.boolean(),
});

export type ModerationTargetKind = (typeof moderationTargetKinds)[number];
export type MyReportStatus = (typeof myReportStatuses)[number];
export type ReportResult = z.infer<typeof reportResultSchema>;
export type MyReport = z.infer<typeof myReportSchema>;
export type MyReportPage = z.infer<typeof myReportPageSchema>;
export type ReportWithdrawal = z.infer<typeof reportWithdrawalSchema>;
