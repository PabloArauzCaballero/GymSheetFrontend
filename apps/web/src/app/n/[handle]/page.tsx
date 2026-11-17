import type { Metadata } from 'next';
import { notFound, permanentRedirect } from 'next/navigation';
import { getPublicProfile } from '@/features/business-listings/services/marketplace-server';
import { marketplaceViewer } from '@/features/business-listings/services/viewer-server';
import { PublicBusinessProfile } from '@/features/business/components/public-business-profile';
import { PublicFooter } from '@/features/public-facilities/components/public-footer';
import { PublicHeader } from '@/features/public-facilities/components/public-header';

type PageProps = { params: Promise<{ handle: string }> };

const handleOf = async (params: PageProps['params']) => decodeURIComponent((await params).handle).replace(/^@/u, '');

/** `/@handle` lands here (rewritten in `proxy.ts`): the public profile of an approved business. */
export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const result = await getPublicProfile(await handleOf(params));
  if (result.kind !== 'found') return { title: 'Negocio no encontrado' };
  const { entity, handle } = result.profile;
  return {
    title: `${entity.name} (@${handle})`,
    description: entity.headline ?? `${entity.name} en REPP.`,
    alternates: { canonical: `/@${handle}` },
  };
}

export default async function PublicHandlePage({ params }: PageProps) {
  const [result, viewer] = await Promise.all([getPublicProfile(await handleOf(params)), marketplaceViewer()]);
  if (result.kind === 'missing') notFound();
  // A renamed handle keeps working for 90 days: a permanent redirect to the new one.
  if (result.kind === 'redirect') permanentRedirect(`/@${encodeURIComponent(result.to)}`);
  return (
    <div className="flex min-h-dvh flex-col">
      <PublicHeader />
      <PublicBusinessProfile profile={result.profile} viewer={viewer} />
      <PublicFooter />
    </div>
  );
}
