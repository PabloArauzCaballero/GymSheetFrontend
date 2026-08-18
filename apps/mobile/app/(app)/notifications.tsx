import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { Switch, Text, View } from 'react-native';
import { notificationPreferenceSchema } from '@gymsheet/schemas';
import type { NotificationPreference } from '@gymsheet/types';
import { apiClient } from '@/api/client';
import { ErrorState, Skeleton } from '@/components/feedback';
import { Card, Divider, Row, ScreenHeader, ScrollScreen, Section } from '@/components/layout';
import { BackLink } from '@/components/nav';
import { formatDate } from '@/lib/format';
import { notify } from '@/notifications';
import { colors, fontSizes, minTouchTarget, spacing } from '@/theme';

const PREFERENCES_PATH = '/notifications/preferences/me';
const PREFERENCES_KEY = ['notifications', 'preferences'] as const;

/**
 * The backend replaces the whole preference on every PATCH — the same body the
 * web form submits — so a single flipped switch travels with the rest of the
 * current values instead of a partial patch the server would read as "clear".
 */
type NotificationPreferenceInput = NotificationPreference & {
  metadata?: Record<string, unknown>;
};

/**
 * Kept next to the screen that owns it: this is the only place in the mobile app
 * that reads or writes notification preferences. The contract is validated with
 * the shared schema, so a backend change surfaces here and on the web at once.
 */
const notificationPreferenceService = {
  get: () => apiClient.request(PREFERENCES_PATH, notificationPreferenceSchema, { method: 'GET' }),
  update: (input: NotificationPreferenceInput) =>
    apiClient.request(PREFERENCES_PATH, notificationPreferenceSchema, {
      method: 'PATCH',
      body: input,
    }),
};

/**
 * Version of the consent text the user accepts by enabling the external channel.
 * The backend rejects `HTTP_GATEWAY` unless it arrives with a timestamp and a
 * version, so the switch has to carry both — it *is* the consent record.
 */
const CONSENT_VERSION = 'v1.0';

/** Night window applied when quiet hours are switched on. */
const QUIET_HOURS = { start: '22:00', end: '07:00' } as const;

/**
 * One preference as a labelled row. The whole row is at least a finger tall even
 * when the description wraps to a single line, and the switch carries the label
 * so a screen reader never announces a bare "activado".
 */
function PreferenceSwitch({
  label,
  description,
  accessibilityLabel,
  checked,
  disabled,
  onChange,
}: {
  label: string;
  description: string;
  accessibilityLabel: string;
  checked: boolean;
  disabled: boolean;
  onChange: (value: boolean) => void;
}) {
  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.md,
        minHeight: minTouchTarget,
        paddingVertical: spacing.xs,
      }}
    >
      <View style={{ flex: 1, gap: spacing.xs }}>
        <Text style={{ color: colors.text, fontSize: fontSizes.sm, fontWeight: '600' }}>
          {label}
        </Text>
        <Text style={{ color: colors.textMuted, fontSize: fontSizes.xs, lineHeight: 18 }}>
          {description}
        </Text>
      </View>
      <Switch
        accessibilityLabel={accessibilityLabel}
        accessibilityRole="switch"
        accessibilityState={{ checked, disabled }}
        disabled={disabled}
        // iOS paints the off track white by default, which is a hole on black.
        ios_backgroundColor={colors.surfaceHigh}
        onValueChange={onChange}
        thumbColor={disabled ? colors.textDisabled : colors.surfaceHigh}
        trackColor={{ false: colors.surfaceHigh, true: colors.volt }}
        value={checked}
      />
    </View>
  );
}

export default function NotificationsScreen() {
  const queryClient = useQueryClient();

  const preference = useQuery({
    queryKey: PREFERENCES_KEY,
    queryFn: () => notificationPreferenceService.get(),
  });

  /**
   * What the user just asked for, held only while the PATCH is in flight so the
   * switch answers the finger immediately. Clearing it on settle is what reverts
   * the row when the server refuses: the rendered value falls back to the last
   * confirmed server state.
   */
  const [draft, setDraft] = useState<NotificationPreference | null>(null);

  const save = useMutation({
    mutationFn: (next: NotificationPreference) =>
      notificationPreferenceService.update({ ...next, metadata: {} }),
    onSuccess: async () => {
      // Awaited before the draft is dropped, so the row never flashes the old
      // value between the response landing and the refetch resolving.
      await queryClient.invalidateQueries({ queryKey: PREFERENCES_KEY });
      notify.success('Preferencias actualizadas.');
    },
    onError: (error: unknown) => {
      notify.error(error);
    },
    onSettled: () => setDraft(null),
  });

  const current = draft ?? preference.data;
  // One switch at a time: a second PATCH sent while the first is unresolved
  // would race it and could persist the older of the two bodies.
  const saving = save.isPending;

  const apply = (changes: Partial<NotificationPreference>) => {
    if (!current || saving) return;
    const next = { ...current, ...changes };
    setDraft(next);
    save.mutate(next);
  };

  if (preference.isPending) {
    return (
      <ScrollScreen>
        <BackLink />
        <Skeleton height={90} />
        <Skeleton height={200} />
      </ScrollScreen>
    );
  }

  if (preference.isError || !current) {
    return (
      <ScrollScreen>
        <BackLink />
        <ErrorState error={preference.error} onRetry={() => void preference.refetch()} />
      </ScrollScreen>
    );
  }

  const externalChannel = current.canalPreferido === 'HTTP_GATEWAY';
  const quietHours = Boolean(current.horaSilencioInicio && current.horaSilencioFin);

  return (
    <ScrollScreen
      onRefresh={() => void preference.refetch()}
      refreshing={preference.isFetching && !saving}
    >
      <BackLink />
      <ScreenHeader
        subtitle="Avisos propios y consentimiento explícito para canales externos."
        title="Notificaciones"
      />

      <Section title="Avisos">
        <Card>
          <PreferenceSwitch
            accessibilityLabel="Recibir recordatorios de vencimiento de tu membresía"
            checked={current.recordatoriosVencimiento}
            description="Permite generar avisos según la configuración del plan."
            disabled={saving}
            label="Recordatorios de vencimiento"
            onChange={(value) => apply({ recordatoriosVencimiento: value })}
          />
        </Card>
      </Section>

      <Section index={1} title="Canal de entrega">
        <Card>
          <PreferenceSwitch
            accessibilityLabel="Enviar los avisos por el canal externo HTTP"
            checked={externalChannel}
            description="Al activarlo autorizas el envío fuera de la aplicación; al desactivarlo se revoca ese consentimiento."
            disabled={saving}
            label="Canal externo HTTP"
            onChange={(value) =>
              apply(
                value
                  ? {
                      canalPreferido: 'HTTP_GATEWAY',
                      // Flipping the switch is the consent itself: the backend
                      // refuses the external channel without both fields.
                      consentimientoExternoEn:
                        current.consentimientoExternoEn ?? new Date().toISOString(),
                      versionConsentimiento: current.versionConsentimiento ?? CONSENT_VERSION,
                    }
                  : {
                      canalPreferido: 'IN_APP',
                      consentimientoExternoEn: null,
                      versionConsentimiento: null,
                    },
              )
            }
          />
          {externalChannel ? (
            <>
              <Divider />
              <Row
                label="Consentimiento"
                value={
                  current.consentimientoExternoEn
                    ? formatDate(current.consentimientoExternoEn)
                    : 'Pendiente'
                }
              />
              <Row label="Versión" value={current.versionConsentimiento ?? '—'} />
            </>
          ) : (
            <>
              <Divider />
              <Row label="Canal actual" value="Dentro de la aplicación" />
            </>
          )}
        </Card>
      </Section>

      <Section index={2} title="Horario de silencio">
        <Card>
          <PreferenceSwitch
            accessibilityLabel={`Silenciar los avisos entre las ${QUIET_HOURS.start} y las ${QUIET_HOURS.end}`}
            checked={quietHours}
            description={`No recibirás avisos entre las ${QUIET_HOURS.start} y las ${QUIET_HOURS.end}.`}
            disabled={saving}
            label="Silenciar de noche"
            onChange={(value) =>
              apply(
                value
                  ? { horaSilencioInicio: QUIET_HOURS.start, horaSilencioFin: QUIET_HOURS.end }
                  : { horaSilencioInicio: null, horaSilencioFin: null },
              )
            }
          />
          {quietHours ? (
            <>
              <Divider />
              <Row
                label="Silencio"
                value={`${current.horaSilencioInicio ?? '—'} – ${current.horaSilencioFin ?? '—'}`}
              />
            </>
          ) : null}
        </Card>
      </Section>
    </ScrollScreen>
  );
}
