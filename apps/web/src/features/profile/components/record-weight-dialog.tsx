'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus } from 'lucide-react';
import { useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { z } from 'zod';
import { onboardingService } from '@/features/onboarding/services/onboarding-service';
import { queryKeys } from '@/shared/api/query-keys';
import { Button, type ButtonProps } from '@/shared/components/ui/button';
import { Dialog, DialogContent, DialogTrigger } from '@/shared/components/ui/dialog';
import { Field } from '@/shared/components/ui/field';
import { Input } from '@/shared/components/ui/input';
import { cn } from '@/shared/lib/cn';
import { notify } from '@/shared/notifications';

/**
 * Anotar un pesaje a mano, espejo de `app/(app)/registrar-peso.tsx` del móvil.
 *
 * Hasta ahora el histórico de peso de la web sólo se llenaba de rebote: al
 * completar el alta o al guardar el perfil entero. Pesarse es algo que se hace
 * cada semana, y obligar a repasar edad, estatura y objetivo para anotar un
 * número era pedir cuatro respuestas para una pregunta. `addMeasurement` llevaba
 * escrito desde el alta sin un solo consumidor.
 *
 * Diálogo y no página: en la web la evolución del peso ya está en pantalla
 * cuando se decide anotar, y sacar a la persona de ella para pedirle un número
 * le haría perder de vista justo el dato con el que lo compara.
 */

/** Un campo decimal acepta la coma o el punto según el teclado: `72,5` es `72.5`. */
function toNumber(value: string): number {
  return Number(value.replace(',', '.'));
}

/** `AAAA-MM-DD` del día local, no del UTC: a las 21:00 en La Paz «hoy» ya sería mañana en Londres. */
function isoDay(daysAgo = 0): string {
  const date = new Date();
  date.setDate(date.getDate() - daysAgo);
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${date.getFullYear()}-${month}-${day}`;
}

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/u;

/**
 * `2026-02-31` pasa el patrón y no existe. `Date` lo acepta y lo desplaza a
 * marzo, así que la única forma de detectarlo es construir la fecha y comprobar
 * que sigue diciendo lo mismo que se escribió.
 */
function isCalendarDate(value: string): boolean {
  if (!DATE_PATTERN.test(value)) return false;
  const year = Number(value.slice(0, 4));
  const month = Number(value.slice(5, 7));
  const day = Number(value.slice(8, 10));
  const date = new Date(year, month - 1, day);
  return date.getFullYear() === year && date.getMonth() === month - 1 && date.getDate() === day;
}

/**
 * Los límites son los mismos que valida el servidor —peso positivo hasta 1000,
 * unidad KG o LB, fecha `AAAA-MM-DD` no futura—, comprobados aquí para que un
 * cero o una coma de más se resuelvan sin gastar una petición. Mismos textos que
 * el móvil: es la misma validación contada dos veces, no dos validaciones.
 */
const measurementFormSchema = z.object({
  weight: z
    .string()
    .trim()
    .min(1, 'Ingresa tu peso.')
    .transform(toNumber)
    .refine((value) => Number.isFinite(value), 'Usa solo números, por ejemplo 72,5.')
    .refine((value) => value > 0, 'El peso debe ser mayor que cero.')
    .refine((value) => value <= 1000, 'El peso no puede superar 1000.'),
  unit: z.enum(['KG', 'LB']),
  measuredOn: z
    .string()
    .trim()
    .refine(isCalendarDate, 'Usa el formato AAAA-MM-DD, por ejemplo 2026-09-08.')
    // Una fecha futura sólo puede ser un dedazo: nadie anota un pesaje que aún
    // no ha ocurrido, y guardarla desordenaría la evolución para siempre.
    .refine((value) => value <= isoDay(), 'La fecha no puede ser futura.'),
});

type MeasurementFormValues = z.input<typeof measurementFormSchema>;
type MeasurementFormPayload = z.output<typeof measurementFormSchema>;

/**
 * La clave que evita dos filas del mismo pesaje. Se deriva del contenido y no de
 * un azar por pulsación: un doble clic, y sobre todo un reintento tras perder la
 * red, vuelven a calcular exactamente la misma clave, que es lo que hace que el
 * backend reconozca el segundo envío como el mismo pesaje.
 */
function idempotencyKeyFor(payload: MeasurementFormPayload): string {
  return `peso-${payload.measuredOn}-${payload.weight}-${payload.unit}`;
}

/** Elección entre un puñado de opciones excluyentes ("KG" vs "LB", "Hoy" vs "Ayer"). */
function ToggleChip({
  active,
  label,
  onSelect,
}: Readonly<{ active: boolean; label: string; onSelect: () => void }>) {
  return (
    <button
      // Sin esto el relleno volt es la única señal de cuál está elegida, que no
      // es ninguna señal para quien navega con lector de pantalla.
      aria-pressed={active}
      className={cn(
        'h-10 rounded-[var(--radius-sm)] border px-4 text-sm font-semibold transition-colors duration-[var(--dur-1)]',
        active
          ? 'border-[var(--volt)] bg-[var(--volt)] text-[var(--accent-contrast)]'
          : 'border-[var(--border-subtle)] text-[var(--text-muted)] hover:border-[var(--border)] hover:text-[var(--text)]',
      )}
      onClick={onSelect}
      type="button"
    >
      {label}
    </button>
  );
}

function RecordWeightForm({ onSaved }: Readonly<{ onSaved: () => void }>) {
  const queryClient = useQueryClient();
  const {
    control,
    formState: { errors },
    handleSubmit,
    register,
  } = useForm<MeasurementFormValues, unknown, MeasurementFormPayload>({
    resolver: zodResolver(measurementFormSchema),
    // Lo normal es anotar el pesaje del día en que se hizo: la fecha viene
    // resuelta y sólo la toca quien recupera uno de ayer.
    defaultValues: { weight: '', unit: 'KG', measuredOn: isoDay() },
  });

  const record = useMutation({
    mutationFn: (payload: MeasurementFormPayload) =>
      // El backend sella `source: 'USER'` en este endpoint; el cliente no lo
      // manda, igual que en el móvil.
      onboardingService.addMeasurement({ ...payload, idempotencyKey: idempotencyKeyFor(payload) }),
    onSuccess: async () => {
      await Promise.all([
        // La misma clave que lee «Progreso corporal» en el perfil y la tarjeta
        // de peso del panel; sin esto el registro nuevo no aparecería hasta
        // recargar la página.
        queryClient.invalidateQueries({ queryKey: queryKeys.bodyMeasurements }),
        // La senda se refresca por si el pesaje cuenta para algún hito: es una
        // sola lectura y evita dejar dos pantallas contando cosas distintas.
        queryClient.invalidateQueries({ queryKey: ['progression', 'me'] }),
      ]);
      notify.success('Peso registrado.');
      onSaved();
    },
    onError: (error: Error) => notify.error(error),
  });

  return (
    <form className="grid gap-6" onSubmit={handleSubmit((values) => record.mutate(values))}>
      <div className="grid gap-3">
        <Field error={errors.weight?.message} htmlFor="peso" label="Peso">
          <Input id="peso" inputMode="decimal" placeholder="72,5" {...register('weight')} />
        </Field>
        <Controller
          control={control}
          name="unit"
          render={({ field }) => (
            <div aria-label="Unidad" className="flex gap-2" role="group">
              {(['KG', 'LB'] as const).map((unit) => (
                <ToggleChip
                  active={field.value === unit}
                  key={unit}
                  label={unit}
                  onSelect={() => field.onChange(unit)}
                />
              ))}
            </div>
          )}
        />
      </div>

      <Controller
        control={control}
        name="measuredOn"
        render={({ field }) => (
          <div className="grid gap-3">
            <Field error={errors.measuredOn?.message} htmlFor="fecha" label="Fecha del pesaje">
              <Input
                id="fecha"
                // El tope lo pone también el control nativo: la fecha futura se
                // rechaza igual en el esquema, pero así no llega ni a escribirse.
                max={isoDay()}
                onBlur={field.onBlur}
                onChange={(event) => field.onChange(event.target.value)}
                type="date"
                value={field.value}
              />
            </Field>
            {/* Los dos días que se anotan de verdad, a un clic. El selector
                completo se queda para el pesaje que se recupera tarde. */}
            <div aria-label="Atajos de fecha" className="flex gap-2" role="group">
              <ToggleChip
                active={field.value === isoDay()}
                label="Hoy"
                onSelect={() => field.onChange(isoDay())}
              />
              <ToggleChip
                active={field.value === isoDay(1)}
                label="Ayer"
                onSelect={() => field.onChange(isoDay(1))}
              />
            </div>
          </div>
        )}
      />

      <div className="grid gap-2">
        <Button loading={record.isPending} type="submit" variant="primary">
          Guardar pesaje
        </Button>
        <p className="text-xs leading-5 text-[var(--text-muted)]">
          Cada pesaje queda en tu histórico; no reemplaza al anterior.
        </p>
      </div>
    </form>
  );
}

/** El botón y su diálogo. Quien lo monta sólo decide dónde vive y con qué peso visual. */
export function RecordWeightButton({
  size = 'md',
  variant = 'secondary',
}: Readonly<{ size?: ButtonProps['size']; variant?: ButtonProps['variant'] }>) {
  const [open, setOpen] = useState(false);
  return (
    <Dialog onOpenChange={setOpen} open={open}>
      <DialogTrigger asChild>
        <Button size={size} type="button" variant={variant}>
          <Plus aria-hidden className="size-4" />
          Registrar peso
        </Button>
      </DialogTrigger>
      <DialogContent
        className="max-w-md"
        description="Anota tu pesaje y quedará en tu evolución."
        title="Registrar peso"
      >
        {/* El panel se desmonta al cerrar, así que el formulario vuelve a nacer
            con la fecha de hoy y sin el peso anterior escrito en el campo. */}
        <RecordWeightForm onSaved={() => setOpen(false)} />
      </DialogContent>
    </Dialog>
  );
}
