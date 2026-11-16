import { z } from 'zod';

/**
 * `POST /export/routine-progress` with `Accept: application/json`: the file
 * travels in base64 inside the `{ ok, data }` envelope, with its metadata. The
 * base64 is required and non-empty on purpose: a response without it must fail
 * the contract instead of being written to disk as an empty file.
 */
export const routineProgressExportFileSchema = z.object({
  fileName: z.string().min(1),
  mimeType: z.string().min(1),
  recordsCount: z.number().int().nonnegative(),
  base64: z.string().min(1),
});

export type RoutineProgressExportFile = z.infer<typeof routineProgressExportFileSchema>;
