import { z } from 'zod';

export const entityTypeEnum = z.enum([
  'GYM',
  'COACH',
  'CENTER',
  'STORE',
  'SERVICE_PROVIDER',
]);
export type EntityType = z.infer<typeof entityTypeEnum>;

export const categoryTreeNodeSchema: z.ZodType<CategoryTreeNode> = z.lazy(() =>
  z.object({
    id: z.string(),
    slug: z.string(),
    name: z.string(),
    description: z.string().nullable(),
    iconKey: z.string().nullable(),
    path: z.string(),
    entityScope: z.string(),
    children: z.array(categoryTreeNodeSchema),
    entityCount: z.number().int().nonnegative().optional(),
  })
);

export type CategoryTreeNode = {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  iconKey: string | null;
  path: string;
  entityScope: string;
  children: CategoryTreeNode[];
  entityCount?: number;
};

export const ratingHistogramSchema = z.object({
  1: z.number().int().nonnegative(),
  2: z.number().int().nonnegative(),
  3: z.number().int().nonnegative(),
  4: z.number().int().nonnegative(),
  5: z.number().int().nonnegative(),
});
export type RatingHistogram = z.infer<typeof ratingHistogramSchema>;

export const directoryEntitySummarySchema = z.object({
  id: z.string(),
  slug: z.string(),
  entityType: entityTypeEnum,
  name: z.string(),
  headline: z.string().nullable(),
  logoUrl: z.string().nullable(),
  coverUrl: z.string().nullable(),
  primaryCategory: z.object({
    id: z.string(),
    name: z.string(),
    slug: z.string(),
    path: z.string(),
  }),
  city: z.string().nullable(),
  country: z.string().nullable(),
  tenantId: z.string().nullable().optional(),
  isOnlineOnly: z.boolean(),
  isVerified: z.boolean(),
  ratingAverage: z.number().min(0).max(5),
  ratingCount: z.number().int().nonnegative(),
  pricingTier: z.number().int().min(1).max(4).optional(),
});
export type DirectoryEntitySummary = z.infer<typeof directoryEntitySummarySchema>;

export const directoryEntityDetailSchema = directoryEntitySummarySchema.extend({
  description: z.string(),
  gallery: z.array(z.string()),
  address: z.string().nullable(),
  latitude: z.number().nullable(),
  longitude: z.number().nullable(),
  contactInfo: z.object({
    phone: z.string().optional(),
    whatsapp: z.string().optional(),
    website: z.string().optional(),
    instagram: z.string().optional(),
    email: z.string().optional(),
  }),
  businessHours: z.record(z.string(), z.object({ open: z.string(), close: z.string() })),
  ratingBreakdown: ratingHistogramSchema,
  secondaryCategories: z.array(
    z.object({
      id: z.string(),
      name: z.string(),
      slug: z.string(),
      path: z.string(),
    })
  ),
});
export type DirectoryEntityDetail = z.infer<typeof directoryEntityDetailSchema>;

export const directoryFilterQuerySchema = z.object({
  categoryPath: z.string().optional(),
  type: entityTypeEnum.optional(),
  search: z.string().trim().min(1).max(100).optional(),
  ratingMin: z.coerce.number().min(1).max(5).optional(),
  verifiedOnly: z.coerce.boolean().optional(),
  city: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(50).default(20),
  cursor: z.string().optional(),
});
export type DirectoryFilterQuery = z.infer<typeof directoryFilterQuerySchema>;
