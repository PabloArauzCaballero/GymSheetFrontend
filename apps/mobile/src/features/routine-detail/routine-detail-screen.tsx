import { useQuery } from '@tanstack/react-query';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { useWindowDimensions, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ApiError } from '@gymsheet/api-client';
import type { Routine } from '@gymsheet/types';
import { canSaveCopy, isAnyDayRoutine, routineColumns, savedCopyLabel } from '@gymsheet/hooks';
import { routineBuilderService, routineCatalogService, routineService } from '@/api/services';
import { EmptyState, ErrorState, Skeleton } from '@/components/feedback';
import { ScrollScreen } from '@/components/layout';
import { usePullRefresh } from '@/hooks/use-pull-refresh';
import { shareWithBrand } from '@/lib/share-brand';
import { BackLink } from '@/components/nav';
import { Button } from '@/components/ui';
import { ScheduleRoutine } from '@/components/schedule-routine';
import { DetailCtaBar, CTA_BAR_SPACE, activateBlockReason } from '@/features/routine-detail/detail-cta-bar';
import { DetailActions, type PrimaryIntent } from '@/features/routine-detail/detail-actions';
import { DetailHeader } from '@/features/routine-detail/detail-header';
import { DetailHero, heroContentOf, heroHeightFor } from '@/features/routine-detail/detail-hero';
import { useCatalogCard } from '@/features/routine-catalog/use-routine-catalog';
import { DetailSection, DetailSocial } from '@/features/routine-detail/detail-social';
import { DayCard } from '@/features/routine-detail/day-cards';
import { MoreSheet, type MoreAction } from '@/features/routine-detail/more-sheet';
import { ReportSheet, type ReportTarget } from '@/features/routine-detail/report-sheet';
import { cardCopyNumber, ownCopiesOf, todayWeekday } from '@/features/routine-detail/routine-plan';
import { useRoutineActions } from '@/features/routine-detail/use-routine-actions';
import { useStartRoutine } from '@/features/routine-detail/use-start-routine';
import { VersionBanner } from '@/features/routine-detail/version-banner';
import { WeekSection, type ViewMode } from '@/features/routine-detail/week-section';
import { useActivePrograms } from '@/features/programs/use-active-programs';
import { radii, spacing } from '@/theme';

/**
 * Detalle de rutina (C8.3.1, C1, C2): portada en mosaico, hechos, **un solo CTA
 * principal** según el caso, secundarias compactas («Probar un día»,
 * «Compartir»), lo poco frecuente en ⋯, y «Tu semana» con tarjetas de día que
 * abren la pantalla completa del Día.
 */
export function RoutineDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { width } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const [mode, setMode] = useState<ViewMode>('week');
  const [ignored, setIgnored] = useState(false);
  const [report, setReport] = useState<ReportTarget | null>(null);
  const [moreOpen, setMoreOpen] = useState(false);
  const [sharing, setSharing] = useState(false);
  const start = useStartRoutine(id);
  const programs = useActivePrograms();

  const routine = useQuery({
    queryKey: ['routine', id],
    queryFn: () => routineService.get(id),
    enabled: Boolean(id),
  });
  const calendar = useQuery({
    queryKey: ['routine', id, 'calendar'],
    queryFn: () => routineBuilderService.calendar(id),
    enabled: Boolean(id) && routine.isSuccess,
  });
  const pull = usePullRefresh(routine.refetch);
  const data = routine.data;
  // Lo que ya sabía la tarjeta del catálogo: la portada se pinta con eso
  // mientras llega la rutina entera, así el zoom aterriza sobre la misma foto.
  const preview = useCatalogCard(id);
  const foreign = canSaveCopy(data);
  // C2: ¿ya guardaste esta rutina? Se busca en «Mías» por la atribución que
  // congela la copia. Solo para rutinas ajenas.
  const mine = useQuery({
    queryKey: ['routines', 'mine', 'copies-of', id],
    queryFn: () => routineCatalogService.list({ scope: 'mine', q: data?.nombre, limit: 50 }),
    enabled: Boolean(data) && foreign,
    staleTime: 30_000,
  });

  const actions = useRoutineActions(data ?? ({ id } as Routine));
  const columns = useMemo(() => (data ? routineColumns(data) : []), [data]);
  const weeks = calendar.data?.semanas ?? [];
  const total = calendar.data?.duracionSemanas ?? weeks.length;

  if (routine.isPending) {
    return (
      <ScrollScreen
        hero={
          preview ? (
            <DetailHero
              content={{
                nombre: preview.nombre,
                objetivo: preview.objetivo,
                portadaUrl: preview.portadaUrl,
                diasPorSemana: preview.diasPorSemana,
                duracionSemanas: preview.duracionSemanas,
                esOficial: preview.esOficial,
              }}
            />
          ) : (
            <Skeleton height={heroHeightFor(width, insets.top)} radius={0} />
          )
        }
        heroBar={{ title: '', onBack: () => router.back(), backTestID: 'routine-back' }}
      >
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            gap: spacing.smd,
          }}
        >
          <Skeleton height={44} radius={radii.full} width={44} />
          <View style={{ flex: 1, gap: spacing.xs }}>
            <Skeleton height={12} radius={radii.xs} width="30%" />
            <Skeleton height={18} radius={radii.xs} width="55%" />
          </View>
        </View>
        <Skeleton height={92} />
        <Skeleton height={56} radius={radii.lg} />
        <Skeleton height={104} />
        <Skeleton height={104} />
      </ScrollScreen>
    );
  }
  if (routine.isError || !data) {
    const pendingShare = routine.error instanceof ApiError && routine.error.code === 'SHARE_PENDING';
    return (
      <ScrollScreen>
        <BackLink />
        {pendingShare ? (
          <EmptyState
            icon="mail-unread-outline"
            message="Acepta la invitación desde Rutinas › Privadas › Compartidas conmigo para ver los ejercicios."
            title="Aún no aceptaste esta rutina"
          >
            <Button label="Ir a mis invitaciones" onPress={() => router.replace('/routines')} />
          </EmptyState>
        ) : (
          <ErrorState error={routine.error} onRetry={() => void routine.refetch()} />
        )}
      </ScrollScreen>
    );
  }

  const isPublic = data.visibilidad === 'PUBLIC';
  const activeProgram = programs.data?.fuerza ?? null;
  const programOfThis = activeProgram?.rutinaId === data.id;
  const intent: PrimaryIntent = foreign ? 'save' : programOfThis ? 'train' : 'activate';
  const todayDayId = data.dias.find((day) => day.diaSemana === todayWeekday())?.id;
  const copies = data ? ownCopiesOf(data, mine.data?.items ?? []) : [];
  const latestCopy = copies[0];
  const copyNumber = latestCopy ? cardCopyNumber(latestCopy) : null;

  const openDay = (diaId: string, semana: number) =>
    router.push({
      pathname: '/routines/[id]/dia/[diaId]',
      params: { id: data.id, diaId, semana: String(semana) },
    });

  const onPrimary = () => {
    if (intent === 'save') actions.copy();
    else if (intent === 'activate')
      router.push({
        pathname: '/routines/activate/[id]',
        params: { id: data.id },
      });
    else start.mutate(todayDayId);
  };

  const onShare = () => {
    if (data.esMia && !isPublic) {
      setSharing(true);
      return;
    }
    // #87 Powered by: el nombre, qué es en una línea y el enlace; la firma la pone `shareWithBrand`.
    const days = data.dias.length;
    shareWithBrand(
      [
        `«${data.nombre}»`,
        `Entrena ${days} ${days === 1 ? 'día' : 'días'} por semana${
          data.duracionSemanas ? ` durante ${data.duracionSemanas} semanas` : ''
        }.`,
      ],
      `gymsheet://routines/${data.id}`,
    );
  };

  const more: MoreAction[] = [
    ...(data.esMia && !isPublic
      ? [{ key: 'publish', label: 'Publicar', icon: 'globe-outline' as const, onPress: () => void actions.publish() }]
      : []),
    ...(data.esMia && isPublic
      ? [{ key: 'unpublish', label: 'Despublicar', icon: 'eye-off-outline' as const, onPress: () => void actions.unpublish() }]
      : []),
    ...(!data.esMia && isPublic
      ? [{ key: 'report', label: 'Denunciar rutina', icon: 'flag-outline' as const, destructive: true, onPress: () => setReport({ kind: 'ROUTINE', id: data.id, label: data.nombre }) }]
      : []),
  ];

  const primaryDisabledReason = intent === 'activate' ? activateBlockReason(data) : undefined;

  return (
    <ScrollScreen
      overlay={
        <DetailCtaBar
          disabledReason={primaryDisabledReason}
          done={intent === 'save' && actions.copied}
          intent={intent}
          loading={intent === 'save' ? actions.copying : intent === 'train' ? start.isPending : false}
          onPress={onPrimary}
        />
      }
      hero={<DetailHero content={heroContentOf(data)} />}
      heroBar={{
        title: data.nombre,
        onBack: () => router.back(),
        onMore: more.length > 0 ? () => setMoreOpen(true) : undefined,
        backTestID: 'routine-back',
        moreTestID: 'routine-more',
      }}
      onRefresh={pull.onRefresh}
      refreshing={pull.refreshing}
    >
      <View style={{ gap: spacing.lg }}>
        <DetailHeader
          actions={
            <DetailActions
              existingCopy={
                latestCopy
                  ? {
                      id: latestCopy.id,
                      label: copyNumber ? savedCopyLabel(copyNumber) : 'Ya la guardaste',
                    }
                  : null
              }
              intent={intent}
              onOpenCopy={(copyId) =>
                router.push({
                  pathname: '/routines/[id]',
                  params: { id: copyId },
                })
              }
              onPrimary={onPrimary}
              onShare={onShare}
              onTryDay={intent === 'train' ? undefined : () => start.mutate(undefined)}
              showPrimary={false}
              tryingDay={intent !== 'train' && start.isPending}
            />
          }
          routine={data}
        />
      </View>

      {data.hayVersionNueva && !ignored ? (
        <VersionBanner
          applying={actions.syncing}
          onApply={actions.sync}
          onIgnore={() => setIgnored(true)}
          routine={data}
        />
      ) : null}

      {isAnyDayRoutine(data) ? (
        <View style={{ gap: spacing.md }}>
          {data.dias[0] ? (
            <DayCard day={data.dias[0]} number={1} onPress={() => openDay(data.dias[0]!.id, 1)} />
          ) : null}
        </View>
      ) : (
        <WeekSection
          columns={columns}
          error={calendar.isError ? calendar.error : null}
          loading={calendar.isPending}
          mode={mode}
          onMode={setMode}
          onOpenDay={openDay}
          onRetry={() => void calendar.refetch()}
          routine={data}
          total={total}
          weeks={weeks}
        />
      )}

      <DetailSocial
        onReport={setReport}
        onShareClose={() => setSharing(false)}
        onShareOpen={() => setSharing(true)}
        routine={data}
        sharing={sharing}
      />

      {data.esMia ? (
        <DetailSection title="Programar">
          <ScheduleRoutine routineId={data.id} />
        </DetailSection>
      ) : null}

      <View style={{ height: CTA_BAR_SPACE }} />

      <MoreSheet actions={more} onClose={() => setMoreOpen(false)} title={data.nombre} visible={moreOpen} />
      <ReportSheet onClose={() => setReport(null)} target={report} />
    </ScrollScreen>
  );
}
