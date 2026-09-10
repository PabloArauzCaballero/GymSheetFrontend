import type { MetadataRoute } from 'next';
import { listPublicBranches } from '@/features/public-facilities/services/public-facilities-server';
import { serverEnv } from '@/shared/config/env';

// Igual que en robots.ts: esto depende del backend real y de `APP_URL` de
// runtime, así que no puede quedar congelado en lo que existía al hacer build.
export const dynamic = 'force-dynamic';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const branches = await listPublicBranches({});
  return [
    { url: serverEnv.APP_URL, changeFrequency: 'weekly', priority: 1 },
    { url: `${serverEnv.APP_URL}/gimnasios`, changeFrequency: 'daily', priority: 0.9 },
    ...branches.map((branch) => ({
      url: `${serverEnv.APP_URL}/gimnasios/${branch.id}`,
      changeFrequency: 'weekly' as const,
      priority: 0.7,
    })),
  ];
}
