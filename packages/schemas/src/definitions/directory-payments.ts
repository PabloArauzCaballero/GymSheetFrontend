import { z } from 'zod';

export const entityPaymentConfigSchema = z.object({
  id: z.string().uuid().optional(),
  entityId: z.string().uuid().optional(),
  bankName: z.string().trim().min(2).max(100),
  accountHolderName: z.string().trim().min(2).max(180),
  taxId: z.string().trim().min(3).max(50),
  accountNumber: z.string().trim().min(4).max(100),
  aliasOrPhone: z.string().trim().max(100).nullable().optional(),
  qrImageUrl: z.string().trim().min(5),
  qrPayload: z.string().trim().nullable().optional(),
  instructions: z.string().trim().max(2000).nullable().optional(),
  isActive: z.boolean().default(true),
});
export type EntityPaymentConfig = z.infer<typeof entityPaymentConfigSchema>;
export type EntityPaymentConfigInput = z.input<typeof entityPaymentConfigSchema>;

export const entityPlanTypeEnum = z.enum(['MEMBERSHIP_PLAN', 'PASS', 'SERVICE', 'PRODUCT']);
export type EntityPlanType = z.infer<typeof entityPlanTypeEnum>;

export const entityPlanStatusEnum = z.enum(['ACTIVE', 'INACTIVE', 'ARCHIVED']);
export type EntityPlanStatus = z.infer<typeof entityPlanStatusEnum>;

export const entityPlanSchema = z.object({
  id: z.string().uuid(),
  entityId: z.string().uuid(),
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
  createdAt: z.string().optional(),
  updatedAt: z.string().optional(),
});
export type EntityPlan = z.infer<typeof entityPlanSchema>;

export const planPriceHistorySchema = z.object({
  id: z.string().uuid(),
  planId: z.string().uuid(),
  price: z.string(),
  currency: z.string().length(3),
  effectiveFrom: z.string(),
  effectiveTo: z.string().nullable(),
  changedByUserId: z.string().uuid(),
  changeReason: z.string(),
  isPromotional: z.boolean(),
  createdAt: z.string(),
});
export type PlanPriceHistory = z.infer<typeof planPriceHistorySchema>;

export const createEntityPlanSchema = z.object({
  type: entityPlanTypeEnum.optional().default('MEMBERSHIP_PLAN'),
  name: z.string().trim().min(2).max(180),
  slug: z.string().trim().min(2).max(180).optional(),
  description: z.string().trim().min(5).max(5000),
  benefits: z.array(z.string().trim().min(1)).optional().default([]),
  durationDays: z.number().int().min(1).max(3650).nullable().optional(),
  price: z.number().nonnegative(),
  currency: z.string().trim().length(3).regex(/^[A-Z]{3}$/).optional().default('USD'),
  displayOrder: z.number().int().optional().default(0),
  mediaUrls: z.array(z.string().trim()).optional().default([]),
  metadata: z.record(z.string(), z.unknown()).optional().default({}),
  initialReason: z.string().trim().min(3).max(500).optional().default('Precio de lanzamiento inicial'),
});
export type CreateEntityPlanInput = z.input<typeof createEntityPlanSchema>;

export const updatePlanPriceSchema = z.object({
  newPrice: z.number().nonnegative(),
  currency: z.string().trim().length(3).regex(/^[A-Z]{3}$/).optional(),
  reason: z.string().trim().min(5).max(500),
  isPromotional: z.boolean().optional().default(false),
});
export type UpdatePlanPriceInput = z.input<typeof updatePlanPriceSchema>;

export const paymentOrderStatusEnum = z.enum([
  'PENDING_PAYMENT',
  'PENDING_VERIFICATION',
  'CONFIRMED',
  'REJECTED',
  'CANCELLED',
]);
export type PaymentOrderStatus = z.infer<typeof paymentOrderStatusEnum>;

export const paymentOrderSchema = z.object({
  id: z.string().uuid(),
  orderNumber: z.string(),
  entityId: z.string().uuid(),
  planId: z.string().uuid(),
  athleteUserId: z.string().uuid(),
  priceHistoryId: z.string().uuid(),
  amount: z.string(),
  currency: z.string().length(3),
  planSnapshot: z.record(z.string(), z.unknown()),
  status: paymentOrderStatusEnum,
  receiptUrl: z.string().nullable(),
  receiptReference: z.string().nullable(),
  athleteNotes: z.string().nullable(),
  submittedAt: z.string().nullable(),
  verifiedByUserId: z.string().nullable(),
  verifiedAt: z.string().nullable(),
  rejectionReason: z.string().nullable(),
  membershipId: z.string().nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
});
export type PaymentOrder = z.infer<typeof paymentOrderSchema>;

export const createPaymentOrderSchema = z.object({
  planId: z.string().uuid(),
  athleteNotes: z.string().trim().max(500).nullable().optional(),
});
export type CreatePaymentOrderInput = z.infer<typeof createPaymentOrderSchema>;

export const submitReceiptSchema = z.object({
  receiptUrl: z.string().trim().min(5),
  receiptStorageKey: z.string().trim().nullable().optional(),
  receiptReference: z.string().trim().max(100).nullable().optional(),
  athleteNotes: z.string().trim().max(500).nullable().optional(),
});
export type SubmitReceiptInput = z.infer<typeof submitReceiptSchema>;
