import { GOAL_LABELS } from '@gymsheet/hooks';
import type { TrainingGoal } from '@gymsheet/types';
import { Zap } from 'lucide-react';
import type { MouseEvent } from 'react';
import { ErrorPanel } from '@/shared/components/feedback/error-panel';
import { Skeleton } from '@/shared/components/feedback/skeleton';
import { Button } from '@/shared/components/ui/button';
import { Checkbox } from '@/shared/components/ui/checkbox';
import { ChoiceCards, type Choice } from '@/shared/components/ui/choice-cards';
import { WizardSummary, type WizardStep } from '@/shared/components/ui/form-wizard';
import type {
  DatePreset,
  ExportFormat,
  ExportRoutine,
  RoutineProgressFilters,
} from '../routine-progress-export-service';

// Copy mirrors the mobile wizard (`download-progress-wizard-modal.tsx`).
const FORMAT_CHOICES: readonly Choice[] = [
  {
    value: 'excel',
    title: 'Excel (.xlsx)',
    hint: 'Recomendado. Hoja de cálculo completa con formato profesional, filtros automáticos y pestañas de resumen.',
  },
  {
    value: 'csv',
    title: 'CSV (.csv)',
    hint: 'Texto delimitado con UTF-8 BOM para abrir directamente en cualquier hoja o sistema.',
  },
  {
    value: 'pdf',
    title: 'PDF (.pdf)',
    hint: 'Documento visual con estética REPP oscura, tarjetas de métricas y listados.',
  },
];

export const PERIOD_LABEL: Record<DatePreset, string> = {
  ALL: 'Todo el historial',
  LAST_30: 'Último mes (30 días)',
  LAST_90: 'Últimos 3 meses (90 días)',
  LAST_YEAR: 'Último año',
};

const PERIOD_CHOICES: readonly Choice[] = [
  { value: 'ALL', title: PERIOD_LABEL.ALL, hint: 'Desde tu primer entrenamiento hasta hoy sin restricciones.' },
  { value: 'LAST_30', title: PERIOD_LABEL.LAST_30, hint: 'Las sesiones y series de los últimos 30 días.' },
  { value: 'LAST_90', title: PERIOD_LABEL.LAST_90, hint: 'Historial del trimestre más reciente.' },
  { value: 'LAST_YEAR', title: PERIOD_LABEL.LAST_YEAR, hint: 'Los últimos 365 días de entrenamiento.' },
];

/** `null` name = always included (it is the row's identity, not a filter). */
const FIELDS: readonly { name: 'includeTargets' | 'includePrograms' | 'includeHistory' | null; title: string; hint: string }[] = [
  { name: null, title: 'Metadatos y autoría de rutina', hint: 'Nombre, descripción, objetivo, visibilidad, duración, versión, sello oficial y autoría.' },
  { name: 'includeTargets', title: 'Estructura y prescripción', hint: 'Días, orden, grupo muscular, equipamiento, series objetivo, rangos de reps, cargas, RIR, descansos y notas.' },
  { name: 'includePrograms', title: 'Sobrecarga progresiva y programas', hint: 'Modo de sobrecarga, multiplicadores de senda, 1RM estimado, marcas meta y fallos.' },
  { name: 'includeHistory', title: 'Historial de ejecución y series reales', hint: 'Sesiones, fechas, duraciones, series completadas, reps reales, peso levantado y volumen.' },
];

export const ALL_ROUTINES_LABEL = 'Todas mis rutinas y programas';

/** Reads the wizard form into the exact body the backend validates. */
export function filtersFrom(values: FormData): RoutineProgressFilters {
  return {
    format: (values.get('format') as ExportFormat | null) ?? 'excel',
    routineId: (values.get('routineId') as string | null) ?? 'ALL',
    datePreset: (values.get('datePreset') as DatePreset | null) ?? 'ALL',
    includeTargets: values.get('includeTargets') === 'on',
    includePrograms: values.get('includePrograms') === 'on',
    includeHistory: values.get('includeHistory') === 'on',
  };
}

type RoutinesState = {
  routines: readonly ExportRoutine[] | undefined;
  loading: boolean;
  error: string | null;
  retry: () => void;
};

function routineHint(routine: ExportRoutine) {
  const goal = routine.objetivo ? (GOAL_LABELS[routine.objetivo as TrainingGoal] ?? routine.objetivo) : 'General';
  return `Objetivo: ${goal} · ${routine.duracionSemanas ?? '—'} sem`;
}

function RoutineChoices({ routines, loading, error, retry }: RoutinesState) {
  if (loading) return <Skeleton className="h-32 rounded-[6px]" />;
  if (error) return <ErrorPanel message={error} onRetry={retry} />;
  const choices: Choice[] = [
    { value: 'ALL', title: ALL_ROUTINES_LABEL, hint: 'Todos los datos posibles en este campo' },
    ...(routines ?? []).map((routine) => ({ value: routine.id, title: routine.nombre, hint: routineHint(routine) })),
  ];
  return <ChoiceCards choices={choices} columns={2} defaultValue="ALL" legend="Rutinas" name="routineId" />;
}

/** Mobile's «¿Quieres todo sin filtros?» strip: downloads everything in the chosen format now. */
function DownloadAllStrip({ onDownloadAll, disabled }: Readonly<{ onDownloadAll: (format: ExportFormat) => void; disabled: boolean }>) {
  const handle = (event: MouseEvent<HTMLButtonElement>) => {
    const form = event.currentTarget.form;
    onDownloadAll(((form ? new FormData(form).get('format') : null) as ExportFormat | null) ?? 'excel');
  };
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-[var(--radius-lg)] bg-[var(--surface-low)] px-4 py-3">
      <p className="text-sm text-[var(--text-muted)]">¿Quieres todo sin filtros?</p>
      <Button aria-label="Descargar todo el historial ahora" disabled={disabled} onClick={handle} size="sm" type="button" variant="ghost">
        <Zap aria-hidden className="size-4" />
        Descargar todo
      </Button>
    </div>
  );
}

export function buildSteps(options: {
  routinesState: RoutinesState;
  onDownloadAll: (format: ExportFormat) => void;
  downloading: boolean;
}): WizardStep[] {
  const strip = <DownloadAllStrip disabled={options.downloading} onDownloadAll={options.onDownloadAll} />;
  const routineName = (id: string) =>
    id === 'ALL' ? ALL_ROUTINES_LABEL : (options.routinesState.routines?.find((r) => r.id === id)?.nombre ?? 'Rutina específica');
  return [
    {
      id: 'format',
      title: 'Formato de descarga',
      description: 'Puedes descargarlo como una hoja de cálculo estándar para Excel, CSV para importar en otras herramientas o un informe PDF con diseño.',
      render: () => (
        <>
          {strip}
          <ChoiceCards choices={FORMAT_CHOICES} defaultValue="excel" legend="Formato" name="format" />
        </>
      ),
    },
    {
      id: 'routines',
      title: 'Rutinas',
      description: 'Por defecto se incluyen todas tus rutinas y programas activos. Puedes elegir una en específico.',
      render: () => (
        <>
          {strip}
          <RoutineChoices {...options.routinesState} />
        </>
      ),
    },
    {
      id: 'period',
      title: 'Rango de fechas',
      description: 'Define el alcance temporal de las sesiones y series registradas.',
      render: () => (
        <>
          {strip}
          <ChoiceCards choices={PERIOD_CHOICES} columns={2} defaultValue="ALL" legend="Período" name="datePreset" />
        </>
      ),
    },
    {
      id: 'fields',
      title: 'Campos',
      description: 'La exportación incluye todas las dimensiones del sistema de rutinas de REPP:',
      render: () => (
        <>
          {strip}
          <fieldset className="grid gap-3">
            <legend className="data-label mb-2">Campos del sistema de rutinas</legend>
            {FIELDS.map((field) => (
              <Checkbox
                defaultChecked
                disabled={field.name === null}
                key={field.title}
                label={
                  <span className="grid gap-0.5">
                    <span className="font-semibold text-[var(--text)]">{field.title}</span>
                    <span className="text-xs leading-5">{field.name === null ? `Siempre incluido. ${field.hint}` : field.hint}</span>
                  </span>
                }
                name={field.name ?? undefined}
              />
            ))}
          </fieldset>
        </>
      ),
    },
    {
      id: 'confirm',
      title: 'Confirmación',
      description: 'Revisa los parámetros antes de generar el archivo. Tu descarga quedará registrada de forma auditable.',
      render: (values) => {
        const filters = filtersFrom(values);
        const included = FIELDS.filter((field) => field.name === null || filters[field.name]).map((field) => field.title);
        return (
          <WizardSummary
            items={[
              { label: 'Formato de archivo', value: filters.format.toUpperCase() },
              { label: 'Rutinas seleccionadas', value: routineName(filters.routineId) },
              { label: 'Período temporal', value: PERIOD_LABEL[filters.datePreset] },
              { label: 'Campos incluidos', value: included.length === FIELDS.length ? 'Todos los campos del sistema de rutinas' : included.join(' · ') },
            ]}
          />
        );
      },
    },
  ];
}
