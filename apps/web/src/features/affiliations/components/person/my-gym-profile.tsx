'use client';

import { myGymCardOf } from '@gymsheet/domain';
import { Building2 } from 'lucide-react';
import { NavRow } from '@/shared/components/mobile/nav-row';
import { RowGlyph } from '@/features/profile/components/profile-rows';
import { GymBadge } from './gym-badge';
import { useMyGym } from './use-my-gym';

/** «Mi gimnasio» in the profile's activity list: its state in the subtitle. */
export function MyGymNavRow() {
  const myGym = useMyGym();
  const subtitle = myGym.isPending ? 'Cargando…' : myGym.isError ? 'No se pudo cargar tu gimnasio' : myGymCardOf(myGym.data).title;
  return <NavRow href="/mi-gimnasio" leading={<RowGlyph icon={Building2} />} subtitle={subtitle} title="Mi gimnasio" />;
}

/** «Socio de X» on the own profile: only a confirmed membership the person shows, as others see it. */
export function MyGymBadge() {
  const myGym = useMyGym();
  const data = myGym.data;
  if (data?.status !== 'CONFIRMED' || !data.membershipVisible) return null;
  return <GymBadge badge={data.gym} />;
}
