import type { Metadata } from 'next';
import { MyGymPage } from '@/features/affiliations/components/person/my-gym-page';

export const metadata: Metadata = { title: 'Mi gimnasio' };

/** «Mi gimnasio» (franja 7c): the confirmed SOCIO affiliation, its ranking and its members. */
export default function MiGimnasioPage() {
  return <MyGymPage />;
}
