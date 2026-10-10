import type { ReactNode } from 'react';
import { View } from 'react-native';
import { WIZARD_STEPS } from '@gymsheet/hooks';
import { ScreenHeader, ScrollScreen } from '@/components/layout';
import { BackLink } from '@/components/nav';
import { WizardProgress } from '@/components/wizard/wizard-progress';
import { goToWizardStep } from '@/lib/wizard-routes';
import { spacing } from '@/theme';

/** Alto reservado al final del contenido para que la barra de acciones no lo tape. */
const ACTION_BAR_CLEARANCE = 112;

/**
 * Marco común de las pantallas del asistente: volver, barra de progreso, título
 * y, fijada abajo, la barra de acciones. Es una pantalla completa de la pila
 * (nunca un modal), así que el botón Atrás del sistema recorre los pasos.
 */
export function WizardShell({
  paso,
  title,
  subtitle,
  children,
  actions,
  header,
}: {
  /** Paso de la barra (base 0). En las pantallas de un día es el de «Días». */
  paso: number;
  title: string;
  subtitle?: string;
  children: ReactNode;
  /** Barra fija inferior: acción principal y secundarias. */
  actions: ReactNode;
  /** Sustituye al título estándar (la pantalla de un día pone «Lunes · Empuje»). */
  header?: ReactNode;
}) {
  return (
    <ScrollScreen overlay={actions}>
      <BackLink />
      <View style={{ gap: spacing.lg }}>
        <WizardProgress actual={paso} onIr={goToWizardStep} pasos={WIZARD_STEPS} />
        {header ?? <ScreenHeader detail subtitle={subtitle} title={title} />}
      </View>
      {children}
      <View style={{ height: ACTION_BAR_CLEARANCE }} />
    </ScrollScreen>
  );
}
