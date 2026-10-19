'use client';

import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { notify } from '@/shared/notifications';
import { socialService } from '@/features/social/services/social-service';
import { Button } from '@/shared/components/ui/button';
import { Card, CardContent, CardHeader } from '@/shared/components/ui/card';
import { Input } from '@/shared/components/ui/input';

const genders = ['MALE', 'FEMALE'] as const;
const intents = ['TRAINING', 'FRIENDSHIP', 'DATING'] as const;

export function DiscoveryPreferencesCard() {
  const client = useQueryClient();
  const query = useQuery({ queryKey: ['social', 'discovery-preferences'], queryFn: socialService.getDiscoveryPreferences });
  const save = useMutation({
    mutationFn: socialService.updateDiscoveryPreferences,
    onSuccess: async () => {
      await client.invalidateQueries({ queryKey: ['social', 'discovery-preferences'] });
      notify.success('Preferencias de Conocer guardadas.');
    },
    onError: (error: Error) => notify.error(error),
  });
  if (query.isPending || !query.data) return null;
  return <PreferencesForm key={query.data?.version ?? 'unconfigured'} initial={query.data} saving={save.isPending} onSave={(input) => save.mutate(input)} />;
}

type InitialPreferences = Awaited<ReturnType<typeof socialService.getDiscoveryPreferences>>;

function PreferencesForm({ initial, saving, onSave }: { initial: InitialPreferences; saving: boolean; onSave: (input: Parameters<typeof socialService.updateDiscoveryPreferences>[0]) => void }) {
  const saved = initial?.configured ? initial : null;
  const [selectedGenders, setSelectedGenders] = useState<('MALE' | 'FEMALE')[]>(saved?.genders ?? []);
  const [selectedIntents, setSelectedIntents] = useState<('TRAINING' | 'FRIENDSHIP' | 'DATING')[]>(saved?.intents ?? []);
  const [minAge, setMinAge] = useState(saved?.minAge ?? 18);
  const [maxAge, setMaxAge] = useState(saved?.maxAge ?? 65);
  const [radiusKm, setRadiusKm] = useState(saved?.radiusKm ?? 25);
  const [flexibleAge, setFlexibleAge] = useState(saved?.flexibleAge ?? false);
  const [flexibleDistance, setFlexibleDistance] = useState(saved?.flexibleDistance ?? false);
  const currentVersion = saved?.version ?? 0;
  const toggle = <T extends string>(values: T[], value: T, set: (next: T[]) => void) =>
    set(values.includes(value) ? values.filter((entry) => entry !== value) : [...values, value]);

  return (
    <Card>
      <CardHeader title="Preferencias de Conocer" description="Se aplican a las recomendaciones. Si no las configuras, la baraja no adivina por ti." />
      <CardContent className="grid gap-4">
        <fieldset className="grid gap-2">
          <legend className="text-sm font-medium">Quiero conocer</legend>
          <div className="flex flex-wrap gap-2">{genders.map((gender) => (
            <Button key={gender} variant={selectedGenders.includes(gender) ? 'primary' : 'secondary'} onClick={() => toggle(selectedGenders, gender, setSelectedGenders)}>
              {gender === 'MALE' ? 'Hombres' : 'Mujeres'}
            </Button>
          ))}</div>
        </fieldset>
        <fieldset className="grid gap-2">
          <legend className="text-sm font-medium">Busco</legend>
          <div className="flex flex-wrap gap-2">{intents.map((intent) => (
            <Button key={intent} variant={selectedIntents.includes(intent) ? 'primary' : 'secondary'} onClick={() => toggle(selectedIntents, intent, setSelectedIntents)}>
              {{ TRAINING: 'Entrenar', FRIENDSHIP: 'Amistad', DATING: 'Citas' }[intent]}
            </Button>
          ))}</div>
        </fieldset>
        <div className="grid grid-cols-3 gap-3">
          <label className="grid gap-1 text-sm">Edad mínima<Input type="number" min={18} max={100} value={minAge} onChange={(event) => setMinAge(Number(event.target.value))} /></label>
          <label className="grid gap-1 text-sm">Edad máxima<Input type="number" min={18} max={100} value={maxAge} onChange={(event) => setMaxAge(Number(event.target.value))} /></label>
          <label className="grid gap-1 text-sm">Radio (km)<Input type="number" min={1} max={500} value={radiusKm} onChange={(event) => setRadiusKm(Number(event.target.value))} /></label>
        </div>
        <label className="flex gap-2 text-sm"><input type="checkbox" checked={flexibleAge} onChange={(event) => setFlexibleAge(event.target.checked)} />Ampliar un poco el rango de edad si hay pocas personas</label>
        <label className="flex gap-2 text-sm"><input type="checkbox" checked={flexibleDistance} onChange={(event) => setFlexibleDistance(event.target.checked)} />Ampliar un poco la distancia si hay pocas personas</label>
        <Button disabled={saving || !selectedGenders.length || !selectedIntents.length || minAge < 18 || maxAge < minAge || radiusKm < 1 || radiusKm > 500} onClick={() => onSave({
          genders: selectedGenders, intents: selectedIntents, minAge, maxAge, radiusKm, flexibleAge, flexibleDistance, expectedVersion: currentVersion,
        })}>{saving ? 'Guardando…' : 'Guardar preferencias'}</Button>
      </CardContent>
    </Card>
  );
}
