import { useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { Linking, ScrollView, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { z } from 'zod';
import {
  membershipAccessSchema,
  membershipIntentSchema,
  membershipOptionsSchema,
  membershipPlanSchema,
} from '@gymsheet/schemas';
import type {
  Membership,
  MembershipAccess,
  MembershipIntent,
  MembershipPlan,
  MembershipProjection,
} from '@gymsheet/types';
import { apiClient } from '@/api/client';
import { membershipService } from '@/api/services';
import { EmptyState, ErrorState, Skeleton } from '@/components/feedback';
import { Badge, Card, Divider, Row, ScreenHeader, ScrollScreen, Section, StatTile } from '@/components/layout';
import { MetricChip } from '@/components/list';
import { PressableScale } from '@/components/motion';
import { DateBridge, DateLeaf, StepProgress, type FlowStep } from '@/components/step-flow';
import { BackLink } from '@/components/nav';
import { Button } from '@/components/ui';
import { MEMBERSHIP_LABEL, MEMBERSHIP_TONE, formatDate } from '@/lib/format';
import { notify } from '@/notifications';
import { colors, fontSizes, iconSizes, minTouchTarget, radii, spacing } from '@/theme';

/**
 * Reads this screen owns. `getMine` already lives in the shared service; the
 * three catalogue endpoints are only ever needed here, so they stay local
 * instead of widening the app-wide surface. Contracts come from
 * `@gymsheet/schemas`, the same source the web validates against.
 */
const catalogue = {
  plans: () =>
    apiClient.request('/membership/plans', z.array(membershipPlanSchema), { method: 'GET' }),
  accesses: () =>
    apiClient.request('/me/accesses', z.array(membershipAccessSchema), { method: 'GET' }),
  options: () =>
    apiClient.request('/me/membership/options', membershipOptionsSchema, { method: 'GET' }),
  /**
   * Registers the intent to renew. This is deliberately *not* a purchase: the
   * backend answers with a PENDING_PAYMENT record and the gym confirms it after
   * the money actually arrives, which is why the screen then shows a QR to pay
   * rather than a success message.
   */
  renewalIntent: (planId: string, months: number) =>
    apiClient.request('/me/membership/renewal-intent', membershipIntentSchema, {
      method: 'POST',
      body: {
        planId,
        months,
        // The backend deduplicates on this, so a double tap cannot open two
        // pending intents for the same plan within the same minute.
        idempotencyKey: `renew-${planId}-${Math.floor(Date.now() / 60000)}`,
      },
    }),
};

type RenewalAction = MembershipProjection['renewalActions'][number];

const ACCESS_SOURCE_LABEL: Record<MembershipAccess['source'], string> = {
  MEMBERSHIP: 'Membresía',
  PURCHASE: 'Compra',
  ADMIN_GRANT: 'Otorgado',
  PROMOTION: 'Promoción',
  TRIAL: 'Prueba',
};

const TIME_FORMAT = new Intl.DateTimeFormat('es', { hour: '2-digit', minute: '2-digit' });

/** `14 ago · 18:30` — an access log is only useful with the hour attached. */
function formatDateTime(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '—';
  return `${formatDate(iso)} · ${TIME_FORMAT.format(date)}`;
}

/** `Bs 250` — currency stays after the amount only when the backend sends one. */
function formatPrice(plan: MembershipPlan): string {
  if (plan.precio === null) return 'Consultar';
  const amount = plan.precio.toLocaleString('es-BO');
  return plan.moneda ? `${amount} ${plan.moneda}` : amount;
}

function periodOf(item: Membership): string {
  return `${formatDate(item.iniciaEl)} – ${formatDate(item.venceEl)}`;
}

/**
 * Opens the gym's WhatsApp with the message the backend composed. `wa.me` needs
 * digits only — a stored `+591 700…` would otherwise resolve to an empty chat.
 */
async function openWhatsApp(action: RenewalAction): Promise<void> {
  const phone = action.phone.replace(/\D/gu, '');
  const url = `https://wa.me/${phone}?text=${encodeURIComponent(action.message)}`;
  try {
    // A device without WhatsApp (or a blocked scheme) fails silently otherwise:
    // the button would look broken instead of explaining itself.
    const supported = await Linking.canOpenURL(url);
    if (!supported) {
      notify.error('No se pudo abrir WhatsApp.');
      return;
    }
    await Linking.openURL(url);
  } catch {
    notify.error('No se pudo abrir WhatsApp.');
  }
}

/** Wide enough to read a price and three benefits, narrow enough that the next
 * card peeks in — the cue that tells a thumb there is more to compare. */
const PLAN_CARD_WIDTH = 210;

/**
 * The renewal is three questions, not one button: what am I renewing, when does
 * it run, and how do I pay. Showing the QR before the first two are answered is
 * what made the old flow feel like a payment demand rather than a decision.
 */
const RENEWAL_STEPS: readonly FlowStep[] = [
  { label: 'Confirmar', icon: 'help-circle-outline' },
  { label: 'Fechas', icon: 'calendar-outline' },
  { label: 'Pagar', icon: 'qr-code-outline' },
];

/** Adds whole days to an ISO date, returning ISO. */
function addDays(iso: string, days: number): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  date.setDate(date.getDate() + days);
  return date.toISOString();
}

export default function MembershipScreen() {
  /** Which plan the user is inspecting. Purely local — comparing is not buying. */
  const [selectedPlanId, setSelectedPlanId] = useState<string | null>(null);
  /** The pending intent created in this session, if any. */
  const [intent, setIntent] = useState<MembershipIntent | null>(null);
  /** 0 confirmar · 1 fechas · 2 pagar. */
  const [step, setStep] = useState(0);

  const projection = useQuery({
    queryKey: ['membership', 'me'],
    queryFn: () => membershipService.getMine(),
  });
  const plans = useQuery({
    queryKey: ['membership', 'plans'],
    queryFn: () => catalogue.plans(),
  });
  const accesses = useQuery({
    queryKey: ['membership', 'accesses'],
    queryFn: () => catalogue.accesses(),
  });
  const options = useQuery({
    queryKey: ['membership', 'options'],
    queryFn: () => catalogue.options(),
  });

  // Every section renders its own loading/error/empty state: a failing catalogue
  // must never hide the membership the user actually came to check.
  const refreshing =
    projection.isFetching || plans.isFetching || accesses.isFetching || options.isFetching;

  const membership = projection.data?.membership ?? null;
  const pendingPayment = projection.data?.paymentStatus === 'PENDING_PAYMENT';
  const renewalActions = projection.data?.renewalActions ?? [];
  const history = projection.data?.history ?? [];
  // Which plans the backend currently offers this user; used to flag the rest as
  // display-only. An options failure simply means nothing gets flagged.
  const offeredPlanIds = new Set(options.data?.plans.map((plan) => plan.id) ?? []);
  const paymentQr = options.data?.paymentQr ?? null;

  // A renewal does not start today: it picks up where the current period ends,
  // which is the single fact people want confirmed before paying.

  /**
   * What "Renovar" will actually renew: the plan the user is inspecting when it
   * is one the backend offers, otherwise the first offered plan. Falling back
   * keeps the button meaningful before anyone has tapped a card.
   */
  const renewablePlan =
    options.data?.plans.find((plan) => plan.id === selectedPlanId) ?? options.data?.plans[0] ?? null;
  const renewalStartsIso = membership?.venceEl ?? new Date().toISOString();
  const renewalEndsIso = addDays(renewalStartsIso, renewablePlan?.duracionDias ?? 30);

  const renewal = useMutation({
    mutationFn: (plan: MembershipPlan) =>
      catalogue.renewalIntent(plan.id, Math.max(1, Math.round(plan.duracionDias / 30))),
    onSuccess: (created) => {
      setIntent(created);
      setStep(2);
      notify.success('Solicitud registrada. Escanea el QR para pagar.');
    },
    onError: (error: Error) => notify.error(error),
  });

  return (
    <ScrollScreen
      onRefresh={() => {
        void projection.refetch();
        void plans.refetch();
        void accesses.refetch();
        void options.refetch();
      }}
      refreshing={refreshing}
    >
      <BackLink />
      <ScreenHeader
        subtitle="Tu plan, tus accesos y las opciones para renovar."
        title="Membresía"
      />

      <Section index={0} title="Estado actual">
        {projection.isPending ? (
          <Skeleton height={220} />
        ) : projection.isError ? (
          <ErrorState error={projection.error} onRetry={() => void projection.refetch()} />
        ) : membership ? (
          <Card accent={membership.vigenteHoy ? colors.volt : colors.warning}>
            <Text
              numberOfLines={2}
              style={{ color: colors.text, fontSize: fontSizes.lg, fontWeight: '700' }}
            >
              {membership.plan?.nombre ?? 'Mi membresía'}
            </Text>
            {membership.plan?.descripcion ? (
              <Text style={{ color: colors.textMuted, fontSize: fontSizes.sm, lineHeight: 20 }}>
                {membership.plan.descripcion}
              </Text>
            ) : null}

            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm }}>
              <Badge
                label={MEMBERSHIP_LABEL[membership.estado]}
                tone={MEMBERSHIP_TONE[membership.estado]}
              />
              {/* The one fact that changes what the user should do today. */}
              {membership.venceHoy ? <Badge label="Vence hoy" tone="warning" /> : null}
              {!membership.venceHoy && membership.vigenteHoy && membership.diasRestantes <= 7 ? (
                <Badge label="Próxima a vencer" tone="warning" />
              ) : null}
            </View>

            <View style={{ flexDirection: 'row', gap: spacing.sm }}>
              <StatTile
                label={membership.venceHoy ? 'Vence hoy' : 'Días restantes'}
                value={String(Math.max(membership.diasRestantes, 0))}
              />
              {membership.plan ? (
                <StatTile label="Duración del plan" value={`${membership.plan.duracionDias} d`} />
              ) : null}
            </View>

            <Divider />
            <Row label="Inicio" value={formatDate(membership.iniciaEl)} />
            <Divider />
            <Row label="Vencimiento" value={formatDate(membership.venceEl)} />

            {membership.plan?.beneficios.length ? (
              <>
                <Divider />
                {membership.plan.beneficios.map((benefit) => (
                  <Text
                    key={benefit}
                    style={{ color: colors.textMuted, fontSize: fontSizes.sm, lineHeight: 20 }}
                  >
                    {`· ${benefit}`}
                  </Text>
                ))}
              </>
            ) : null}
          </Card>
        ) : (
          <EmptyState
            icon="card-outline"
            message="Elige una opción para comenzar. El acceso solo se concede después de una confirmación válida."
            title="Aún no tienes membresía"
          />
        )}

        {/* Pending payment outranks everything else on this screen: the user may
            believe they already have access when they do not. */}
        {pendingPayment ? (
          <Card accent={colors.warning}>
            <Badge label="Pago pendiente" tone="warning" />
            <Text style={{ color: colors.text, fontSize: fontSizes.sm, fontWeight: '600' }}>
              Tu solicitud quedó registrada.
            </Text>
            <Text style={{ color: colors.textMuted, fontSize: fontSizes.sm, lineHeight: 20 }}>
              La membresía no se activará hasta confirmar el pago con el gimnasio.
            </Text>
          </Card>
        ) : null}
      </Section>

      <Section index={1} title="Renovar">
        <Card accent={step === 2 ? colors.volt : undefined}>
          <StepProgress current={step} steps={RENEWAL_STEPS} />

          {/* PASO 1 — confirmar qué se renueva */}
          {step === 0 ? (
            <>
              <Text style={{ color: colors.text, fontSize: fontSizes.md, fontWeight: '700' }}>
                {renewablePlan ? `¿Renovar «${renewablePlan.nombre}»?` : 'Sin plan disponible'}
              </Text>
              {renewablePlan ? (
                <>
                  <Row label="Precio" value={formatPrice(renewablePlan)} />
                  <Divider />
                  <Row label="Duración" value={`${renewablePlan.duracionDias} días`} />
                  <Text style={{ color: colors.textMuted, fontSize: fontSizes.sm, lineHeight: 20 }}>
                    Antes de pagar te mostraremos desde cuándo corre el nuevo periodo.
                  </Text>
                </>
              ) : (
                <Text style={{ color: colors.textMuted, fontSize: fontSizes.sm, lineHeight: 20 }}>
                  Ahora mismo el gimnasio no ofrece un plan para renovar. Consulta en recepción.
                </Text>
              )}
              <Button
                disabled={!renewablePlan}
                label="Continuar"
                onPress={() => setStep(1)}
              />
            </>
          ) : null}

          {/* PASO 2 — cuándo muere el actual y cuándo arranca el nuevo */}
          {step === 1 && renewablePlan ? (
            <>
              <Text style={{ color: colors.text, fontSize: fontSizes.md, fontWeight: '700' }}>
                Así quedarán tus fechas
              </Text>
              <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: spacing.xs }}>
                <DateLeaf
                  caption="Vence tu plan actual"
                  iso={membership?.venceEl ?? new Date().toISOString()}
                />
                <DateBridge />
                <DateLeaf
                  accent
                  caption="Arranca el nuevo"
                  iso={renewalStartsIso}
                />
                <DateBridge />
                <DateLeaf accent caption="Nuevo vencimiento" iso={renewalEndsIso} />
              </View>
              <Text style={{ color: colors.textMuted, fontSize: fontSizes.sm, lineHeight: 20 }}>
                No pierdes los días que te quedan: el nuevo periodo empieza cuando termina el
                actual.
              </Text>
              <Button
                label="Confirmar y pagar"
                loading={renewal.isPending}
                onPress={() => {
                  if (renewablePlan) renewal.mutate(renewablePlan);
                }}
              />
              <Button label="Volver" onPress={() => setStep(0)} variant="ghost" />
            </>
          ) : null}

          {/* PASO 3 — el QR, sólo aquí */}
          {step === 2 ? (
            <>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
                <Ionicons color={colors.volt} name="qr-code-outline" size={iconSizes.lg} />
                <Text style={{ color: colors.text, fontSize: fontSizes.md, fontWeight: '700', flex: 1 }}>
                  Escanea para pagar
                </Text>
                <Badge label="Pago pendiente" tone="warning" />
              </View>

              {paymentQr ? (
                // White plate behind the code: a QR on a dark surface is not
                // reliably readable — scanners expect dark modules on light.
                <View style={{ alignItems: 'center' }}>
                  <View style={{ padding: spacing.md, borderRadius: radii.lg, backgroundColor: '#ffffff' }}>
                    <Image
                      accessibilityLabel={paymentQr.altText}
                      contentFit="contain"
                      source={{ uri: paymentQr.url }}
                      style={{ width: 220, height: 220 }}
                    />
                  </View>
                </View>
              ) : (
                <Text style={{ color: colors.textMuted, fontSize: fontSizes.sm, lineHeight: 20 }}>
                  El gimnasio todavía no ha publicado su QR de cobro. Acércate a recepción para
                  completar el pago.
                </Text>
              )}

              <Text style={{ color: colors.textMuted, fontSize: fontSizes.sm, lineHeight: 20 }}>
                Tu solicitud quedó registrada. El acceso se activa cuando el gimnasio confirma el
                pago, no al escanear.
              </Text>
              {intent ? (
                <Button
                  label="Enviar comprobante por WhatsApp"
                  onPress={() => void Linking.openURL(intent.whatsappUrl)}
                  variant="ghost"
                />
              ) : null}
            </>
          ) : null}
        </Card>
      </Section>

      <Section index={2} title="Planes disponibles">
        {plans.isPending ? (
          <Skeleton height={190} />
        ) : plans.isError ? (
          <ErrorState error={plans.error} onRetry={() => void plans.refetch()} />
        ) : plans.data?.length ? (
          // A shop, not a settings list: cards sit side by side so plans can be
          // compared with a thumb, price leads, and each one carries its own
          // action. A vertical stack of expanded panels compares nothing.
          <ScrollView
            contentContainerStyle={{ gap: spacing.sm, paddingRight: spacing.lg }}
            horizontal
            showsHorizontalScrollIndicator={false}
            snapToAlignment="start"
            // Cards snap so browsing lands on a plan instead of between two.
            snapToInterval={PLAN_CARD_WIDTH + spacing.sm}
            decelerationRate="fast"
          >
            {plans.data.map((plan) => {
              const current = plan.id === membership?.planId;
              const offered = !options.isSuccess || offeredPlanIds.has(plan.id);
              const selected = plan.id === selectedPlanId;
              return (
                <PressableScale
                  accessibilityLabel={`${plan.nombre}. ${formatPrice(plan)}. ${plan.duracionDias} días.`}
                  key={plan.id}
                  // Selecting is always allowed, including for a plan the backend
                  // does not currently offer: comparing what a gym sells is the
                  // point of this row, and a card that cannot even be touched
                  // reads as broken rather than as unavailable. What availability
                  // governs is the action underneath, not the inspection.
                  onPress={() => setSelectedPlanId(selected ? null : plan.id)}
                  style={{
                    width: PLAN_CARD_WIDTH,
                    gap: spacing.sm,
                    borderRadius: radii.lg,
                    borderWidth: selected ? 2 : 1,
                    borderColor: selected || current ? colors.volt : colors.borderSubtle,
                    borderTopColor: selected || current ? colors.volt : colors.border,
                    backgroundColor: selected ? colors.surface : colors.surfaceLow,
                    padding: spacing.md,
                    opacity: offered || current ? 1 : 0.55,
                  }}
                >
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.xs }}>
                    <Text
                      numberOfLines={2}
                      style={{
                        flex: 1,
                        color: colors.text,
                        fontSize: fontSizes.sm,
                        fontWeight: '700',
                      }}
                    >
                      {plan.nombre}
                    </Text>
                    {current ? <Badge label="Actual" tone="success" /> : null}
                  </View>

                  {/* Price is the reason to look at a plan, so it is the
                      biggest thing on the card. */}
                  <Text
                    adjustsFontSizeToFit
                    numberOfLines={1}
                    style={{
                      color: colors.volt,
                      fontSize: fontSizes['2xl'],
                      fontWeight: '600',
                      fontVariant: ['tabular-nums'],
                      letterSpacing: fontSizes['2xl'] * -0.045,
                    }}
                  >
                    {formatPrice(plan)}
                  </Text>
                  <Text style={{ color: colors.textMuted, fontSize: fontSizes.xs }}>
                    {plan.duracionDias} días
                  </Text>

                  {plan.beneficios.length > 0 ? (
                    <View style={{ gap: 2 }}>
                      {/* Collapsed the list shows three and truncates each to a
                          line, which is enough to scan. Selecting expands it:
                          the moment someone is choosing, the benefits are the
                          decision, not decoration. */}
                      {(selected ? plan.beneficios : plan.beneficios.slice(0, 3)).map((benefit) => (
                        <Text
                          key={benefit}
                          numberOfLines={selected ? 3 : 1}
                          style={{ color: colors.textMuted, fontSize: fontSizes.xs, lineHeight: 16 }}
                        >
                          · {benefit}
                        </Text>
                      ))}
                      {!selected && plan.beneficios.length > 3 ? (
                        <Text style={{ color: colors.accentInk, fontSize: fontSizes.xs }}>
                          {`+${plan.beneficios.length - 3} más`}
                        </Text>
                      ) : null}
                    </View>
                  ) : null}

                  {current ? (
                    <Text
                      style={{
                        color: colors.textMuted,
                        fontSize: fontSizes.xs,
                        textAlign: 'center',
                        paddingVertical: spacing.xs,
                      }}
                    >
                      Tu plan actual
                    </Text>
                  ) : offered && renewalActions.length > 0 ? (
                    <Button
                      label="Consultar"
                      onPress={() => void openWhatsApp(renewalActions[0]!)}
                      style={{ minHeight: minTouchTarget }}
                    />
                  ) : (
                    // A bare "No disponible" says nothing the user can act on.
                    // These two states have different causes and different
                    // remedies, so they read differently.
                    <Text
                      style={{
                        color: colors.textDisabled,
                        fontSize: fontSizes.xs,
                        textAlign: 'center',
                        paddingVertical: spacing.xs,
                      }}
                    >
                      {offered ? 'Consulta en recepción' : 'No disponible para tu plan actual'}
                    </Text>
                  )}
                </PressableScale>
              );
            })}
          </ScrollView>
        ) : (
          <EmptyState
            icon="pricetags-outline"
            message="No hay opciones comerciales disponibles en este momento."
            title="Sin planes publicados"
          />
        )}
      </Section>

      <Section index={3} title="Historial">
        {projection.isPending ? (
          <Skeleton height={110} />
        ) : projection.isError ? (
          <ErrorState error={projection.error} onRetry={() => void projection.refetch()} />
        ) : history.length ? (
          <Card>
            {history.map((item, position) => (
              <View key={item.id} style={{ gap: spacing.sm }}>
                {position > 0 ? <Divider /> : null}
                <View style={{ gap: spacing.xs }}>
                  <View
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      gap: spacing.sm,
                    }}
                  >
                    <Text
                      numberOfLines={1}
                      style={{
                        flex: 1,
                        color: colors.text,
                        fontSize: fontSizes.sm,
                        fontWeight: '600',
                      }}
                    >
                      {item.plan?.nombre ?? 'Plan'}
                    </Text>
                    <Badge
                      label={MEMBERSHIP_LABEL[item.estado]}
                      tone={MEMBERSHIP_TONE[item.estado]}
                    />
                  </View>
                  <Text style={{ color: colors.textMuted, fontSize: fontSizes.sm }}>
                    {periodOf(item)}
                  </Text>
                </View>
              </View>
            ))}
          </Card>
        ) : (
          <EmptyState
            icon="time-outline"
            message="Aquí aparecerán tus membresías anteriores."
            title="Sin historial"
          />
        )}
      </Section>

      <Section index={4} title="Accesos recientes">
        {accesses.isPending ? (
          <Skeleton height={110} />
        ) : accesses.isError ? (
          <ErrorState error={accesses.error} onRetry={() => void accesses.refetch()} />
        ) : accesses.data?.length ? (
          <Card>
            {accesses.data.map((access, position) => (
              <View key={`${access.code}-${access.sourceId}`} style={{ gap: spacing.sm }}>
                {position > 0 ? <Divider /> : null}
                <View style={{ gap: spacing.xs }}>
                  <View
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      gap: spacing.sm,
                    }}
                  >
                    <Text
                      numberOfLines={1}
                      style={{
                        flex: 1,
                        color: colors.text,
                        fontSize: fontSizes.sm,
                        fontWeight: '600',
                      }}
                    >
                      {access.name}
                    </Text>
                    <Badge
                      label={ACCESS_SOURCE_LABEL[access.source]}
                      tone={access.source === 'MEMBERSHIP' ? 'success' : 'info'}
                    />
                  </View>
                  <Text style={{ color: colors.textMuted, fontSize: fontSizes.sm }}>
                    {access.endsAt
                      ? `${formatDateTime(access.startsAt)} → ${formatDateTime(access.endsAt)}`
                      : formatDateTime(access.startsAt)}
                  </Text>
                  {access.description ? (
                    <Text style={{ color: colors.textMuted, fontSize: fontSizes.xs, lineHeight: 18 }}>
                      {access.description}
                    </Text>
                  ) : null}
                </View>
              </View>
            ))}
          </Card>
        ) : (
          <EmptyState
            icon="key-outline"
            message="No tienes derechos de acceso activos."
            title="Sin accesos"
          />
        )}
      </Section>
    </ScrollScreen>
  );
}
