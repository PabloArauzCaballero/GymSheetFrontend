'use client';

import { Check, ChevronLeft, ChevronRight } from 'lucide-react';
import {
  useCallback,
  useEffect,
  useId,
  useRef,
  useState,
  type FormEvent,
  type ReactNode,
} from 'react';
import { cn } from '@/shared/lib/cn';
import { Button } from './button';

export type WizardStep = {
  id: string;
  /** Nombre corto del paso, visible en el indicador de progreso. */
  title: string;
  description?: string;
  /**
   * Validación propia del paso, además de la nativa del navegador
   * (`required`, `min`, `pattern`…). Devuelve el mensaje que impide avanzar.
   */
  validate?: (values: FormData) => string | null;
  /** `values` es el contenido del formulario al entrar al paso (para resúmenes). */
  render: (values: FormData) => ReactNode;
};

type FormWizardProps = Readonly<{
  steps: readonly WizardStep[];
  onSubmit: (values: FormData) => void;
  onCancel?: () => void;
  submitLabel?: string;
  pending?: boolean;
  className?: string;
}>;

type Control = HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement;

function controlsOf(container: HTMLElement | null): Control[] {
  if (!container) return [];
  return Array.from(container.querySelectorAll<Control>('input, select, textarea'));
}

/**
 * Formulario por fases para diálogos de alta. Un solo `<form>` contiene todos
 * los pasos montados (los inactivos ocultos), así que los valores sobreviven al
 * ir y volver y el envío final lleva el `FormData` completo, igual que un
 * formulario de una sola pantalla.
 *
 * Cada paso se valida al avanzar. Antes de enviar se revalidan todos: si un
 * paso anterior quedó inválido, el asistente vuelve a él y señala el campo.
 */
export function FormWizard({
  steps,
  onSubmit,
  onCancel,
  submitLabel = 'Guardar',
  pending = false,
  className,
}: FormWizardProps) {
  const formRef = useRef<HTMLFormElement>(null);
  const stepRefs = useRef<(HTMLElement | null)[]>([]);
  const pendingReport = useRef<Control | null>(null);
  const [current, setCurrent] = useState(0);
  const [visited, setVisited] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [snapshot, setSnapshot] = useState<FormData>(() => new FormData());
  const baseId = useId();
  const isLast = current === steps.length - 1;

  const readValues = useCallback(
    () => (formRef.current ? new FormData(formRef.current) : new FormData()),
    [],
  );

  const goTo = useCallback(
    (index: number) => {
      setSnapshot(readValues());
      setError(null);
      setCurrent(index);
      setVisited((value) => Math.max(value, index));
    },
    [readValues],
  );

  /** Valida un paso. Si falla, deja al usuario en ese paso con el error visible. */
  const validateStep = useCallback(
    (index: number): boolean => {
      const invalid = controlsOf(stepRefs.current[index] ?? null).find(
        (control) => !control.checkValidity(),
      );
      if (invalid) {
        if (index === current) invalid.reportValidity();
        else {
          pendingReport.current = invalid;
          goTo(index);
        }
        return false;
      }
      const message = steps[index]?.validate?.(readValues()) ?? null;
      if (message) {
        if (index !== current) goTo(index);
        setError(message);
        return false;
      }
      return true;
    },
    [current, goTo, readValues, steps],
  );

  // Al cambiar de paso: el campo inválido que motivó el salto se señala; si no,
  // el foco va al primer campo del paso para que el teclado siga el recorrido.
  useEffect(() => {
    const invalid = pendingReport.current;
    pendingReport.current = null;
    if (invalid) {
      invalid.reportValidity();
      return;
    }
    const container = stepRefs.current[current];
    const first = controlsOf(container ?? null).find(
      (control) => control.type !== 'hidden' && !control.disabled,
    );
    (first ?? container)?.focus({ preventScroll: true });
  }, [current]);

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (pending) return;
    if (!isLast) {
      if (validateStep(current)) goTo(current + 1);
      return;
    }
    for (let index = 0; index < steps.length; index += 1) {
      if (!validateStep(index)) return;
    }
    onSubmit(readValues());
  };

  const jumpTo = (index: number) => {
    if (index === current) return;
    if (index < current) {
      goTo(index);
      return;
    }
    for (let step = current; step < index; step += 1) {
      if (!validateStep(step)) return;
    }
    goTo(index);
  };

  const active = steps[current];

  return (
    <form
      className={cn('grid gap-6', className)}
      noValidate
      // El aviso de un paso deja de ser cierto en cuanto el usuario corrige:
      // escribir o actuar dentro del paso (p. ej. marcar el mapa) lo retira.
      onInput={() => setError(null)}
      onPointerDown={(event) => {
        if (!(event.target as HTMLElement).closest('button[type="submit"]')) setError(null);
      }}
      onSubmit={handleSubmit}
      ref={formRef}
    >
      <nav aria-label="Pasos del formulario">
        <p className="data-label mb-3" aria-live="polite">
          Paso {current + 1} de {steps.length}
          {active ? ` · ${active.title}` : ''}
        </p>
        <ol className="grid gap-2" style={{ gridTemplateColumns: `repeat(${steps.length}, 1fr)` }}>
          {steps.map((step, index) => {
            const state = index < current ? 'done' : index === current ? 'current' : 'upcoming';
            const reachable = index <= visited + 1;
            return (
              <li key={step.id} className="min-w-0">
                <button
                  aria-current={state === 'current' ? 'step' : undefined}
                  aria-label={`Paso ${index + 1}: ${step.title}`}
                  className="group grid w-full gap-2 text-left disabled:cursor-not-allowed"
                  disabled={!reachable || pending}
                  onClick={() => jumpTo(index)}
                  type="button"
                >
                  <span
                    className={cn(
                      'h-1 rounded-full transition-colors duration-200',
                      state === 'upcoming' ? 'bg-[var(--border)]' : 'bg-[var(--text)]',
                    )}
                  />
                  <span className="flex min-w-0 items-center gap-2">
                    <span
                      className={cn(
                        'grid size-6 shrink-0 place-items-center rounded-full border text-[11px] font-bold',
                        state === 'done' &&
                          'border-[var(--text)] bg-[var(--text)] text-[var(--background)]',
                        state === 'current' && 'border-[var(--text)] text-[var(--text)]',
                        state === 'upcoming' && 'border-[var(--border)] text-[var(--text-muted)]',
                      )}
                    >
                      {state === 'done' ? <Check aria-hidden className="size-3.5" /> : index + 1}
                    </span>
                    <span
                      className={cn(
                        'hidden truncate text-xs font-semibold sm:inline',
                        state === 'upcoming' ? 'text-[var(--text-muted)]' : 'text-[var(--text)]',
                      )}
                    >
                      {step.title}
                    </span>
                  </span>
                </button>
              </li>
            );
          })}
        </ol>
      </nav>

      {steps.map((step, index) => (
        <section
          aria-labelledby={`${baseId}-${step.id}`}
          className="grid gap-5 outline-none"
          hidden={index !== current}
          key={step.id}
          ref={(element) => {
            stepRefs.current[index] = element;
          }}
          tabIndex={-1}
        >
          <header className="grid gap-1">
            <h3 className="text-base font-bold" id={`${baseId}-${step.id}`}>
              {step.title}
            </h3>
            {step.description ? (
              <p className="text-sm leading-6 text-[var(--text-muted)]">{step.description}</p>
            ) : null}
          </header>
          {step.render(snapshot)}
        </section>
      ))}

      {error ? (
        <p
          className="rounded-[4px] border border-[var(--danger-border)] bg-[var(--danger-bg)] px-3 py-2 text-sm text-[var(--danger-text)]"
          role="alert"
        >
          {error}
        </p>
      ) : null}

      <div className="flex items-center justify-between gap-2 border-t border-[var(--border-subtle)] pt-4">
        {current === 0 ? (
          <Button disabled={pending} onClick={onCancel} type="button" variant="ghost">
            Cancelar
          </Button>
        ) : (
          <Button
            disabled={pending}
            onClick={() => goTo(current - 1)}
            type="button"
            variant="ghost"
          >
            <ChevronLeft aria-hidden className="size-4" />
            Atrás
          </Button>
        )}
        {isLast ? (
          <Button loading={pending} type="submit" variant="primary">
            {submitLabel}
          </Button>
        ) : (
          <Button type="submit" variant="primary">
            Siguiente
            <ChevronRight aria-hidden className="size-4" />
          </Button>
        )}
      </div>
    </form>
  );
}

export { textOf, WizardSummary } from './wizard-summary';
