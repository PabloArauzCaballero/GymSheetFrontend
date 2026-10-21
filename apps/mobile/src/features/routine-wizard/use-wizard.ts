import { wizardTapLock } from '@/lib/tap-lock';
import { useCallback } from 'react';
import { router } from 'expo-router';
import {
  validateStep,
  type RoutineDraft,
  type StepErrors,
  type WizardAction,
  type WizardState,
} from '@gymsheet/hooks';
import {
  MOBILE_WIZARD_STEPS,
  mobileStepIdAt,
  wizardStepPath,
} from '@/lib/wizard-routes';
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

export function canMobileAdvance(draft: RoutineDraft, index: number): boolean {
  return Object.keys(validateStep(draft, mobileStepIdAt(index))).length === 0;
}

/** `useRoutineDraft` de este dispositivo: el reductor compartido sobre el almacén local. */
export function useRoutineDraft(): WizardApi {
  const state = useRoutineDraftStore((store) => store.state);
  const dispatch = useRoutineDraftStore((store) => store.dispatch);

  const errors = useCallback(
    (paso: number): StepErrors =>
      state.intentados.includes(paso) ? validateStep(state.draft, mobileStepIdAt(paso)) : {},
    [state.draft, state.intentados],
  );

  const next = useCallback(
    (paso: number) => {
      dispatch({ type: 'intentar', paso });
      if (!canMobileAdvance(state.draft, paso)) return;
      // Una vez por toque: un doble toque en «Siguiente» apilaba el paso dos veces
      // (y «Volver» parecía no hacer nada, porque volvía a la copia).
      wizardTapLock.run(() => {
        const target = Math.min(paso + 1, MOBILE_WIZARD_STEPS.length - 1);
        dispatch({ type: 'ir', paso: target });
        router.push(wizardStepPath(target));
      });
    },
    [dispatch, state.draft],
  );

  return { state, draft: state.draft, dispatch, errors, next };
}
