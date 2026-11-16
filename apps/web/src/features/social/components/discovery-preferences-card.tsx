'use client';

import { intentLabels } from '@gymsheet/domain';
import { Check, CircleHelp, Dumbbell, Heart, Users } from 'lucide-react';
import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { notify } from '@/shared/notifications';
import { directoryKeys } from '@/features/social/services/directory-keys';
import { socialService } from '@/features/social/services/social-service';
import { socialProfileKeys } from '@/features/social/services/social-profile-service';
import { genderChoiceOf, gendersFor, toggleIntent, type GenderChoice } from '@/features/social/lib/discovery-choices';
import { discoveryIntents, type DiscoveryIntent } from '@/shared/api/schemas';
import { ErrorPanel } from '@/shared/components/feedback/error-panel';
import { Button } from '@/shared/components/ui/button';
import { Card, CardContent, CardHeader } from '@/shared/components/ui/card';
import { Checkbox } from '@/shared/components/ui/checkbox';
import { ChoiceChip } from '@/shared/components/ui/choice-chip';
import { Input } from '@/shared/components/ui/input';

const GENDER_CHOICES: { value: GenderChoice; label: string }[] = [
  { value: 'MALE', label: 'Hombres' },
  { value: 'FEMALE', label: 'Mujeres' },
  { value: 'ALL', label: 'Todos' },
];
const INTENT_ICONS = { TRAINING: Dumbbell, FRIENDSHIP: Users, DATING: Heart, UNSURE: CircleHelp } as const;
/** Rótulo de campo como el del móvil: pequeño, en mayúsculas y espaciado. */
const FIELD_LABEL = 'text-xs font-semibold uppercase tracking-[0.04em] text-[var(--text-muted)]';

export function DiscoveryPreferencesCard({
  embedded = false,
  onSaved,
  submitLabel,
}: Readonly<{
  /** Dentro de Comunidad: sin la cabecera, que ya pone la pantalla. */
  embedded?: boolean;
  onSaved?: () => void;
  /** Overrides the save button copy (the Conocer onboarding says «Continuar»). */
  submitLabel?: string;
}> = {}) {
  const client = useQueryClient();
  const query = useQuery({ queryKey: directoryKeys.discoveryPreferences, queryFn: socialService.getDiscoveryPreferences });
  const save = useMutation({
    mutationFn: socialService.updateDiscoveryPreferences,
    onSuccess: async () => {
      await Promise.all([
        client.invalidateQueries({ queryKey: directoryKeys.discoveryPreferences }),
        client.invalidateQueries({ queryKey: socialProfileKeys.readiness }),
      ]);
      notify.success('Preferencias de Conocer guardadas.');
      onSaved?.();
    },
    onError: (error: Error) => notify.error(error),
  });
  // A failed load must not look like "no preferences": offer a retry instead.
  if (query.isError)
    return (
      <ErrorPanel
        message="No pudimos cargar tus preferencias de descubrimiento."
        onRetry={() => query.refetch()}
      />
    );
  if (query.isPending || !query.data) return null;
  return <PreferencesForm embedded={embedded} key={query.data?.version ?? 'unconfigured'} initial={query.data} saving={save.isPending} submitLabel={submitLabel} onSave={(input) => save.mutate(input)} />;
}

type InitialPreferences = Awaited<ReturnType<typeof socialService.getDiscoveryPreferences>>;

function PreferencesForm({ embedded, initial, saving, submitLabel, onSave }: { embedded: boolean; initial: InitialPreferences; saving: boolean; submitLabel: string | undefined; onSave: (input: Parameters<typeof socialService.updateDiscoveryPreferences>[0]) => void }) {
  const saved = initial?.configured ? initial : null;
  const [genderChoice, setGenderChoice] = useState<GenderChoice | null>(genderChoiceOf(saved?.genders ?? []));
  const [selectedIntents, setSelectedIntents] = useState<DiscoveryIntent[]>(saved?.intents ?? []);
  const [minAge, setMinAge] = useState(saved?.minAge ?? 18);
  const [maxAge, setMaxAge] = useState(saved?.maxAge ?? 65);
  const [radiusKm, setRadiusKm] = useState(saved?.radiusKm ?? 25);
  const [flexibleAge, setFlexibleAge] = useState(saved?.flexibleAge ?? false);
  const [flexibleDistance, setFlexibleDistance] = useState(saved?.flexibleDistance ?? false);
  const currentVersion = saved?.version ?? 0;
  const selectedGenders = genderChoice ? gendersFor(genderChoice) : [];

  return (
    <Card>
      {embedded ? null : (
        <CardHeader title="Preferencias de Conocer" description="Se aplican a las recomendaciones. Si no las configuras, la baraja no adivina por ti." />
      )}
      <CardContent className={embedded ? 'grid gap-4 pt-5' : 'grid gap-4'}>
        <fieldset className="grid gap-2">
          <legend className={FIELD_LABEL}>Quiero conocer</legend>
          <div className="flex flex-wrap gap-2">{GENDER_CHOICES.map(({ value, label }) => (
            <ChoiceChip key={value} onClick={() => setGenderChoice(value)} selected={genderChoice === value}>
              {genderChoice === value ? <Check aria-hidden className="mr-1.5 size-4" /> : null}
              {label}
            </ChoiceChip>
          ))}</div>
        </fieldset>
        <fieldset className="grid gap-2">
          <legend className={FIELD_LABEL}>Busco</legend>
          <div className="flex flex-wrap gap-2">{discoveryIntents.map((intent) => {
            const Icon = INTENT_ICONS[intent];
            const selected = selectedIntents.includes(intent);
            return (
              <ChoiceChip key={intent} onClick={() => setSelectedIntents(toggleIntent(selectedIntents, intent))} selected={selected}>
                {selected ? <Check aria-hidden className="mr-1.5 size-4" /> : <Icon aria-hidden className="mr-1.5 size-4" />}
                {intentLabels[intent]}
              </ChoiceChip>
            );
          })}</div>
          <p className="t-footnote text-[var(--text-muted)]">«Aún no lo sé» va sola: no se combina con otra opción.</p>
        </fieldset>
        <div className="grid grid-cols-3 gap-3">
          <label className="grid gap-1.5"><span className={FIELD_LABEL}>Edad mín.</span><Input className="text-center" type="number" min={18} max={100} value={minAge} onChange={(event) => setMinAge(Number(event.target.value))} /></label>
          <label className="grid gap-1.5"><span className={FIELD_LABEL}>Edad máx.</span><Input className="text-center" type="number" min={18} max={100} value={maxAge} onChange={(event) => setMaxAge(Number(event.target.value))} /></label>
          <label className="grid gap-1.5"><span className={FIELD_LABEL}>Radio (km)</span><Input className="text-center" type="number" min={1} max={500} value={radiusKm} onChange={(event) => setRadiusKm(Number(event.target.value))} /></label>
        </div>
        <div className="grid gap-2">
          <Checkbox checked={flexibleAge} label="Ampliar un poco la edad si hay pocas personas" onChange={(event) => setFlexibleAge(event.target.checked)} />
          <Checkbox checked={flexibleDistance} label="Ampliar un poco la distancia si hay pocas personas" onChange={(event) => setFlexibleDistance(event.target.checked)} />
        </div>
        <Button className="w-full" variant="primary" disabled={saving || !selectedGenders.length || !selectedIntents.length || minAge < 18 || maxAge < minAge || radiusKm < 1 || radiusKm > 500} onClick={() => onSave({
          genders: selectedGenders, intents: selectedIntents, minAge, maxAge, radiusKm, flexibleAge, flexibleDistance, expectedVersion: currentVersion,
        })}>{saving ? 'Guardando…' : (submitLabel ?? (embedded ? 'Buscar compañeros' : 'Guardar preferencias'))}</Button>
      </CardContent>
    </Card>
  );
}
