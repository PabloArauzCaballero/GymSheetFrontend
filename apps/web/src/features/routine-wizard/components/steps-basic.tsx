'use client';

import {
  GOAL_LABELS,
  WIZARD_STEPS,
  canAdvance,
  stepIdAt,
  validateStep,
  type StepErrors,
} from '@gymsheet/hooks';
import { useRouter } from 'next/navigation';
import { useEffect, type FormEvent, type ReactNode } from 'react';
import { trainingGoals } from '@/shared/api/contracts';
import { Button } from '@/shared/components/ui/button';
import { Field } from '@/shared/components/ui/field';
import { Input } from '@/shared/components/ui/input';
import { Textarea } from '@/shared/components/ui/textarea';
import { dispatchRoutineDraft, useRoutineDraft } from '../draft-store';
import { wizardStepPath } from '../paths';
import { ChoiceChip } from '@/shared/components/ui/choice-chip';
import { WizardFrame } from './wizard-frame';

const FORM_ID = 'wizard-form';

/** Paso actual del asistente: valida, y sólo si está bien pasa al siguiente. */
export function useStep(paso: number) {
  const router = useRouter();
  const { state, draft, dispatch } = useRoutineDraft();
  const errors: StepErrors = state.intentados.includes(paso)
    ? validateStep(draft, stepIdAt(paso))
    : {};
  const next = (event?: FormEvent) => {
    event?.preventDefault();
    dispatch({ type: 'intentar', paso });
    if (!canAdvance(draft, paso)) return;
    const target = Math.min(paso + 1, WIZARD_STEPS.length - 1);
    dispatch({ type: 'ir', paso: target });
    router.push(wizardStepPath(target));
  };
  return { state, draft, dispatch, errors, next };
}

export function NextButton({ disabled = false }: Readonly<{ disabled?: boolean }>) {
  return (
    <Button disabled={disabled} form={FORM_ID} type="submit" variant="primary">
      Siguiente
    </Button>
  );
}

export function StepForm({
  onSubmit,
  children,
}: Readonly<{ onSubmit: (e: FormEvent) => void; children: ReactNode }>) {
  return (
    <form className="grid gap-6" id={FORM_ID} noValidate onSubmit={onSubmit}>
      {children}
    </form>
  );
}

/** «¿Salir sin guardar?»: aviso del navegador al cerrar la pestaña con cambios sin guardar. */
function useBeforeUnload(active: boolean) {
  useEffect(() => {
    if (!active) return undefined;
    const handler = (event: BeforeUnloadEvent) => {
      event.preventDefault();
    };
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, [active]);
}

/**
 * Borrador de una visita anterior: se ofrece retomarlo mientras no se haya
 * tocado nada. (`retomado` lo apaga el propio reductor al primer cambio, así que
 * la tarjeta no sale mientras se escribe el nombre de una rutina nueva.)
 */
function PendingDraft({ onResume }: Readonly<{ onResume: (paso: number) => void }>) {
  const { state, draft } = useRoutineDraft();
  if (!state.retomado || !draft.nombre.trim()) return null;
  return (
    <section aria-label="Borrador sin terminar" className="panel grid gap-3 p-5">
      <p className="font-semibold">Tienes un borrador sin terminar</p>
      <p className="text-sm text-[var(--text-muted)]">{`«${draft.nombre.trim()}»`}</p>
      <div className="flex flex-wrap gap-2">
        <Button onClick={() => dispatchRoutineDraft({ type: 'reiniciar' })} variant="ghost">
          Empezar de nuevo
        </Button>
        <Button onClick={() => onResume(state.paso)} variant="primary">
          Retomar
        </Button>
      </div>
    </section>
  );
}

export function NameStep() {
  const router = useRouter();
  const { state, draft, dispatch, errors, next } = useStep(0);
  useBeforeUnload(state.sucio);
  return (
    <WizardFrame
      actions={<NextButton />}
      description="Un nombre corto que te ayude a reconocerla."
      paso={0}
      title="¿Cómo se llama tu rutina?"
    >
      <PendingDraft onResume={(paso) => router.push(wizardStepPath(paso))} />
      <StepForm onSubmit={next}>
        <Field error={errors.nombre} htmlFor="routine-name" label="Nombre de la rutina">
          <Input
            autoComplete="off"
            id="routine-name"
            maxLength={160}
            onChange={(event) =>
              dispatch({ type: 'campo', campo: 'nombre', valor: event.target.value })
            }
            placeholder="Ej. Empuje 4 días"
            value={draft.nombre}
          />
        </Field>
      </StepForm>
    </WizardFrame>
  );
}

export function DescriptionStep() {
  const { draft, dispatch, errors, next } = useStep(1);
  return (
    <WizardFrame
      actions={<NextButton />}
      description="Opcional. Cuenta para qué sirve o a quién va dirigida."
      paso={1}
      title="Descríbela"
    >
      <StepForm onSubmit={next}>
        <Field
          error={errors.descripcion}
          hint={`${draft.descripcion.length} / 1000`}
          htmlFor="routine-description"
          label="Descripción"
        >
          <Textarea
            id="routine-description"
            maxLength={1000}
            onChange={(event) =>
              dispatch({ type: 'campo', campo: 'descripcion', valor: event.target.value })
            }
            placeholder="Ej. Pecho, hombros y tríceps con progresión de cargas."
            rows={5}
            value={draft.descripcion}
          />
        </Field>
      </StepForm>
    </WizardFrame>
  );
}

export function GoalStep() {
  const { draft, dispatch, next } = useStep(2);
  return (
    <WizardFrame
      actions={<NextButton />}
      description="Define las series y repeticiones con las que empiezan tus ejercicios."
      paso={2}
      title="¿Cuál es tu objetivo?"
    >
      <StepForm onSubmit={next}>
        <div aria-label="Objetivo" className="flex flex-wrap gap-3" role="group">
          {trainingGoals.map((goal) => (
            <ChoiceChip
              key={goal}
              onClick={() =>
                dispatch({ type: 'objetivo', objetivo: draft.objetivo === goal ? null : goal })
              }
              selected={draft.objetivo === goal}
            >
              {GOAL_LABELS[goal]}
            </ChoiceChip>
          ))}
        </div>
        <p className="text-sm text-[var(--text-muted)]">Puedes avanzar sin elegir uno.</p>
      </StepForm>
    </WizardFrame>
  );
}
