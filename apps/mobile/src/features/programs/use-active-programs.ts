import { useQuery } from '@tanstack/react-query';
import { programService } from '@/api/services';

export const activeProgramsKey = ['programs', 'active'] as const;

/** Programas activos (pesas y cardio). Cualquier cambio invalida `['programs']`. */
export function useActivePrograms() {
  return useQuery({
    queryKey: activeProgramsKey,
    queryFn: () => programService.active(),
    staleTime: 30_000,
  });
}
