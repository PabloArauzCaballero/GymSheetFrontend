import { z } from 'zod';
import { directoryEntitySummarySchema } from './directory';

/**
 * A listing as `GET /public/directory/entities/:id/plans` still returns it.
 * Its id is the listing id: buying goes through `/publicacion/:id` and the
 * orders of `business-orders.ts` (ADR-0024); the old public payment config,
 * `{ planId }` orders and receipt URLs are gone with franja 8d.
 */

export const entityPlanTypeEnum = z.enum(['MEMBERSHIP_PLAN', 'PASS', 'SERVICE', 'PRODUCT']);
export type EntityPlanType = z.infer<typeof entityPlanTypeEnum>;

export const entityPlanStatusEnum = z.enum(['ACTIVE', 'INACTIVE', 'ARCHIVED']);
export type EntityPlanStatus = z.infer<typeof entityPlanStatusEnum>;

export const entityPlanSchema = z.object({
  id: z.string(),
  entityId: z.string(),
  type: entityPlanTypeEnum,
  name: z.string(),
  slug: z.string(),
  description: z.string(),
  benefits: z.array(z.string()),
  durationDays: z.number().int().nullable(),
  currentPrice: z.string(),
  currency: z.string().length(3),
  status: entityPlanStatusEnum,
  displayOrder: z.number().int(),
  mediaUrls: z.array(z.string()),
  metadata: z.record(z.string(), z.unknown()),
  entity: directoryEntitySummarySchema.optional(),
  createdAt: z.string().optional(),
  updatedAt: z.string().optional(),
});
export type EntityPlan = z.infer<typeof entityPlanSchema>;
