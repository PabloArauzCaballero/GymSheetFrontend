import { z } from 'zod';

/**
 * Marketplace orders paid by the business's QR or in cash and confirmed by
 * the business (backend ADR-0024, franja 8d). REPP never touches the money.
 * Amounts are decimal strings from the server ("150.00"): never parsed into
 * a float on the client.
 */
export const orderStatuses = ['PENDING_PAYMENT', 'PENDING_VERIFICATION', 'CONFIRMED', 'REJECTED', 'CANCELLED', 'EXPIRED'] as const;
export const orderStatusSchema = z.enum(orderStatuses);
export type OrderStatus = z.infer<typeof orderStatusSchema>;

export const orderMethodSchema = z.enum(['QR', 'CASH']);
export type OrderMethod = z.infer<typeof orderMethodSchema>;

export const orderRejectionCodes = ['AMOUNT_MISMATCH', 'UNREADABLE', 'NOT_RECEIVED', 'OTHER'] as const;
export const orderRejectionCodeSchema = z.enum(orderRejectionCodes);
export type OrderRejectionCode = z.infer<typeof orderRejectionCodeSchema>;

const money = z.string().regex(/^\d+(\.\d{1,2})?$/u);

const orderBaseShape = {
  id: z.string().uuid(),
  orderNumber: z.string(),
  status: orderStatusSchema,
  method: orderMethodSchema,
  quantity: z.number().int().min(1),
  unitAmount: money,
  amount: money,
  currency: z.string(),
  listing: z.object({
    id: z.string().nullable(),
    name: z.string(),
    offerKind: z.string().nullable(),
    validityDays: z.number().int().nullable(),
    sessionsCount: z.number().int().nullable(),
  }),
  seller: z.object({ entityId: z.string(), name: z.string(), handle: z.string().nullable(), logoUrl: z.string().nullable() }),
  expiresAt: z.string().nullable(),
  submittedAt: z.string().nullable(),
  decidedAt: z.string().nullable(),
  cancelledAt: z.string().nullable(),
  cancelReason: z.string().nullable(),
  rejection: z.object({ code: z.string(), text: z.string(), note: z.string().nullable() }).nullable(),
  receipt: z.object({ uploaded: z.boolean(), reference: z.string().nullable() }),
  note: z.string().nullable(),
  createdAt: z.string(),
};

export const orderTimelineEntrySchema = z.object({
  status: orderStatusSchema,
  at: z.string(),
  reasonCode: z.string().nullable(),
  by: z.enum(['BUYER', 'BUSINESS', 'SYSTEM']),
});
export type OrderTimelineEntry = z.infer<typeof orderTimelineEntrySchema>;

export const buyerOrderSchema = z.object({
  ...orderBaseShape,
  actions: z.object({ canUploadReceipt: z.boolean(), canCancel: z.boolean(), canReport: z.boolean() }),
});
export type BuyerOrder = z.infer<typeof buyerOrderSchema>;

export const buyerOrderDetailSchema = buyerOrderSchema.extend({ timeline: z.array(orderTimelineEntrySchema) });
export type BuyerOrderDetail = z.infer<typeof buyerOrderDetailSchema>;

export const buyerOrdersPageSchema = z.object({ items: z.array(buyerOrderSchema), nextCursor: z.string().nullable() });
export type BuyerOrdersPage = z.infer<typeof buyerOrdersPageSchema>;

export const businessOrderSchema = z.object({
  ...orderBaseShape,
  buyer: z.object({ name: z.string() }),
  actions: z.object({ canDecide: z.boolean() }),
});
export type BusinessOrder = z.infer<typeof businessOrderSchema>;

export const businessOrderDetailSchema = businessOrderSchema.extend({ timeline: z.array(orderTimelineEntrySchema) });
export type BusinessOrderDetail = z.infer<typeof businessOrderDetailSchema>;

export const businessOrdersPageSchema = z.object({
  items: z.array(businessOrderSchema),
  nextCursor: z.string().nullable(),
  /** Orders waiting for the business («Por confirmar»): the nav badge. */
  pendingCount: z.number().int().min(0),
});
export type BusinessOrdersPage = z.infer<typeof businessOrdersPageSchema>;

/** What the buyer needs to pay one open order; the QR is a private image at `qrPath`. */
export const paymentInstructionsSchema = z.object({
  orderId: z.string(),
  orderNumber: z.string(),
  method: orderMethodSchema,
  amount: money,
  currency: z.string(),
  expiresAt: z.string().nullable(),
  bankName: z.string().nullable(),
  accountHolderName: z.string().nullable(),
  accountNumber: z.string().nullable(),
  aliasOrPhone: z.string().nullable(),
  instructions: z.string().nullable(),
  qrPath: z.string().nullable(),
});
export type PaymentInstructions = z.infer<typeof paymentInstructionsSchema>;

/** Strict: the price comes from the listing, so any amount or `planId` would be a 400. */
export const createOrderInputSchema = z
  .object({
    listingId: z.string().uuid(),
    quantity: z.number().int().min(1).max(1000).optional(),
    method: orderMethodSchema.optional(),
    note: z.string().trim().min(1).max(500).optional(),
    /** A gym's MEMBERSHIP bought by someone not yet SOCIO there (ADR-0026): the REQUESTED SOCIO is created with the order. */
    affiliation: z
      .object({ locationId: z.string().uuid(), ciLast3: z.string().regex(/^[0-9]{3}$/u), switchGym: z.boolean().optional() })
      .strict()
      .optional(),
  })
  .strict();
export type CreateOrderInput = z.infer<typeof createOrderInputSchema>;

/** `POST /business/me/orders/:id/confirm`: «También confirmo que es socio» (default true on the backend). */
export const confirmOrderInputSchema = z.object({ alsoConfirmAffiliation: z.boolean().optional() }).strict();
export type ConfirmOrderInput = z.infer<typeof confirmOrderInputSchema>;

export const rejectOrderInputSchema = z
  .object({ reasonCode: orderRejectionCodeSchema, note: z.string().trim().min(3).max(500).optional() })
  .strict();
export type RejectOrderInput = z.infer<typeof rejectOrderInputSchema>;

/** The business's own payment data (`business/me/payment-config`); null until it saves one. */
export const paymentConfigSchema = z.object({
  bankName: z.string(),
  accountHolderName: z.string(),
  accountNumber: z.string().nullable(),
  aliasOrPhone: z.string().nullable(),
  instructions: z.string().nullable(),
  acceptsCash: z.boolean(),
  isActive: z.boolean(),
  hasQr: z.boolean(),
  holderMatch: z.enum(['PASS', 'WARN', 'UNKNOWN']).nullable(),
  updatedAt: z.string(),
});
export type PaymentConfig = z.infer<typeof paymentConfigSchema>;

export const paymentConfigInputSchema = z
  .object({
    bankName: z.string().trim().min(2).max(100),
    accountHolderName: z.string().trim().min(2).max(180),
    accountNumber: z.string().trim().max(100).nullable().optional(),
    aliasOrPhone: z.string().trim().max(100).nullable().optional(),
    instructions: z.string().trim().max(2000).nullable().optional(),
    acceptsCash: z.boolean().optional(),
    isActive: z.boolean().optional(),
  })
  .strict();
export type PaymentConfigInput = z.infer<typeof paymentConfigInputSchema>;
