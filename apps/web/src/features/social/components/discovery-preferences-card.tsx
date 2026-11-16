'use client';

import { discoveryPreferencesBlocker } from '@gymsheet/domain';
import { Check, Dumbbell, Heart, Users } from 'lucide-react';
import { useId, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { notify } from '@/shared/notifications';
import { socialService } from '@/features/social/services/social-service';
import { Button } from '@/shared/components/ui/button';
import { Card, CardContent } from '@/shared/components/ui/card';
import { Checkbox } from '@/shared/components/ui/checkbox';
import { ChoiceChip } from '@/shared/components/ui/choice-chip';
import { Input } from '@/shared/components/ui/input';

const genders = ['MALE', 'FEMALE'] as const;
const intents = ['TRAINING', 'FRIENDSHIP', 'DATING'] as const;
const INTENTS = {
  TRAINING: { label: 'Entrenar', Icon: Dumbbell },
  FRIENDSHIP: { label: 'Amistad', Icon: Users },
  DATING: { label: 'Citas', Icon: Heart },
} as const;
/** Rótulo de campo como el del móvil: pequeño, en mayúsculas y espaciado. */
const FIELD_LABEL = 'text-xs font-semibold uppercase tracking-[0.04em] text-[var(--text-muted)]';

export function DiscoveryPreferencesCard({
  embedded = false,
  onSaved,
}: Readonly<{
  /** Dentro de Comunidad: sin la cabecera, que ya pone la pantalla. */
  embedded?: boolean;
  onSaved?: () => void;
}> = {}) {
  const client = useQueryClient();
  const query = useQuery({ queryKey: ['social', 'discovery-preferences'], queryFn: socialService.getDiscoveryPreferences });
  const save = useMutation({
    mutationFn: socialService.updateDiscoveryPreferences,
    onSuccess: async () => {
      await client.invalidateQueries({ queryKey: ['social', 'discovery-preferences'] });
      notify.success('Preferencias de Conocer guardadas.');
      onSaved?.();
    },
    onError: (error: Error) => notify.error(error),
  });
  if (query.isPending || !query.data) return null;
  return <PreferencesForm embedded={embedded} key={query.data?.version ?? 'unconfigured'} initial={query.data} saving={save.isPending} onSave={(input) => save.mutate(input)} />;
}

type InitialPreferences = Awaited<ReturnType<typeof socialService.getDiscoveryPreferences>>;

function PreferencesForm({ embedded, initial, saving, onSave }: { embedded: boolean; initial: InitialPreferences; saving: boolean; onSave: (input: Parameters<typeof socialService.updateDiscoveryPreferences>[0]) => void }) {
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

  // A disabled save says why (repp-diseno §8): the first thing still missing.
  const blockerId = useId();
  const blocker = discoveryPreferencesBlocker({ genders: selectedGenders, intents: selectedIntents, minAge, maxAge, radiusKm });

  return (
    <Card>
      {/* The heading lives outside the card (`Section` on the profile); Comunidad brings its own. */}
      <CardContent className="grid gap-4 [overflow-wrap:anywhere]">
        {embedded ? null : <p className="t-subhead hyphens-auto text-[var(--text-muted)] [overflow-wrap:anywhere]">Se aplican a las recomendaciones. Si no las configuras, la baraja no adivina por ti.</p>}
        <fieldset className="grid gap-2">
          <legend className={FIELD_LABEL}>Quiero conocer</legend>
          <div className="flex flex-wrap gap-2">{genders.map((gender) => (
            <ChoiceChip key={gender} onClick={() => toggle(selectedGenders, gender, setSelectedGenders)} selected={selectedGenders.includes(gender)}>
              {selectedGenders.includes(gender) ? <Check aria-hidden className="mr-1.5 size-4" /> : null}
              {gender === 'MALE' ? 'Hombres' : 'Mujeres'}
            </ChoiceChip>
          ))}</div>
        </fieldset>
        <fieldset className="grid gap-2">
          <legend className={FIELD_LABEL}>Busco</legend>
          <div className="flex flex-wrap gap-2">{intents.map((intent) => {
            const { label, Icon } = INTENTS[intent];
            const selected = selectedIntents.includes(intent);
            return (
              <ChoiceChip key={intent} onClick={() => toggle(selectedIntents, intent, setSelectedIntents)} selected={selected}>
                {selected ? <Check aria-hidden className="mr-1.5 size-4" /> : <Icon aria-hidden className="mr-1.5 size-4" />}
                {label}
              </ChoiceChip>
            );
          })}</div>
        </fieldset>
        {/* Three across while they fit; they wrap at 320 px with very large text instead of pushing the page wide. */}
        <div className="grid grid-cols-[repeat(auto-fit,minmax(min(100%,6rem),1fr))] gap-3">
          <label className="grid gap-1.5"><span className={FIELD_LABEL}>Edad mín.</span><Input className="min-w-0 text-center" type="number" min={18} max={100} value={minAge} onChange={(event) => setMinAge(Number(event.target.value))} /></label>
          <label className="grid gap-1.5"><span className={FIELD_LABEL}>Edad máx.</span><Input className="min-w-0 text-center" type="number" min={18} max={100} value={maxAge} onChange={(event) => setMaxAge(Number(event.target.value))} /></label>
          <label className="grid gap-1.5"><span className={FIELD_LABEL}>Radio (km)</span><Input className="min-w-0 text-center" type="number" min={1} max={500} value={radiusKm} onChange={(event) => setRadiusKm(Number(event.target.value))} /></label>
        </div>
        <div className="grid gap-2">
          <Checkbox checked={flexibleAge} label="Ampliar un poco la edad si hay pocas personas" onChange={(event) => setFlexibleAge(event.target.checked)} />
          <Checkbox checked={flexibleDistance} label="Ampliar un poco la distancia si hay pocas personas" onChange={(event) => setFlexibleDistance(event.target.checked)} />
        </div>
        {blocker ? <p className="t-footnote text-[var(--text-muted)]" id={blockerId}>{blocker}</p> : null}
        <Button aria-describedby={blocker ? blockerId : undefined} className="w-full whitespace-normal text-center" variant={embedded ? 'primary' : 'secondary'} disabled={saving || blocker !== null} onClick={() => onSave({
          genders: selectedGenders, intents: selectedIntents, minAge, maxAge, radiusKm, flexibleAge, flexibleDistance, expectedVersion: currentVersion,
        })}>{saving ? 'Guardando…' : embedded ? 'Buscar compañeros' : 'Guardar preferencias'}</Button>
      </CardContent>
    </Card>
  );
}
