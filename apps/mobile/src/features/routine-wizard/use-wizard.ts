import { useCallback } from 'react';
import { router } from 'expo-router';
import {
  WIZARD_STEPS,
  canAdvance,
  stepIdAt,
  validateStep,
  type RoutineDraft,
  type StepErrors,
  type WizardAction,
  type WizardState,
} from '@gymsheet/hooks';
import { wizardStepPath } from '@/lib/wizard-routes';
import { useRoutineDraftStore } from '@/state/routine-draft-store';

export type WizardApi = {
  state: WizardState;
  draft: RoutineDraft;
  dispatch: (action: WizardAction) => void;
  /** Errores del paso, ya filtrados: sólo se muestran tras intentar avanzar. */
  errors: (paso: number) => StepErrors;
  /** Intenta pasar al siguiente paso: valida, y si falla deja los errores a la vista. */
  next: (paso: number) => void;
};

/** `useRoutineDraft` de este dispositivo: el reductor compartido sobre el almacén local. */
export function useRoutineDraft(): WizardApi {
  const state = useRoutineDraftStore((store) => store.state);
  const dispatch = useRoutineDraftStore((store) => store.dispatch);

  const errors = useCallback(
    (paso: number): StepErrors =>
      state.intentados.includes(paso) ? validateStep(state.draft, stepIdAt(paso)) : {},
    [state.draft, state.intentados],
  );

  const next = useCallback(
    (paso: number) => {
      dispatch({ type: 'intentar', paso });
      if (!canAdvance(state.draft, paso)) return;
      const target = Math.min(paso + 1, WIZARD_STEPS.length - 1);
      dispatch({ type: 'ir', paso: target });
      router.push(wizardStepPath(target));
    },
    [dispatch, state.draft],
  );

  return { state, draft: state.draft, dispatch, errors, next };
}
