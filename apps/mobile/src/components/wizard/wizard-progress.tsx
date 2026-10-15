import { Ionicons } from '@expo/vector-icons';
import { StepProgress, type FlowStep } from '@/components/step-flow';

export type WizardProgressStep = {
  readonly id: string;
  readonly titulo: string;
};

type IconName = keyof typeof Ionicons.glyphMap;

/**
 * Un icono por paso, con el significado de lo que se pide en él: lápiz para el
 * nombre, calendario para los días, doble marca para revisar. Cubre el asistente
 * de rutinas y el de activación; un paso desconocido cae en un punto.
 */
const STEP_ICON: Record<string, IconName> = {
  nombre: 'pencil',
  descripcion: 'document-text',
  objetivo: 'flag',
  duracion: 'hourglass',
  dias: 'calendar',
  revision: 'checkmark-done',
  replace: 'swap-horizontal',
  dates: 'calendar',
  mode: 'options',
  data: 'create',
  summary: 'checkmark-done',
};

/**
 * Riel de progreso del asistente, idéntico al del plan de cardio: barra que se
 * va llenando y, debajo, el icono y el nombre de cada paso. Los pasos de aquí
 * ya llevan su título en `WIZARD_STEPS`; el icono sale de `STEP_ICON`.
 */
export function WizardProgress({
  pasos,
  actual,
}: {
  pasos: readonly WizardProgressStep[];
  actual: number;
}) {
  const steps: FlowStep[] = pasos.map((paso) => ({
    label: paso.titulo,
    icon: STEP_ICON[paso.id] ?? 'ellipse',
  }));
  return <StepProgress current={actual} steps={steps} />;
}
