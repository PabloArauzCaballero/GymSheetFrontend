import { myGymCardOf } from '@gymsheet/domain';
import { queryKeys } from '@gymsheet/hooks';
import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import type { ReactNode } from 'react';
import { NavRow } from '@/components/list';
import { personAffiliationsService } from './affiliations-service';

/** «Mi gimnasio» in the profile's activity list: «Socio de X», «Solicitud enviada a X» or the way to join. */
export function MyGymNavRow({ leading }: { leading?: ReactNode }) {
  const router = useRouter();
  const myGym = useQuery({ queryKey: queryKeys.myGym, queryFn: personAffiliationsService.myGym, staleTime: 30_000 });
  const subtitle = myGym.isPending ? 'Cargando…' : myGym.isError ? 'No se pudo cargar tu gimnasio' : myGymCardOf(myGym.data).title;
  return <NavRow leading={leading} onPress={() => router.push('/mi-gimnasio')} subtitle={subtitle} testID="profile-my-gym" title="Mi gimnasio" />;
}
