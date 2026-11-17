'use client';

import { useQuery } from '@tanstack/react-query';
import { Search } from 'lucide-react';
import Link from 'next/link';
import { useState } from 'react';
import { queryKeys } from '@/shared/api/query-keys';
import { ErrorPanel } from '@/shared/components/feedback/error-panel';
import { SkeletonList } from '@/shared/components/feedback/skeleton';
import { PersonAvatar } from '@/shared/components/media/person-avatar';
import { InputWithIcon } from '@/shared/components/ui/input';
import { useDebouncedValue } from '@/shared/hooks/use-debounced-value';
import { gymGateOf, personAffiliationsService } from '../../services/affiliations-client';
import { GymGateState } from './gym-gate-state';

/**
 * «Socios» of the person's confirmed gym (`GET /me/gym/members`): those who
 * show their membership and have their social profile on, by name. The gym
 * is never a parameter; without one the 403 is a state.
 */
export function GymMembers() {
  const [search, setSearch] = useState('');
  const q = useDebouncedValue(search.trim(), 250);
  const members = useQuery({
    queryKey: queryKeys.myGymMembers(q),
    queryFn: () => personAffiliationsService.members({ q: q || undefined, limit: 50 }),
    placeholderData: (previous) => previous,
  });
  const gate = gymGateOf(members.error);
  return (
    <section aria-labelledby="gym-members-title" className="grid gap-4">
      <h2 className="t-headline" id="gym-members-title">
        Socios
      </h2>
      {gate ? (
        <GymGateState status={gate} />
      ) : (
        <>
          <InputWithIcon aria-label="Buscar socios por nombre" icon={<Search aria-hidden className="size-4" />} onChange={(event) => setSearch(event.target.value)} placeholder="Busca por nombre…" type="search" value={search} />
          {members.isPending ? (
            <SkeletonList rows={3} />
          ) : members.isError ? (
            <ErrorPanel error={members.error} message="No pudimos cargar a los socios." onRetry={() => void members.refetch()} />
          ) : members.data.length === 0 ? (
            <p className="t-subhead text-[var(--text-muted)]">{q ? 'Nadie con ese nombre.' : 'Todavía nadie más muestra que es socio.'}</p>
          ) : (
            <ul className="m-0 grid list-none gap-1 p-0">
              {members.data.map((member) => (
                <li key={member.userId}>
                  <Link className="tap flex min-h-12 items-center gap-3 rounded-[var(--radius-lg)] px-2 py-2 hover:bg-[var(--surface)]" href={`/perfil/${member.userId}`}>
                    <PersonAvatar name={member.displayName} photoUrl={member.photoUrl} />
                    <span className="min-w-0 flex-1 truncate font-semibold">{member.displayName}</span>
                    {member.points !== null ? <span className="t-footnote tabular-nums text-[var(--text-muted)]">{`${member.points.toLocaleString('es-ES')} pts`}</span> : null}
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </>
      )}
    </section>
  );
}
