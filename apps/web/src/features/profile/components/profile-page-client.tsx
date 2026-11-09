'use client';

import { completionMessage, profileCompletion, proudStat, roleLabel } from '@gymsheet/domain';
import { useQuery } from '@tanstack/react-query';
import {
  Bell,
  ChevronRight,
  CircleUserRound,
  CreditCard,
  Dumbbell,
  LifeBuoy,
  MessageCircle,
  Scale,
  Settings,
  Share2,
  SquarePen,
  Star,
  Users,
} from 'lucide-react';
import Link from 'next/link';
import { membershipService } from '@/features/membership/services/membership-service';
import { onboardingService } from '@/features/onboarding/services/onboarding-service';
import { profilePhotosService } from '@/features/profile/services/profile-photos-service';
import { profileService } from '@/features/profile/services/profile-service';
import { ProfilePhotoGallery } from '@/features/profile/components/profile-photo-gallery';
import { GenderPreferenceField } from '@/features/progression/components/gender-preference-field';
import { progressionService } from '@/features/progression/services/progression-service';
import { DiscoveryPreferencesCard } from '@/features/social/components/discovery-preferences-card';
import { SocialDiscoverySettingsCard } from '@/features/social/components/social-discovery-settings-card';
import { SocialStatusCard } from '@/features/social/components/social-status-card';
import { WeightIncrementField } from '@/features/workouts/components/weight-increment-field';
import { ApiError } from '@/shared/api/api-error';
import { goalLabels } from '@/features/profile/components/profile-form-schema';
import { queryKeys } from '@/shared/api/query-keys';
import { ErrorPanel } from '@/shared/components/feedback/error-panel';
import { Skeleton } from '@/shared/components/feedback/skeleton';
import { LogoutButton } from '@/shared/components/layout/logout-button';
import { PageHeader } from '@/shared/components/layout/page-header';
import { Divider, NavRow } from '@/shared/components/mobile/nav-row';
import { Section } from '@/shared/components/mobile/section';
import { Badge } from '@/shared/components/ui/badge';
import { Button, ButtonLink } from '@/shared/components/ui/button';
import { formatDate } from '@/shared/lib/date';
import { HeroStats, ProfileHero, plural } from './profile-hero';
import { RowGlyph, RowGroup, initialsOf, shareProfile } from './profile-rows';

const MEMBERSHIP_BADGE = {
  ACTIVE: { label: 'Activa', tone: 'success' },
  SUSPENDED: { label: 'Suspendida', tone: 'warning' },
  CANCELLED: { label: 'Cancelada', tone: 'danger' },
  EXPIRED: { label: 'Vencida', tone: 'danger' },
} as const;

/**
 * Perfil, la misma pantalla que `apps/mobile/app/(app)/(tabs)/profile.tsx`:
 * un héroe de identidad —foto con aro, nombre, rango y tres cifras reales—,
 * el empujón para completar el perfil y dos listas calladas (tu actividad, tu
 * cuenta). El correo es privado: va al pie, no al héroe. Los datos se editan
 * en `/profile/editar`.
 */
export function ProfilePageClient() {
  const user = useQuery({ queryKey: ['user', 'me'], queryFn: profileService.getUser });
  const profile = useQuery({
    queryKey: queryKeys.profile,
    queryFn: async () => {
      try {
        return await profileService.getProfile();
      } catch (error: unknown) {
        if (error instanceof ApiError && error.status === 404) return null;
        throw error;
      }
    },
    retry: false,
  });
  const measurements = useQuery({ queryKey: queryKeys.bodyMeasurements, queryFn: onboardingService.measurements });
  const membership = useQuery({ queryKey: queryKeys.membership, queryFn: membershipService.getMine, retry: false });
  const photos = useQuery({ queryKey: queryKeys.profilePhotos, queryFn: profilePhotosService.list, staleTime: 60_000 });
  const progression = useQuery({ queryKey: ['progression', 'me'], queryFn: progressionService.get, retry: false });

  const me = user.data;
  const missingProfile = profile.isSuccess && profile.data === null;
  const avatarUrl = photos.data?.[0]?.url ?? null;
  const progress = progression.data;
  const earned = (progress?.badges ?? []).filter((badge) => badge.earned).length;
  const rank = progress?.level?.name ?? null;
  const points = progress?.points ?? 0;
  const streak = progress ? (progress.streak?.current ?? progress.stats.currentStreakDays) : 0;
  const sessions = progress?.stats.totalSessions ?? 0;
  const member = membership.data?.membership;
  const ordered = [...(measurements.data ?? [])].sort((a, b) => b.measuredOn.localeCompare(a.measuredOn));
  const lastWeight = ordered[0];
  const firstWeight = ordered[ordered.length - 1];
  const weightTrend =
    lastWeight && firstWeight && lastWeight.id !== firstWeight.id
      ? `${lastWeight.weight - firstWeight.weight > 0 ? '+' : '−'}${Math.abs(lastWeight.weight - firstWeight.weight).toLocaleString('es-ES', { maximumFractionDigits: 1 })} ${lastWeight.unit.toLowerCase()} desde ${formatDate(firstWeight.measuredOn)}`
      : null;

  const completion = profileCompletion({
    profileKnown: profile.isSuccess,
    hasProfile: Boolean(profile.data),
    photosKnown: Boolean(photos.data),
    hasPhoto: Boolean(photos.data?.length),
    measurementsKnown: Boolean(measurements.data),
    hasMeasurement: Boolean(measurements.data?.length),
  });
  const completionText = completionMessage(completion.missing);

  const dataSubtitle = profile.isPending
    ? 'Cargando…'
    : missingProfile
      ? 'Completa tu perfil: peso, estatura y objetivo'
      : profile.data
        ? `${profile.data.pesoKg.toLocaleString('es-ES')} kg · ${profile.data.estaturaCm} cm · ${goalLabels[profile.data.objetivo]}`
        : 'No se pudieron cargar tus datos';

  if (user.isPending) {
    return (
      <div className="mx-auto grid w-full max-w-[560px] gap-8">
        <Skeleton className="h-12 w-40" />
        <Skeleton className="h-72 rounded-[var(--radius-2xl)]" />
      </div>
    );
  }
  if (user.isError) return <ErrorPanel message={user.error.message} onRetry={() => void user.refetch()} />;

  const role = me ? roleLabel(me.rol) : '—';

  return (
    <div className="mx-auto grid w-full max-w-[560px] gap-8 lg:max-w-[1040px]">
      <PageHeader
        title="Perfil"
        titleAction={
          <Link
            aria-label="Ajustes"
            className="grid size-11 place-items-center rounded-full bg-[var(--surface-high)] transition-colors duration-[var(--dur-2)] hover:bg-[var(--surface-highest)]"
            href="/settings"
          >
            <Settings aria-hidden className="size-5" />
          </Link>
        }
        tutorialId="page:profile"
      />

      <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] lg:items-start">
        <div className="grid gap-8">
          <ProfileHero
            initials={initialsOf(me?.nombreCompleto, me?.email)}
            meta={me && me.rol !== 'CLIENTE' ? <Badge>{role}</Badge> : null}
            name={me?.nombreCompleto ?? 'Tu perfil'}
            photoUrl={avatarUrl}
            rank={progress ? (rank ?? 'Sin empezar') : null}
          >
            {/* La senda: el dato que se gana entrenando; tocarla abre el detalle. */}
            {progression.isPending ? (
              <Skeleton className="h-24" tone="high" />
            ) : progression.isError || !progress ? (
              <ErrorPanel message="No se pudo cargar tu senda." onRetry={() => void progression.refetch()} />
            ) : (
              <Link className="grid gap-3" href="/trayectoria">
                <HeroStats
                  stats={[
                    { key: 'points', value: points, label: 'puntos' },
                    { key: 'streak', value: streak, label: plural(streak, 'día de racha', 'días de racha') },
                    { key: 'sessions', value: sessions, label: plural(sessions, 'sesión', 'sesiones') },
                  ]}
                />
                <span aria-hidden className="block h-1.5 overflow-hidden rounded-full bg-[var(--surface-highest)]">
                  <span
                    className="block h-full rounded-full bg-[var(--text-muted)]"
                    style={{ width: `${Math.round(progress.levelProgress * 100)}%` }}
                  />
                </span>
                <span className="t-footnote flex items-center gap-1 text-[var(--text-muted)]">
                  <span className="flex-1">
                    {[
                      progress.nextLevel && progress.pointsToNextLevel !== null
                        ? `Faltan ${progress.pointsToNextLevel.toLocaleString('es-ES')} para ${progress.nextLevel.name}`
                        : 'Senda completa',
                      earned === 1 ? '1 insignia' : `${earned} insignias`,
                    ].join(' · ')}
                  </span>
                  <ChevronRight aria-hidden className="size-4" />
                </span>
              </Link>
            )}
            {progress && rank && me ? (
              <Button
                className="justify-self-start"
                onClick={() => void shareProfile(me.id, rank, proudStat({ streak, sessions, points }))}
                size="sm"
                variant={missingProfile ? 'ghost' : 'primary'}
              >
                <Share2 aria-hidden className="size-4" />
                Compartir mi perfil
              </Button>
            ) : null}
          </ProfileHero>

          {/* Empujón para completar el perfil, solo con lo que ya se sabe. */}
          {completionText ? (
            <div className="grid gap-2">
              <p className="t-subhead text-[var(--text-muted)]">{completionText}</p>
              <span aria-hidden className="block h-1 overflow-hidden rounded-full bg-[var(--surface-highest)]">
                <span
                  className="block h-full rounded-full bg-[var(--text-muted)]"
                  style={{ width: `${Math.round(completion.ratio * 100)}%` }}
                />
              </span>
              {missingProfile ? (
                <ButtonLink className="justify-self-start" href="/profile/editar" size="sm" variant="primary">
                  <SquarePen aria-hidden className="size-4" />
                  Completar mi perfil
                </ButtonLink>
              ) : null}
            </div>
          ) : null}

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

          {/* Cuenta y app en una sola lista: una tarjeta menos. */}
          <Section title="Tu cuenta">
            <RowGroup>
              {[
                <NavRow href="/profile/editar" key="datos" leading={<RowGlyph icon={CircleUserRound} />} subtitle={dataSubtitle} title="Mis datos" />,
                <NavRow
                  href="/profile/editar#progress"
                  key="peso"
                  leading={<RowGlyph icon={Scale} />}
                  subtitle={
                    measurements.isError
                      ? 'No se pudo cargar tu evolución'
                      : lastWeight
                        ? `Último: ${lastWeight.weight.toLocaleString('es-ES')} ${lastWeight.unit.toLowerCase()}${weightTrend ? ` · ${weightTrend}` : ''}`
                        : 'Anota tu primer pesaje'
                  }
                  title="Registrar peso"
                />,
                <NavRow
                  href="/membership"
                  key="membresia"
                  leading={<RowGlyph icon={CreditCard} />}
                  meta={member ? <Badge tone={MEMBERSHIP_BADGE[member.estado].tone}>{MEMBERSHIP_BADGE[member.estado].label}</Badge> : undefined}
                  subtitle={
                    membership.isPending
                      ? 'Cargando…'
                      : member
                        ? `${member.plan?.nombre ?? 'Plan actual'} · vence ${formatDate(member.venceEl)}`
                        : 'Sin membresía asociada'
                  }
                  title="Membresía"
                />,
                <NavRow href="/notifications" key="avisos" leading={<RowGlyph icon={Bell} />} subtitle="Qué avisos quieres recibir" title="Notificaciones" />,
                <NavRow href="/tutorials" key="tour" leading={<RowGlyph icon={LifeBuoy} />} subtitle="Vuelve a ver la bienvenida y las guías de cada pantalla" title="Ver tutorial" />,
                <NavRow href="/settings" key="ajustes" leading={<RowGlyph icon={Settings} />} subtitle="Cuenta, versión y cierre de sesión" title="Ajustes" />,
              ]}
            </RowGroup>
          </Section>
        </div>

        <div className="grid gap-5">
          <ProfilePhotoGallery />
          <SocialStatusCard />
          <div className="panel grid gap-4 p-5">
            <GenderPreferenceField value={me?.genero ?? null} />
            <Divider />
            <WeightIncrementField value={me?.pesoIncrementoKg} />
          </div>
          <SocialDiscoverySettingsCard />
          <DiscoveryPreferencesCard />
        </div>
      </div>

      <div className="mx-auto grid w-full max-w-[560px] gap-2">
        {me?.email ? (
          <p className="t-footnote truncate text-center text-[var(--text-muted)]">{`${role} · ${me.email}`}</p>
        ) : null}
        <LogoutButton block withLabel />
      </div>
    </div>
  );
}
