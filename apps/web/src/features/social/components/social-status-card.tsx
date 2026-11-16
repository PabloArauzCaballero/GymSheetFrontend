'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Eye, EyeOff } from 'lucide-react';
import { useState } from 'react';
import { notify } from '@/shared/notifications';
import { useDraftReport } from '@/features/profile/lib/unsaved-guard';
import { socialService } from '@/features/social/services/social-service';
import type { SocialStatusValue } from '@/shared/api/schemas';
import { socialStatusValues } from '@/shared/api/schemas';
import { queryKeys } from '@/shared/api/query-keys';
import { Section } from '@/shared/components/mobile/section';
import { Card, CardContent } from '@/shared/components/ui/card';
import { Button } from '@/shared/components/ui/button';
import { Field } from '@/shared/components/ui/field';
import { Select } from '@/shared/components/ui/select';
import { LoadingPanel } from '@/shared/components/feedback/loading-panel';
import { SAVE_ROW, SaveStatusLine, useSectionSave } from '@/shared/components/feedback/save-status';
import { socialStatusLabels } from './social-status-labels';

const SOCIAL_SAVE_KEY = ['profile', 'social-status'] as const;

/** Tu estado social: solo lo ve quien tenga una conexión aceptada contigo Y lo marques visible. */
export function SocialStatusCard() {
  const queryClient = useQueryClient();
  const status = useQuery({
    queryKey: queryKeys.socialStatus,
    queryFn: socialService.getSocialStatus,
  });
  // Overrides solo existen una vez que la persona toca el control; hasta
  // entonces se muestra directo lo que trajo la consulta, sin copiarlo a
  // estado local con un efecto (no hay dos fuentes de verdad que sincronizar).
  const [valueOverride, setValueOverride] = useState<SocialStatusValue | '' | null>(null);
  const [visibleOverride, setVisibleOverride] = useState<boolean | null>(null);
  const value = valueOverride ?? status.data?.socialStatus ?? '';
  const visible = visibleOverride ?? status.data?.visible ?? false;
  const dirty = value !== (status.data?.socialStatus ?? '') || visible !== (status.data?.visible ?? false);

  const save = useMutation({
    mutationKey: SOCIAL_SAVE_KEY,
    mutationFn: () =>
      socialService.updateSocialStatus({ socialStatus: value === '' ? null : value, visible }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: queryKeys.socialStatus });
      // The overrides go: the saved value is the server's again, so the section reads clean.
      setValueOverride(null);
      setVisibleOverride(null);
    },
    onError: (error: Error) => notify.error(error),
  });

  const saveStatus = useSectionSave(SOCIAL_SAVE_KEY, dirty);
  useDraftReport('social-status', dirty);
  if (status.isLoading) return <LoadingPanel rows={2} />;

  return (
    <Section title="Tu estado social">
    <Card>
      <CardContent className="grid gap-4 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-end">
        <p className="t-subhead text-[var(--text-muted)] sm:col-span-full">Solo lo ven tus conexiones aceptadas, y solo si lo dejas visible.</p>
        <Field htmlFor="social-status" label="Estado">
          <Select
            id="social-status"
            onChange={(event) => setValueOverride(event.target.value as SocialStatusValue | '')}
            value={value}
          >
            <option value="">Prefiero no decirlo</option>
            {socialStatusValues.map((option) => (
              <option key={option} value={option}>
                {socialStatusLabels[option]}
              </option>
            ))}
          </Select>
        </Field>
        <Button
          aria-pressed={visible}
          onClick={() => setVisibleOverride(!visible)}
          type="button"
          variant={visible ? 'secondary' : 'ghost'}
        >
          {visible ? <Eye className="size-4" /> : <EyeOff className="size-4" />}
          {visible ? 'Visible' : 'Oculto'}
        </Button>
        {/* The edit page's one save row: status left, the section's own save right. */}
        <div className={`${SAVE_ROW} sm:col-span-full`}>
          <SaveStatusLine saved="Estado social guardado." status={saveStatus} testId="social-status-save" />
          <Button disabled={!dirty} loading={save.isPending} onClick={() => save.mutate()} size="sm" variant="primary">
            Guardar estado
          </Button>
        </div>
      </CardContent>
    </Card>
    </Section>
  );
}
