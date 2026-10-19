'use client';

import { QUICK_MONTHS, durationInWeeks } from '@gymsheet/hooks';
import { Lock } from 'lucide-react';
import { ChoiceChip } from '@/shared/components/ui/choice-chip';
import { Field } from '@/shared/components/ui/field';
import { Input } from '@/shared/components/ui/input';
import { NextButton, StepForm, useStep } from './steps-basic';
import { WizardFrame } from './wizard-frame';

export function DurationStep() {
  const { draft, dispatch, errors, next } = useStep(3);
  const custom = draft.duracion.unidad === 'semanas';
  const weeks = durationInWeeks(draft.duracion);
  const summary = !draft.progresion.activa
    ? `${weeks} semanas · sin progresión automática`
    : draft.progresion.descargaCada
      ? `${weeks} semanas · descarga cada ${draft.progresion.descargaCada}`
      : `${weeks} semanas · sin descarga`;
  return (
    <WizardFrame
      actions={<NextButton />}
      description="Cuánto dura el programa y quién la puede ver."
      info={summary}
      paso={3}
      title="Duración y visibilidad"
    >
      <StepForm onSubmit={next}>
        <section className="panel grid gap-2 p-5">
          <h2 className="flex items-center gap-2 font-semibold">
            <Lock aria-hidden className="size-4 text-[var(--text-muted)]" />
            Privada
          </h2>
          <p className="text-sm leading-6 text-[var(--text-muted)]">
            Solo tú la ves. Más adelante podrás compartirla o publicarla.
          </p>
        </section>

        <fieldset className="grid gap-3">
          <legend className="data-label mb-3">Duración</legend>
          <div className="flex flex-wrap gap-3">
            {QUICK_MONTHS.map((months) => (
              <ChoiceChip
                key={months}
                onClick={() =>
                  dispatch({ type: 'duracion', duracion: { unidad: 'meses', cantidad: months } })
                }
                selected={!custom && draft.duracion.cantidad === months}
              >
                {`${months} ${months === 1 ? 'mes' : 'meses'}`}
              </ChoiceChip>
            ))}
            <ChoiceChip
              onClick={() =>
                dispatch({ type: 'duracion', duracion: { unidad: 'semanas', cantidad: weeks } })
              }
              selected={custom}
            >
              A medida
            </ChoiceChip>
          </div>
          {custom ? (
            <Field error={errors.duracion} htmlFor="routine-weeks" label="Semanas">
              <Input
                id="routine-weeks"
                inputMode="numeric"
                max={52}
                min={1}
                onChange={(event) =>
                  dispatch({
                    type: 'duracion',
                    duracion: { unidad: 'semanas', cantidad: Number(event.target.value) || 0 },
                  })
                }
                type="number"
                value={draft.duracion.cantidad}
              />
            </Field>
          ) : null}
        </fieldset>

        <fieldset className="panel grid gap-4 p-5">
          <legend className="sr-only">Progresión</legend>
          <label className="flex min-h-11 cursor-pointer items-center justify-between gap-4">
            <span className="grid gap-1">
              <span className="font-semibold">Progresión automática</span>
              <span className="text-sm text-[var(--text-muted)]">
                Genera las semanas y propone una semana de descarga.
              </span>
            </span>
            <input
              checked={draft.progresion.activa}
              className="size-5 accent-[var(--volt)]"
              onChange={(event) =>
                dispatch({
                  type: 'progresion',
                  progresion: { ...draft.progresion, activa: event.target.checked },
                })
              }
              role="switch"
              type="checkbox"
            />
          </label>
          {draft.progresion.activa ? (
            <div aria-label="Descarga" className="flex flex-wrap gap-3" role="group">
              {([4, 5, 6] as const).map((every) => (
                <ChoiceChip
                  aria-label={`Descarga cada ${every} semanas`}
                  key={every}
                  onClick={() =>
                    dispatch({
                      type: 'progresion',
                      progresion: { activa: true, descargaCada: every },
                    })
                  }
                  selected={draft.progresion.descargaCada === every}
                >
                  {`Cada ${every}`}
                </ChoiceChip>
              ))}
              <ChoiceChip
                onClick={() =>
                  dispatch({ type: 'progresion', progresion: { activa: true, descargaCada: null } })
                }
                selected={draft.progresion.descargaCada === null}
              >
                Sin descarga
              </ChoiceChip>
            </div>
          ) : null}
        </fieldset>
      </StepForm>
    </WizardFrame>
  );
}
