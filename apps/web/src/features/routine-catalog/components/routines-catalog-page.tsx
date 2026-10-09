'use client';

import { useQuery } from '@tanstack/react-query';
import { HeartPulse, Plus } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { PageHeader } from '@/shared/components/layout/page-header';
import { ButtonLink } from '@/shared/components/ui/button';
import { ChoiceChip } from '@/shared/components/ui/choice-chip';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/shared/components/ui/tabs';
import { RoutineImportDialog } from '@/features/training/components/routine-import-dialog';
import { WeekPlan } from '@/features/training/components/week-plan';
import { trainingService } from '@/features/training/services/training-service';
import { ProgramCards } from '@/features/programs/components/program-cards';
import { routineV2Keys } from '@/features/routines-v2/keys';
import { sharingService } from '@/features/routines-v2/services';
import { catalogTabs, type CatalogTab } from '../catalog-state';
import { useCatalogState } from '../hooks';
import { CatalogFilters } from './catalog-filters';
import { CatalogList } from './catalog-list';

const TAB_LABELS: Record<CatalogTab, string> = {
  publicas: 'Públicas',
  repp: 'Recomendadas por REPP',
  mias: 'Mías',
};

/**
 * Pestaña Rutinas con la experiencia nueva (RF-01): tarjetas de programa activo,
 * pestañas Públicas / Recomendadas por REPP / Mías (con Creadas por mí y
 * Compartidas conmigo) y filtros. Sustituye a la lista plana detrás de `routinesV2`.
 */
export function RoutinesCatalogPage() {
  const router = useRouter();
  const { state, searchText, setSearchText, update, clear } = useCatalogState();
  const assignments = useQuery({
    queryKey: ['routines', 'assignments', 'me'],
    queryFn: trainingService.myAssignments,
  });
  const invitations = useQuery({
    queryKey: routineV2Keys.invitations,
    queryFn: () => sharingService.myInvitations('PENDING'),
  });
  const pendingCount = invitations.data?.length ?? 0;

  return (
    <div className="grid gap-8">
      <PageHeader
        actions={
          <div className="flex flex-wrap gap-2" data-tutorial-id="routines:actions">
            <ButtonLink href="/cardio/new" variant="secondary">
              <HeartPulse aria-hidden className="size-4" />
              Plan de cardio
            </ButtonLink>
            <RoutineImportDialog />
            <ButtonLink href="/routines/new" variant="primary">
              <Plus aria-hidden className="size-4" />
              Nueva rutina
            </ButtonLink>
          </div>
        }
        description="Explora rutinas de la comunidad y de REPP, copia las que te gusten y activa la tuya como programa."
        eyebrow="Planes de entrenamiento"
        title="Rutinas"
        tutorialId="page:routines"
      />

      <ProgramCards />

      {assignments.data ? (
        <WeekPlan assignments={assignments.data} onPickRoutine={(id) => router.push(`/routines/${id}`)} />
      ) : null}

      <Tabs onValueChange={(value) => update({ tab: value as CatalogTab })} value={state.tab}>
        <TabsList aria-label="Tipos de rutinas">
          {catalogTabs.map((tab) => (
            <TabsTrigger key={tab} value={tab}>
              {TAB_LABELS[tab]}
              {tab === 'mias' && pendingCount > 0 ? (
                <>
                  <span
                    aria-hidden
                    className="ml-2 inline-grid min-w-5 place-items-center rounded-full bg-[var(--volt)] px-1.5 text-[11px] font-bold text-[var(--accent-contrast)]"
                  >
                    {pendingCount}
                  </span>
                  <span className="sr-only">
                    , {pendingCount} {pendingCount === 1 ? 'invitación pendiente' : 'invitaciones pendientes'}
                  </span>
                </>
              ) : null}
            </TabsTrigger>
          ))}
        </TabsList>

        {catalogTabs.map((tab) => (
          <TabsContent className="grid gap-5" key={tab} value={tab}>
            {tab === 'mias' ? (
              <div aria-label="Mis rutinas" className="flex flex-wrap gap-2" role="group">
                <ChoiceChip onClick={() => update({ sub: 'creadas' })} selected={state.sub === 'creadas'}>
                  Yo creé
                </ChoiceChip>
                <ChoiceChip onClick={() => update({ sub: 'compartidas' })} selected={state.sub === 'compartidas'}>
                  Compartidas conmigo{pendingCount > 0 ? ` (${pendingCount})` : ''}
                </ChoiceChip>
              </div>
            ) : null}
            <CatalogFilters
              onChange={update}
              onClear={clear}
              onSearchText={setSearchText}
              searchText={searchText}
              state={state}
            />
            <CatalogList onClearFilters={clear} state={state} />
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
}
