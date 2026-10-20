import 'server-only';
import { cache } from 'react';
import { z } from 'zod';
import type {
  CategoryTreeNode,
  DirectoryEntityDetail,
  DirectoryEntitySummary,
  DirectoryFilterQuery,
  EntityPaymentConfig,
  EntityPlan,
  EntityReviewsResponse,
  ListReviewsQuery,
} from '@/shared/api/schemas';
import {
  categoryTreeNodeSchema,
  directoryEntityDetailSchema,
  directoryEntitySummarySchema,
  entityPaymentConfigSchema,
  entityPlanSchema,
  entityReviewsResponseSchema,
} from '@/shared/api/schemas';
import { backendRequest, readBackendJson } from '@/shared/server/backend';

const envelopeSchema = z.object({ ok: z.literal(true), data: z.unknown() });

async function readData<T>(response: Response, schema: z.ZodType<T>): Promise<T | null> {
  if (!response.ok) return null;
  const json = await readBackendJson(response);
  const envelope = envelopeSchema.safeParse(json);
  if (!envelope.success) return null;
  const parsed = schema.safeParse(envelope.data.data);
  return parsed.success ? parsed.data : null;
}

export const getDirectoryCategories = cache(
  async (scope?: string): Promise<CategoryTreeNode[]> => {
    const query = scope ? `?scope=${encodeURIComponent(scope)}` : '';
    const response = await backendRequest(`/public/directory/categories${query}`);
    const data = await readData(response, z.array(categoryTreeNodeSchema));
    return data ?? [];
  }
);

export async function listDirectoryEntities(
  filters: DirectoryFilterQuery
): Promise<DirectoryEntitySummary[]> {
  const params = new URLSearchParams();
  if (filters.categoryPath) params.set('category_path', filters.categoryPath);
  if (filters.type) params.set('type', filters.type);
  if (filters.search) params.set('search', filters.search);
  if (filters.ratingMin) params.set('rating_min', String(filters.ratingMin));
  if (filters.verifiedOnly) params.set('verified_only', 'true');
  if (filters.city) params.set('city', filters.city);
  if (filters.limit) params.set('limit', String(filters.limit));

  const response = await backendRequest(`/public/directory/entities?${params.toString()}`);
  const entities = await readData(response, z.array(directoryEntitySummarySchema));
  return entities ?? [];
}

export const getDirectoryEntity = cache(
  async (slug: string): Promise<DirectoryEntityDetail | null> => {
    const response = await backendRequest(`/public/directory/entities/${encodeURIComponent(slug)}`);
    return readData(response, directoryEntityDetailSchema);
  }
);

export async function listDirectoryReviews(
  entityId: string,
  filters: ListReviewsQuery
): Promise<EntityReviewsResponse | null> {
  const params = new URLSearchParams();
  if (filters.sortBy) params.set('sort_by', filters.sortBy);
  if (filters.rating) params.set('rating', String(filters.rating));
  if (filters.limit) params.set('limit', String(filters.limit));

  const response = await backendRequest(
    `/public/directory/entities/${encodeURIComponent(entityId)}/reviews?${params.toString()}`
  );
  return readData(response, entityReviewsResponseSchema);
}

export const getEntityPlans = cache(
  async (entityId: string): Promise<EntityPlan[]> => {
    const response = await backendRequest(
      `/public/directory/entities/${encodeURIComponent(entityId)}/plans`
    );
    const plans = await readData(response, z.array(entityPlanSchema));
    return plans ?? [];
  }
);

export const getEntityPaymentConfig = cache(
  async (entityId: string): Promise<EntityPaymentConfig | null> => {
    const response = await backendRequest(
      `/public/directory/entities/${encodeURIComponent(entityId)}/payment-config`
    );
    return readData(response, entityPaymentConfigSchema);
  }
);

