'use client';

import { proudStat, roleLabel } from '@gymsheet/domain';
import { useQuery } from '@tanstack/react-query';
import { Bell, CreditCard, Dumbbell, Eye, LifeBuoy, MessageCircle, PersonStanding, Scale, Settings, Share2, SquarePen, Star, Users } from 'lucide-react';
import Link from 'next/link';
import { useEffect, useRef } from 'react';
import { membershipService } from '@/features/membership/services/membership-service';
import { onboardingService } from '@/features/onboarding/services/onboarding-service';
import { goalLabels } from '@/features/profile/components/profile-form-schema';
import { useOwnProfile } from '@/features/profile/hooks/use-own-profile';
import { DiscoveryPreferencesCard } from '@/features/social/components/discovery-preferences-card';
import { SocialDiscoverySettingsCard } from '@/features/social/components/social-discovery-settings-card';
import { WeightIncrementField } from '@/features/workouts/components/weight-increment-field';
import { queryKeys } from '@/shared/api/query-keys';
import { ErrorPanel } from '@/shared/components/feedback/error-panel';
import { Skeleton } from '@/shared/components/feedback/skeleton';
import { LogoutButton } from '@/shared/components/layout/logout-button';
import { PageHeader } from '@/shared/components/layout/page-header';
import { HeroSurface } from '@/shared/components/mobile/hero-surface';
import { NavRow } from '@/shared/components/mobile/nav-row';
import { Section } from '@/shared/components/mobile/section';
import { Badge } from '@/shared/components/ui/badge';
import { formatDate } from '@/shared/lib/date';
import { notify } from '@/shared/notifications';
import { AboutCard } from './about-card';
import { CompletionAvatar } from './completion-avatar';
import { CompletionError, CompletionNudge } from './completion-nudge';
import { FitnessRow, fitnessNumbers } from './fitness-row';
import { ProfileActions } from './profile-actions';
import { RankChip } from './profile-hero';
import { RowGlyph, RowGroup, initialsOf, shareProfile } from './profile-rows';
import { SendaCard } from './senda-card';

const MEMBERSHIP_BADGE = {
  ACTIVE: { label: 'Activa', tone: 'success' },
  SUSPENDED: { label: 'Suspendida', tone: 'warning' },
  CANCELLED: { label: 'Cancelada', tone: 'danger' },
  EXPIRED: { label: 'Vencida', tone: 'danger' },
} as const;

/**
 * Perfil, espejo de `apps/mobile/app/(app)/(tabs)/profile.tsx` (rediseño a lo
 * Tinder): la cara con el aro de completitud, puntos · racha · sesiones bajo
 * el nombre, tres acciones en círculo (vista previa, editar, compartir) y el
 * empujón con los puntos reales que da cada dato que falta. Luego «Sobre ti»,
 * la senda y las listas. Se edita en `/profile/editar`.
 */
export function ProfilePageClient() {
  const own = useOwnProfile();
  const { user, profile, progression, completion } = own;
  const measurements = useQuery({ queryKey: queryKeys.bodyMeasurements, queryFn: onboardingService.measurements });
  const membership = useQuery({ queryKey: queryKeys.membership, queryFn: membershipService.getMine, retry: false });

  // Lo recién ganado se celebra una vez: el servidor solo lo marca en la lectura que lo otorga.
  const celebrated = useRef('');
  useEffect(() => {
    const data = completion.data;
    const key = data?.awardedNow.join(',') ?? '';
    if (!data || !key || key === celebrated.current) return;
    celebrated.current = key;
    const points = data.items.filter((item) => data.awardedNow.includes(item.code)).reduce((sum, item) => sum + item.points, 0);
    notify.success(`+${points} puntos por completar tu perfil.`);
  }, [completion.data]);

  if (user.isPending) {
    return (
      <div className="mx-auto grid w-full max-w-[560px] gap-8">
        <Skeleton className="h-12 w-40" />
        <Skeleton className="h-72 rounded-[var(--radius-2xl)]" />
      </div>
    );
  }
  if (user.isError) return <ErrorPanel message={user.error.message} onRetry={() => void user.refetch()} />;

  const me = user.data;
  const role = roleLabel(me.rol);
  const member = membership.data?.membership;
  const ordered = [...(measurements.data ?? [])].sort((a, b) => b.measuredOn.localeCompare(a.measuredOn));
  const lastWeight = ordered[0];
  const progress = progression.data;
  const rank = progress ? (progress.level?.name ?? 'Sin empezar') : null;
  // Three fixed slots, Editar always centred: Compartir waits (inert) for real numbers instead of popping in.
  const shareStat = progress ? proudStat(fitnessNumbers(progress)) : null;
  const share = {
    key: 'share',
    label: 'Compartir',
    icon: Share2,
    onClick: () => {
      if (rank && shareStat) void shareProfile(me.id, rank, shareStat);
    },
    disabled: !(rank && shareStat),
    disabledLabel: progression.isError ? 'Compartir: no se pudo cargar tu senda' : 'Compartir: cargando tu senda',
  };
  const age = profile.data?.edad ?? null;
  // A failed read with nothing cached is said out loud (ring and card), never hidden.
  const completionFailed = completion.isError && !completion.data;
  const retryCompletion = () => void completion.refetch();
  const dataSubtitle = profile.isPending
    ? 'Cargando…'
    : profile.data
      ? `${profile.data.pesoKg.toLocaleString('es-ES')} kg · ${profile.data.estaturaCm} cm · ${goalLabels[profile.data.objetivo]}`
      : 'Añade peso, estatura y objetivo';

  return (
    <div className="mx-auto grid w-full grid-cols-1 max-w-[560px] gap-8 lg:max-w-[1040px]">
      <PageHeader
        title="Perfil"
        titleAction={
          <Link aria-label="Ajustes" className="grid size-11 place-items-center rounded-full bg-[var(--surface-high)] transition-colors duration-[var(--dur-2)] hover:bg-[var(--surface-highest)]" href="/settings">
            <Settings aria-hidden className="size-5" />
          </Link>
        }
        tutorialId="page:profile"
      />

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] lg:items-start">
        <div className="grid min-w-0 grid-cols-1 gap-8">
          <HeroSurface className="justify-items-center gap-4 py-7" watermark watermarkAt="top">
            <CompletionAvatar
              initials={initialsOf(me.nombreCompleto, me.email)}
              onRetry={completionFailed ? retryCompletion : undefined}
              percent={completion.data?.percent ?? null}
              photoUrl={own.cardEntry?.photoUrl ?? null}
              retrying={completion.isFetching}
            />
            <div className="grid justify-items-center gap-2 text-center">
              <h2 className="display-title">{age !== null ? `${me.nombreCompleto}, ${age}` : me.nombreCompleto}</h2>
              <div className="flex flex-wrap justify-center gap-2">
                {/* The rank slot always holds something of the chip's height, so the hero never jumps. */}
                {rank ? <RankChip label={rank} /> : progression.isPending ? <Skeleton className="h-7 w-26 rounded-full" /> : <RankChip label="Sin cargar" />}
                {me.rol !== 'CLIENTE' ? <Badge>{role}</Badge> : null}
              </div>
            </div>
            <FitnessRow pending={progression.isPending} progress={progress} />
            <ProfileActions
              actions={[
                { key: 'preview', label: 'Vista previa', icon: Eye, href: '/profile/editar?tab=preview' },
                { key: 'edit', label: 'Editar', icon: SquarePen, href: '/profile/editar', primary: true },
                share,
              ]}
            />
          </HeroSurface>

          {completion.isPending ? (
            <Skeleton className="h-48" />
          ) : completion.data ? (
            <CompletionNudge completion={completion.data} />
          ) : completionFailed ? (
            <CompletionError onRetry={retryCompletion} retrying={completion.isFetching} />
          ) : null}
          <AboutCard bio={own.bio} chips={own.chips} />
          <SendaCard failed={progression.isError} onRetry={() => void progression.refetch()} pending={progression.isPending} progress={progress} />

          <Section title="Tu actividad">
            <RowGroup>
              {[
                <NavRow href="/workouts" key="entrenos" leading={<RowGlyph icon={Dumbbell} />} subtitle="Todas tus sesiones, con sus series" title="Mis entrenos" />,
                <NavRow href="/exercises" key="ejercicios" leading={<RowGlyph icon={Star} />} subtitle="Tus favoritos ☆ y el catálogo completo" title="Mis ejercicios y favoritos" />,
                <NavRow href="/chat" key="chat" leading={<RowGlyph icon={MessageCircle} />} subtitle="Habla con tus conexiones" title="Chat" />,
                <NavRow href="/entrenar-juntos" key="juntos" leading={<RowGlyph icon={Users} />} subtitle="Invitaciones recibidas y encuentros" title="Entrenar juntos" />,
              ]}
            </RowGroup>
          </Section>

          <Section title="Tu cuenta">
            <RowGroup>
              {[
                <NavRow href="/profile/editar#datos" key="datos" leading={<RowGlyph icon={PersonStanding} />} subtitle={dataSubtitle} title="Peso, estatura y objetivo" />,
                <NavRow href="/profile/editar#progress" key="peso" leading={<RowGlyph icon={Scale} />} subtitle={measurements.isError ? 'No se pudo cargar tu evolución' : lastWeight ? `Último: ${lastWeight.weight.toLocaleString('es-ES')} ${lastWeight.unit.toLowerCase()}` : 'Anota tu primer pesaje'} title="Registrar peso" />,
                <NavRow
                  href="/membership"
                  key="membresia"
                  leading={<RowGlyph icon={CreditCard} />}
                  meta={member ? <Badge tone={MEMBERSHIP_BADGE[member.estado].tone}>{MEMBERSHIP_BADGE[member.estado].label}</Badge> : undefined}
                  subtitle={membership.isPending ? 'Cargando…' : member ? `${member.plan?.nombre ?? 'Plan actual'} · vence ${formatDate(member.venceEl)}` : 'Sin membresía asociada'}
                  title="Membresía"
                />,
                <NavRow href="/notifications" key="avisos" leading={<RowGlyph icon={Bell} />} subtitle="Qué avisos quieres recibir" title="Notificaciones" />,
                <NavRow href="/tutorials" key="tour" leading={<RowGlyph icon={LifeBuoy} />} subtitle="Vuelve a ver la bienvenida y las guías de cada pantalla" title="Ver tutorial" />,
                <NavRow href="/settings" key="ajustes" leading={<RowGlyph icon={Settings} />} subtitle="Cuenta, versión y cierre de sesión" title="Ajustes" />,
              ]}
            </RowGroup>
          </Section>
        </div>

        <div className="grid min-w-0 grid-cols-1 gap-5">
          <div className="panel grid gap-4 p-5">
            <WeightIncrementField value={me.pesoIncrementoKg} />
          </div>
          <SocialDiscoverySettingsCard />
          <DiscoveryPreferencesCard />
        </div>
      </div>

      <div className="mx-auto grid w-full max-w-[560px] gap-2">
        <p className="t-footnote truncate text-center text-[var(--text-muted)]">{`${role} · ${me.email}`}</p>
        <LogoutButton block withLabel />
      </div>
    </div>
  );
}
