import { useMemo, useState } from 'react';
import {
  buildActivateInput,
  emptyLiftForm,
  MAX_GOALS,
  hasErrors,
  mainLifts,
  validateLifts,
  type LiftForm,
} from '@gymsheet/hooks';
import type { ActivateStrengthInput, ProgramMode, Routine } from '@gymsheet/types';

export type ActivationStep = 'replace' | 'dates' | 'mode' | 'data' | 'summary';

const pad = (n: number) => String(n).padStart(2, '0');
/** `YYYY-MM-DD` en hora local (el backend valida la fecha de negocio, no la UTC). */
export const toIsoDate = (date: Date): string => `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;

/** El lunes siguiente (o hoy si ya es lunes y `includeToday`). */
export function nextMonday(from: Date): Date {
  const result = new Date(from.getFullYear(), from.getMonth(), from.getDate());
  const delta = (8 - (result.getDay() || 7)) % 7 || 7;
  result.setDate(result.getDate() + delta);
  return result;
}

export function useActivation(routine: Routine, hasActive: boolean) {
  const today = useMemo(() => new Date(), []);
  const initialDays = routine.dias.map((d) => d.diaSemana).filter((d): d is number => d !== null);
  const [step, setStep] = useState<ActivationStep>(hasActive ? 'replace' : 'dates');
  const [replace, setReplace] = useState(false);
  const [start, setStart] = useState<'today' | 'monday'>('today');
  const [weeks, setWeeks] = useState(routine.duracionSemanas ?? 8);
  const [days, setDays] = useState<number[]>(initialDays);
  const [mode, setMode] = useState<ProgramMode>('NONE');
  const [withCardio, setWithCardio] = useState(false);
  const [chosen, setChosen] = useState<string[]>(() => mainLifts(routine).slice(0, 1).map((l) => l.ejercicioId));
  const [showErrors, setShowErrors] = useState(false);
  const [forms, setForms] = useState<LiftForm[]>(() =>
    mainLifts(routine).map((lift) => emptyLiftForm(lift.ejercicioId, lift.nombre)),
  );

  const todayIso = toIsoDate(today);
  const startIso = start === 'today' ? todayIso : toIsoDate(nextMonday(today));
  // En metas solo cuentan los levantamientos elegidos (1–3); en sobrecarga, todos.
  const forModeForms = mode === 'STRENGTH_GOALS' ? forms.filter((f) => chosen.includes(f.ejercicioId)) : forms;
  const errors = useMemo(() => validateLifts(mode, forModeForms, todayIso), [mode, forModeForms, todayIso]);

  const body: ActivateStrengthInput = buildActivateInput({
    routineId: routine.id,
    mode,
    forms: forModeForms,
    fechaInicio: startIso,
    duracionSemanas: weeks,
    diasSemana: days,
    replace,
  });

  const toggleDay = (day: number) =>
    setDays((current) => (current.includes(day) ? current.filter((d) => d !== day) : [...current, day]));
  const toggleChosen = (id: string) =>
    setChosen((current) =>
      current.includes(id) ? (current.length > 1 ? current.filter((c) => c !== id) : current) : current.length < MAX_GOALS ? [...current, id] : current,
    );
  const updateForm = (ejercicioId: string, patch: Partial<LiftForm>) =>
    setForms((current) => current.map((f) => (f.ejercicioId === ejercicioId ? { ...f, ...patch } : f)));

  /** Pasos posteriores: sin modo no hay datos que pedir. */
  const next = () => {
    // Los errores de los datos solo se enseñan al intentar seguir: no regañan un campo sin tocar.
    if (step === 'data' && hasErrors(errors)) {
      setShowErrors(true);
      return;
    }
    if (step === 'replace') setStep('dates');
    else if (step === 'dates') setStep('mode');
    else if (step === 'mode') setStep(mode === 'NONE' ? 'summary' : 'data');
    else if (step === 'data') setStep('summary');
  };
  const back = (): boolean => {
    if (step === 'summary') setStep(mode === 'NONE' ? 'mode' : 'data');
    else if (step === 'data') setStep('mode');
    else if (step === 'mode') setStep('dates');
    else if (step === 'dates' && hasActive) setStep('replace');
    else return false;
    return true;
  };

  return {
    step, setStep, next, back,
    replace, setReplace, start, setStart, weeks, setWeeks, days, toggleDay,
    mode, setMode, withCardio, setWithCardio, forms, updateForm, errors,
    chosen, toggleChosen, visibleForms: forModeForms,
    showErrors,
    body, startIso, todayIso,
  };
}

export type Activation = ReturnType<typeof useActivation>;
