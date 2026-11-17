import { queryKeys } from '@gymsheet/hooks';
import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';
import { ErrorState, RowsSkeleton } from '@/components/feedback';
import { Card, Divider, Section } from '@/components/layout';
import { NavRow } from '@/components/list';
import { PersonAvatar } from '@/components/person-avatar';
import { Text } from '@/components/text';
import { Input } from '@/components/ui';
import { useDebouncedValue } from '@/features/marketplace/use-debounced-value';
import { gymGateOf, personAffiliationsService } from './affiliations-service';
import { GymGateState } from './gym-gate-state';

/** «Socios» of the confirmed gym (`GET /me/gym/members`): those who show it, by name. */
export function GymMembers() {
  const router = useRouter();
  const [search, setSearch] = useState('');
  const q = useDebouncedValue(search.trim(), 250);
  const members = useQuery({
    queryKey: queryKeys.myGymMembers(q),
    queryFn: () => personAffiliationsService.members({ q: q || undefined, limit: 50 }),
    placeholderData: (previous) => previous,
  });
  const gate = gymGateOf(members.error);
  return (
    <Section icon="people-outline" title="Socios">
      {gate ? (
        <GymGateState status={gate} />
      ) : (
        <>
          <Input autoCapitalize="none" icon="search" label="Buscar socios por nombre" labelHidden onChangeText={setSearch} placeholder="Busca por nombre…" value={search} />
          {members.isPending ? (
            <RowsSkeleton rows={3} />
          ) : members.isError ? (
            <ErrorState error={members.error} onRetry={() => void members.refetch()} />
          ) : members.data.length === 0 ? (
            <Text tone="secondary" variant="subhead">{q ? 'Nadie con ese nombre.' : 'Todavía nadie más muestra que es socio.'}</Text>
          ) : (
            <Card list>
              {members.data.map((member, index) => (
                <View key={member.userId}>
                  {index > 0 ? <Divider /> : null}
                  <NavRow
                    leading={<PersonAvatar id={member.userId} name={member.displayName} photoUrl={member.photoUrl} />}
                    onPress={() => router.push({ pathname: '/perfil/[userId]', params: { userId: member.userId } })}
                    subtitle={member.points !== null ? `${member.points.toLocaleString('es-ES')} pts` : undefined}
                    title={member.displayName}
                  />
                </View>
              ))}
            </Card>
          )}
        </>
      )}
    </Section>
  );
}
