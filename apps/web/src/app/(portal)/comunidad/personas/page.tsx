import type { Metadata } from 'next';
import { CommunityPeopleClient } from '@/features/social/components/community-people-client';
import { requireSession } from '@/shared/server/session';

export const metadata: Metadata = { title: 'Personas del gimnasio' };

/**
 * El directorio de personas (stories, podio y buscador). En el móvil
 * Comunidad es la baraja; este listado se abre desde su menú «⋯».
 */
export default async function CommunityPeoplePage() {
  const session = await requireSession();
  return (
    <CommunityPeopleClient
      sessionName={session.nombreCompleto ?? session.email}
      sessionUserId={session.id}
    />
  );
}
