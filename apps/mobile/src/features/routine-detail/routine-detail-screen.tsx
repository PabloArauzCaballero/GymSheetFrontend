import { useQuery } from '@tanstack/react-query';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { Share, View } from 'react-native';
import { ApiError } from '@gymsheet/api-client';
import type { Routine } from '@gymsheet/types';
import { isAnyDayRoutine, routineColumns } from '@gymsheet/hooks';
import { routineBuilderService, routineCatalogService, routineService } from '@/api/services';
import { EmptyState, ErrorState, Skeleton } from '@/components/feedback';
import { ScrollScreen, Section } from '@/components/layout';
import { BackLink } from '@/components/nav';
import { Button } from '@/components/ui';
import { ScheduleRoutine } from '@/components/schedule-routine';
import { DetailActions, type PrimaryIntent } from '@/features/routine-detail/detail-actions';
import { DetailCover } from '@/features/routine-detail/detail-cover';
import { DetailHeader } from '@/features/routine-detail/detail-header';
import { DetailSocial } from '@/features/routine-detail/detail-social';
import { DayCard } from '@/features/routine-detail/day-cards';
import { MoreButton, MoreSheet, type MoreAction } from '@/features/routine-detail/more-sheet';
import { ReportSheet, type ReportTarget } from '@/features/routine-detail/report-sheet';
import { coverExercises, copyNumberOf, ownCopiesOf, todayWeekday } from '@/features/routine-detail/routine-plan';
import { useRoutineActions } from '@/features/routine-detail/use-routine-actions';
import { useStartRoutine } from '@/features/routine-detail/use-start-routine';
import { VersionBanner } from '@/features/routine-detail/version-banner';
import { WeekSection, type ViewMode } from '@/features/routine-detail/week-section';
import { useActivePrograms } from '@/features/programs/use-active-programs';
import { spacing } from '@/theme';

/**
 * Detalle de rutina (C8.3.1, C1, C2): portada en mosaico, hechos, **un solo CTA
 * principal** según el caso, secundarias compactas («Probar un día»,
 * «Compartir»), lo poco frecuente en ⋯, y «Tu semana» con tarjetas de día que
 * abren la pantalla completa del Día.
 */
export function RoutineDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const [mode, setMode] = useState<ViewMode>('week');
  const [weekNumber, setWeekNumber] = useState(1);
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
  const data = routine.data;
  const foreign = data ? !data.esMia : false;
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
  const week = weeks.find((candidate) => candidate.numero === weekNumber) ?? weeks[0];

  if (routine.isPending) {
    return (
      <ScrollScreen>
        <BackLink />
        <Skeleton height={196} />
        <Skeleton height={120} />
        <Skeleton height={180} />
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
            message="Acepta la invitación desde Rutinas › Mías › Compartidas conmigo para ver los ejercicios."
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
  const copyNumber = latestCopy ? copyNumberOf(latestCopy.nombre) : null;

  const openDay = (diaId: string, semana: number) =>
    router.push({ pathname: '/routines/[id]/dia/[diaId]', params: { id: data.id, diaId, semana: String(semana) } });

  const onPrimary = () => {
    if (intent === 'save') actions.copy();
    else if (intent === 'activate') router.push({ pathname: '/routines/activate/[id]', params: { id: data.id } });
    else start.mutate(todayDayId);
  };

  const onShare = () => {
    if (data.esMia && !isPublic) {
      setSharing(true);
      return;
    }
    void Share.share({ message: `«${data.nombre}» en REPP · gymsheet://routines/${data.id}` });
  };

  const more: MoreAction[] = [
    ...(data.esMia && !isPublic
      ? [{ key: 'publish', label: 'Publicar', icon: 'globe-outline' as const, onPress: () => void actions.publish() }]
      : []),
    ...(data.esMia && isPublic
      ? [{ key: 'unpublish', label: 'Despublicar', icon: 'eye-off-outline' as const, onPress: () => void actions.unpublish() }]
      : []),
    ...(!data.esMia && isPublic
      ? [
          {
            key: 'report',
            label: 'Denunciar rutina',
            icon: 'flag-outline' as const,
            destructive: true,
            onPress: () => setReport({ kind: 'ROUTINE', id: data.id, label: data.nombre }),
          },
        ]
      : []),
  ];

  return (
    <ScrollScreen onRefresh={() => void routine.refetch()} refreshing={routine.isRefetching}>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        <BackLink />
        {more.length > 0 ? <MoreButton onPress={() => setMoreOpen(true)} /> : null}
      </View>

      <View style={{ gap: spacing.lg }}>
        <DetailCover exercises={coverExercises(data)} />
        <DetailHeader routine={data} />
        <DetailActions
          existingCopy={
            latestCopy
              ? { id: latestCopy.id, label: copyNumber ? `Ya la guardaste como v${copyNumber}` : 'Ya la guardaste' }
              : null
          }
          intent={intent}
          onOpenCopy={(copyId) => router.push({ pathname: '/routines/[id]', params: { id: copyId } })}
          onPrimary={onPrimary}
          onShare={onShare}
          onTryDay={intent === 'train' ? undefined : () => start.mutate(undefined)}
          primaryLoading={intent === 'save' ? actions.copying : intent === 'train' ? start.isPending : false}
          tryingDay={intent !== 'train' && start.isPending}
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
          onNext={() => setWeekNumber((n) => Math.min(total, n + 1))}
          onOpenDay={openDay}
          onPrev={() => setWeekNumber((n) => Math.max(1, n - 1))}
          onRetry={() => void calendar.refetch()}
          routine={data}
          total={total}
          week={week}
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
        <Section title="Programar">
          <ScheduleRoutine routineId={data.id} />
        </Section>
      ) : null}

      <MoreSheet actions={more} onClose={() => setMoreOpen(false)} title={data.nombre} visible={moreOpen} />
      <ReportSheet onClose={() => setReport(null)} target={report} />
    </ScrollScreen>
  );
}
