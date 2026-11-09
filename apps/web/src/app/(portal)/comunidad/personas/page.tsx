import type { Metadata } from 'next';
import { CommunityPeopleClient } from '@/features/social/components/community-people-client';

export const metadata: Metadata = { title: 'Personas del gimnasio' };

/**
 * El directorio de personas (podio y buscador). En el móvil Comunidad es la
 * baraja y las historias viven en Mensajes; este listado se abre desde «⋯».
 */
export default function CommunityPeoplePage() {
  return <CommunityPeopleClient />;
}
