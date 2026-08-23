import { useCallback, useState } from 'react';
import type { UseFormReturn } from 'react-hook-form';
import type { MuscleEquipmentInference } from '@/shared/api/schemas';
import type { ExerciseFormValues } from './exercise-form-model';

/**
 * Alta guiada por músculo: la persona elige qué entrena y el resto se rellena.
 *
 * Solo tiene sentido al crear. Al editar, el ejercicio ya está clasificado y
 * volver a deducirlo sobrescribiría lo que su dueño ajustó a mano.
 *
 * Se guardan el código del músculo y la etiqueta de equipamiento elegida, no la
 * deducción entera: esas dos cadenas son lo único que el servidor necesita para
 * rehacerla, y los campos que rellena quedan visibles y editables en el
 * formulario. Rellenar no es bloquear.
 */
export function useMuscleInference(form: UseFormReturn<ExerciseFormValues>) {
  const [muscleCode, setMuscleCode] = useState('');
  const [equipmentLabel, setEquipmentLabel] = useState<string | undefined>(undefined);

  /**
   * Estable entre renders: el selector lo tiene como dependencia de su efecto,
   * y una función nueva en cada render lo haría notificar en bucle.
   */
  const applyInference = useCallback(
    (code: string, inference: MuscleEquipmentInference | null) => {
      setMuscleCode(code);
      setEquipmentLabel(inference?.primary?.label);
      if (code === '' || !inference) return;
      form.setValue('grupoMuscular', inference.muscleGroupName, { shouldValidate: true });
      form.setValue('bodyPart', inference.muscleGroupName);
      form.setValue('targetMuscle', inference.muscleName);
      // El nombre solo se propone si está vacío: quien ya escribió el suyo no
      // debe verlo desaparecer por cambiar de músculo.
      if (!form.getValues('nombre').trim() && inference.suggestedName) {
        form.setValue('nombre', inference.suggestedName, { shouldValidate: true });
      }
    },
    [form],
  );

  return { muscleCode, equipmentLabel, applyInference };
}
