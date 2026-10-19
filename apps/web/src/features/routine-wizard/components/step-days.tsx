'use client';

import {
  WEEKDAYS,
  WEEKDAY_INITIALS,
  WEEKDAY_NAMES,
  canAdvance,
  countLabel,
  summarizeStructure,
  type Weekday,
} from '@gymsheet/hooks';
import { ChevronRight } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { confirm } from '@/shared/notifications';
import { Button } from '@/shared/components/ui/button';
import { Checkbox } from '@/shared/components/ui/checkbox';
import { cn } from '@/shared/lib/cn';
import { useRoutineDraft } from '../draft-store';
import { dayPath, wizardStepPath } from '../paths';
import { ChoiceChip } from '@/shared/components/ui/choice-chip';
import { WizardFrame } from './wizard-frame';

/**
 * Paso 5: qué días se entrena y qué se hace cada uno.
 *
 * Cada día elegido es una fila con su casilla: marcar dos o más y pulsar
 * «Configurar seleccionados» añade los mismos ejercicios a todos a la vez. Sin
 * ninguna casilla marcada, abrir el día lleva a sus ejercicios. (En el móvil la
 * selección múltiple se activa con un toque sostenido; en la web, con casillas.)
 */
export function DaysStep() {
  const router = useRouter();
  const { state, draft, dispatch } = useRoutineDraft();
  const selected = state.seleccion ?? [];

  const toggleWeekday = async (dia: Weekday) => {
    const day = draft.dias.find((candidate) => candidate.diaSemana === dia);
    if (day && day.ejercicios.length > 0) {
      const result = await confirm({
        title: `¿Quitar el ${WEEKDAY_NAMES[dia].toLowerCase()}?`,
        message: `Se perderán sus ${day.ejercicios.length} ejercicios.`,
        severity: 'danger',
        confirmLabel: 'Quitar',
      });
      if (!result.confirmed) return;
    }
    dispatch({ type: 'alternarDia', dia });
  };

  const toggleSelected = (dia: Weekday, checked: boolean) => {
    if (state.seleccion === null) dispatch({ type: 'entrarSeleccion', dia });
    else if (checked !== selected.includes(dia)) dispatch({ type: 'alternarSeleccion', dia });
  };

  const configureTogether = () => {
    dispatch({ type: 'iniciarGrupo' });
    router.push(dayPath('grupo'));
  };

  const advance = () => {
    dispatch({ type: 'intentar', paso: 4 });
    if (!canAdvance(draft, 4)) return;
    dispatch({ type: 'ir', paso: 5 });
    router.push(wizardStepPath(5));
  };

  const actions =
    selected.length > 0 ? (
      <>
        <Button onClick={() => dispatch({ type: 'salirSeleccion' })} variant="ghost">
          Cancelar
        </Button>
        <Button disabled={selected.length === 0} onClick={configureTogether} variant="primary">
          Configurar seleccionados
        </Button>
      </>
    ) : (
      <Button disabled={draft.dias.length === 0} onClick={advance} variant="primary">
        Siguiente
      </Button>
    );

  const info =
    selected.length > 0
      ? `${selected.length} ${selected.length === 1 ? 'día seleccionado' : 'días seleccionados'}`
      : draft.dias.length > 0
        ? summarizeStructure(draft)
        : undefined;

  return (
    <WizardFrame
      actions={actions}
      description="Elige los días y abre cada uno para añadir sus ejercicios."
      info={info}
      paso={4}
      title="¿Qué días entrenas?"
    >
      <fieldset className="grid gap-3">
        <legend className="data-label mb-3">Días de entrenamiento</legend>
        <div className="flex flex-wrap gap-3">
          {WEEKDAYS.map((dia) => (
            <ChoiceChip
              aria-label={WEEKDAY_NAMES[dia]}
              key={dia}
              onClick={() => void toggleWeekday(dia)}
              selected={draft.dias.some((day) => day.diaSemana === dia)}
            >
              {WEEKDAY_INITIALS[dia]}
            </ChoiceChip>
          ))}
        </div>
        {draft.dias.length === 0 ? (
          <p className="text-sm text-[var(--danger-text)]" role="alert">
            Elige al menos un día
          </p>
        ) : null}
      </fieldset>

      {draft.dias.length > 0 ? (
        <section aria-label="Tu semana" className="grid gap-3">
          <h2 className="data-label">Tu semana</h2>
          <ul className="grid gap-3">
            {draft.dias.map((day) => {
              const checked = selected.includes(day.diaSemana);
              const name = WEEKDAY_NAMES[day.diaSemana];
              const subtitle = [day.nombre.trim(), countLabel(day.ejercicios.length)]
                .filter(Boolean)
                .join(' · ');
              return (
                <li
                  className={cn(
                    'flex items-center gap-3 rounded-[var(--radius-lg)] border px-4 py-2',
                    checked
                      ? 'border-[var(--volt)] bg-[rgb(var(--accent-channels)/0.08)]'
                      : 'border-[var(--border-subtle)] bg-[var(--surface-low)]',
                  )}
                  key={day.diaSemana}
                >
                  <Checkbox
                    aria-label={`Seleccionar ${name}`}
                    checked={checked}
                    className="shrink-0"
                    label={<span className="sr-only">{`Seleccionar ${name}`}</span>}
                    onChange={(event) => toggleSelected(day.diaSemana, event.target.checked)}
                  />
                  <button
                    className="flex min-h-14 flex-1 items-center justify-between gap-3 text-left focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--volt)]"
                    data-testid={`day-row-${day.diaSemana}`}
                    onClick={() => router.push(dayPath(day.diaSemana))}
                    type="button"
                  >
                    <span className="grid gap-0.5">
                      <span className="font-semibold">{name}</span>
                      <span className="text-sm text-[var(--text-muted)]">{subtitle}</span>
                    </span>
                    <ChevronRight aria-hidden className="size-4 text-[var(--text-disabled)]" />
                  </button>
                </li>
              );
            })}
          </ul>
          <p className="text-xs text-[var(--text-muted)]">
            Abre un día para editarlo, o marca varios para configurarlos juntos.
          </p>
        </section>
      ) : null}
    </WizardFrame>
  );
}
