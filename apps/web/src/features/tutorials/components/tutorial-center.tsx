'use client';

import { useMemo, useState } from 'react';
import { GraduationCap, Search, WifiOff } from 'lucide-react';
import { EmptyState } from '@/shared/components/feedback/empty-state';
import { LoadingPanel } from '@/shared/components/feedback/loading-panel';
import { PageHeader } from '@/shared/components/layout/page-header';
import { Badge } from '@/shared/components/ui/badge';
import { Field } from '@/shared/components/ui/field';
import { Input } from '@/shared/components/ui/input';
import { MetricCard } from '@/shared/components/ui/metric-card';
import { Select } from '@/shared/components/ui/select';
import { useDebouncedValue } from '@/shared/hooks/use-debounced-value';
import { useTutorial } from '../engine/tutorial-context';
import type { TutorialStatus } from '../engine/progress-helpers';
import type { TutorialCategory } from '../model/types';
import { TutorialCard } from './tutorial-card';
import { categoryLabels } from './labels';

type StatusFilter = 'ALL' | TutorialStatus;
type CategoryFilter = 'ALL' | TutorialCategory;

/**
 * The Tutorial Center ("Centro de ayuda"). Lists every tutorial available to
 * the user's role with search, category/status filters, progress stats and the
 * per-tutorial actions. Launching a tutorial from here runs it over the real UI.
 */
export function TutorialCenter() {
  const { ready, tutorials, overallPercent, statusOf, progressSource } = useTutorial();
  const [rawSearch, setRawSearch] = useState('');
  const [category, setCategory] = useState<CategoryFilter>('ALL');
  const [status, setStatus] = useState<StatusFilter>('ALL');
  const search = useDebouncedValue(rawSearch, 250).trim().toLowerCase();

  const stats = useMemo(() => {
    let completed = 0;
    let inProgress = 0;
    for (const tutorial of tutorials) {
      const state = statusOf(tutorial.id);
      if (state === 'COMPLETED') completed += 1;
      else if (state === 'IN_PROGRESS') inProgress += 1;
    }
    return { completed, inProgress, pending: tutorials.length - completed - inProgress };
  }, [statusOf, tutorials]);

  const categories = useMemo(() => {
    const present = new Set(tutorials.map((tutorial) => tutorial.category));
    return (Object.keys(categoryLabels) as TutorialCategory[]).filter((key) => present.has(key));
  }, [tutorials]);

  const filtered = useMemo(
    () =>
      tutorials.filter((tutorial) => {
        if (category !== 'ALL' && tutorial.category !== category) return false;
        if (status !== 'ALL' && statusOf(tutorial.id) !== status) return false;
        if (
          search &&
          !`${tutorial.title} ${tutorial.description}`.toLowerCase().includes(search)
        ) {
          return false;
        }
        return true;
      }),
    [category, search, status, statusOf, tutorials],
  );

  if (!ready) return <LoadingPanel rows={6} />;

  return (
    <div className="grid gap-8">
      <PageHeader
        eyebrow="Aprendizaje guiado"
        title="Centro de ayuda"
        tutorialId="page:tutorials"
        description="Recorridos interactivos sobre la aplicación real. Empieza, continúa o repite cada guía a tu ritmo."
        actions={
          progressSource === 'local' ? (
            <Badge tone="warning">
              <WifiOff aria-hidden className="mr-1 inline size-3.5" />
              Progreso local
            </Badge>
          ) : undefined
        }
      />

      <section aria-label="Resumen de progreso" className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard accent icon={<GraduationCap className="size-5" />} label="Avance general" suffix="%" value={overallPercent} />
        <MetricCard label="Completados" value={stats.completed} />
        <MetricCard label="En progreso" value={stats.inProgress} />
        <MetricCard label="Pendientes" value={stats.pending} />
      </section>

      <section className="grid gap-4 sm:grid-cols-[1fr_auto_auto] sm:items-end">
        <Field htmlFor="tutorial-search" label="Buscar">
          <div className="relative">
            <Search
              aria-hidden
              className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-[var(--text-muted)]"
            />
            <Input
              className="pl-10"
              id="tutorial-search"
              placeholder="Busca por nombre o tema…"
              value={rawSearch}
              onChange={(event) => setRawSearch(event.target.value)}
            />
          </div>
        </Field>
        <Field htmlFor="tutorial-category" label="Categoría">
          <Select
            id="tutorial-category"
            value={category}
            onChange={(event) => setCategory(event.target.value as CategoryFilter)}
          >
            <option value="ALL">Todas</option>
            {categories.map((key) => (
              <option key={key} value={key}>
                {categoryLabels[key]}
              </option>
            ))}
          </Select>
        </Field>
        <Field htmlFor="tutorial-status" label="Estado">
          <Select
            id="tutorial-status"
            value={status}
            onChange={(event) => setStatus(event.target.value as StatusFilter)}
          >
            <option value="ALL">Todos</option>
            <option value="NOT_STARTED">Sin empezar</option>
            <option value="IN_PROGRESS">En progreso</option>
            <option value="COMPLETED">Completados</option>
            <option value="SKIPPED">Omitidos</option>
          </Select>
        </Field>
      </section>

      {filtered.length === 0 ? (
        <EmptyState
          icon={<GraduationCap className="size-6" />}
          title="Sin tutoriales que coincidan"
          description="Ajusta la búsqueda o los filtros para ver más recorridos."
        />
      ) : (
        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {filtered.map((tutorial) => (
            <TutorialCard key={tutorial.id} tutorial={tutorial} />
          ))}
        </section>
      )}
    </div>
  );
}
