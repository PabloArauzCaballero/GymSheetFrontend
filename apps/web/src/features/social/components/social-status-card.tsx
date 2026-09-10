'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Eye, EyeOff } from 'lucide-react';
import { useState } from 'react';
import { notify } from '@/shared/notifications';
import { socialService } from '@/features/social/services/social-service';
import type { SocialStatusValue } from '@/shared/api/schemas';
import { socialStatusValues } from '@/shared/api/schemas';
import { queryKeys } from '@/shared/api/query-keys';
import { Card, CardContent, CardHeader } from '@/shared/components/ui/card';
import { Button } from '@/shared/components/ui/button';
import { Field } from '@/shared/components/ui/field';
import { Select } from '@/shared/components/ui/select';
import { LoadingPanel } from '@/shared/components/feedback/loading-panel';
import { socialStatusLabels } from './social-status-labels';

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

  const save = useMutation({
    mutationFn: () =>
      socialService.updateSocialStatus({ socialStatus: value === '' ? null : value, visible }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: queryKeys.socialStatus });
      notify.success('Estado social actualizado.');
    },
    onError: (error: Error) => notify.error(error),
  });

  if (status.isLoading) return <LoadingPanel rows={2} />;

  return (
    <Card>
      <CardHeader
        description="Solo lo ven tus conexiones aceptadas, y solo si lo dejas visible."
        title="Tu estado social"
      />
      <CardContent className="grid gap-4 sm:grid-cols-[minmax(0,1fr)_auto_auto] sm:items-end">
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
          onClick={() => setVisibleOverride(!visible)}
          type="button"
          variant={visible ? 'primary' : 'secondary'}
        >
          {visible ? <Eye className="size-4" /> : <EyeOff className="size-4" />}
          {visible ? 'Visible' : 'Oculto'}
        </Button>
        <Button loading={save.isPending} onClick={() => save.mutate()} variant="primary">
          Guardar
        </Button>
      </CardContent>
    </Card>
  );
}
