import type { Metadata } from 'next';
import { notFound, permanentRedirect } from 'next/navigation';
import { PublicBusinessProfile } from '@/features/business/components/public-business-profile';
import { resolvePublicHandle } from '@/features/business/services/business-server';
import { PublicFooter } from '@/features/public-facilities/components/public-footer';
import { PublicHeader } from '@/features/public-facilities/components/public-header';

type PageProps = { params: Promise<{ handle: string }> };

/** `/@handle` lands here (rewritten in `proxy.ts`): the public profile of an approved business. */
export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const result = await resolvePublicHandle(decodeURIComponent((await params).handle));
  if (result.kind !== 'found') return { title: 'Negocio no encontrado' };
  return {
    title: `${result.entity.name} (@${result.handle})`,
    description: result.entity.headline ?? `${result.entity.name} en REPP.`,
    alternates: { canonical: `/@${result.handle}` },
  };
}

export default async function PublicHandlePage({ params }: PageProps) {
  const result = await resolvePublicHandle(decodeURIComponent((await params).handle));
  if (result.kind === 'missing') notFound();
  // A renamed handle keeps working for 90 days: a permanent redirect to the new one.
  if (result.kind === 'redirect') permanentRedirect(`/@${encodeURIComponent(result.to)}`);
  return (
    <div className="flex min-h-dvh flex-col">
      <PublicHeader />
      <PublicBusinessProfile entity={result.entity} handle={result.handle} />
      <PublicFooter />
    </div>
  );
}
