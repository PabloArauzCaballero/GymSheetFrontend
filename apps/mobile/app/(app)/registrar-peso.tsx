import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { Controller, useForm } from 'react-hook-form';
import { Pressable, Text, View } from 'react-native';
import { z } from 'zod';
import { profileService, type BodyMeasurementRecordInput } from '@/api/services';
import { numericInputProps } from '@/components/keyboard';
import { Card, ScreenHeader, ScrollScreen } from '@/components/layout';
import { BackLink } from '@/components/nav';
import { Button, Input } from '@/components/ui';
import { notify } from '@/notifications';
import { colors, fontSizes, minTouchTarget, radii, semibold, spacing } from '@/theme';

/**
 * Registrar un pesaje a mano.
 *
 * Hasta ahora el histórico de peso sólo se llenaba de rebote: al completar el
 * onboarding o al editar el perfil entero. Pesarse es algo que se hace cada
 * semana, y obligar a pasar por un formulario de cuatro pasos —peso, estatura,
 * edad, objetivo— para anotar un número era pedir cuatro respuestas para una
 * pregunta.
 *
 * Pantalla empujada sobre el perfil, no hoja modal: es el mismo patrón que
 * `profile-edit`, y así hereda la transición, el gesto de borde y el `BackLink`
 * del resto de pantallas de detalle sin inventar una tercera forma de volver.
 */

/**
 * Un teclado numérico ofrece la coma o el punto según el idioma del teléfono,
 * así que `72,5` y `72.5` tienen que significar el mismo número.
 */
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
  return (
    date.getFullYear() === year && date.getMonth() === month - 1 && date.getDate() === day
  );
}

/**
 * El formulario habla en cadenas (es lo que produce un `TextInput`) y entrega
 * los números que espera la API, así que `z.input` es la forma atada a los
 * campos y `z.output` la que viaja al backend.
 *
 * Los límites son los mismos que valida el servidor —peso positivo hasta 1000,
 * unidad KG o LB, fecha `AAAA-MM-DD`—, comprobados aquí para que un cero o una
 * coma de más se resuelvan sin gastar una petición.
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
 * La clave que evita dos filas del mismo pesaje.
 *
 * Se deriva del contenido, no de un azar por pulsación: un doble toque, y sobre
 * todo un reintento después de perder la red —que puede llegar con la pantalla
 * ya remontada—, vuelven a calcular exactamente la misma clave, que es lo que
 * hace que el backend reconozca el segundo envío como el mismo pesaje. Con un
 * identificador aleatorio, el reintento sería un registro nuevo.
 *
 * Siempre pasa de largo el mínimo de 8 caracteres: sólo la fecha ya aporta 10.
 */
function idempotencyKeyFor(payload: MeasurementFormPayload): string {
  return `peso-${payload.measuredOn}-${payload.weight}-${payload.unit}`;
}

/** Chip de un toque, para elegir entre un puñado de opciones excluyentes ("KG" vs "LB"). */
function ToggleChip({
  label,
  active,
  onPress,
}: {
  label: string;
  active: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      // Sin esto el relleno volt es la única señal de cuál está elegida, que no
      // es ninguna señal para quien navega con lector de pantalla.
      accessibilityState={{ selected: active }}
      onPress={onPress}
      style={({ pressed }) => ({
        minHeight: minTouchTarget,
        justifyContent: 'center',
        paddingHorizontal: spacing.md,
        borderRadius: radii.md,
        borderWidth: 1,
        borderColor: active ? colors.volt : colors.border,
        backgroundColor: active ? colors.volt : colors.surface,
        opacity: pressed ? 0.75 : 1,
      })}
    >
      <Text
        style={{
          color: active ? colors.background : colors.text,
          fontSize: fontSizes.sm,
          fontWeight: semibold,
        }}
      >
        {label}
      </Text>
    </Pressable>
  );
}

function FieldError({ message }: { message?: string }) {
  if (!message) return null;
  return <Text style={{ color: colors.danger, fontSize: fontSizes.xs }}>{message}</Text>;
}

export default function RecordWeightScreen() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<MeasurementFormValues, unknown, MeasurementFormPayload>({
    resolver: zodResolver(measurementFormSchema),
    defaultValues: {
      weight: '',
      unit: 'KG',
      // Lo normal es anotar el pesaje del día en que se hizo: la fecha viene
      // resuelta y sólo se toca quien recupera uno de ayer.
      measuredOn: isoDay(),
    },
  });

  const record = useMutation({
    mutationFn: (input: BodyMeasurementRecordInput) => profileService.recordMeasurement(input),
    onSuccess: async () => {
      // Misma clave que lee «Evolución del peso» en el perfil; sin esto el
      // registro nuevo no aparecería hasta reabrir la aplicación.
      await queryClient.invalidateQueries({ queryKey: ['profile', 'body-measurements'] });
      notify.success('Peso registrado.');
      router.back();
    },
    onError: (error: unknown) => {
      notify.error(error);
    },
  });

  const onSubmit = handleSubmit((values) => {
    record.mutate({ ...values, idempotencyKey: idempotencyKeyFor(values) });
  });

  return (
    // `center` porque esta pantalla es el formulario entero: sin ello la tarjeta
    // queda arriba con el resto de la pantalla en negro.
    <ScrollScreen center>
      <BackLink />
      <ScreenHeader
        subtitle="Anota tu pesaje y quedará en tu evolución."
        title="Registrar peso"
      />
      <Card style={{ gap: spacing.lg }}>
        <View style={{ gap: spacing.xs }}>
          <Controller
            control={control}
            name="weight"
            render={({ field: { onChange, onBlur, value } }) => (
              <Input
                error={errors.weight?.message}
                keyboardType="decimal-pad"
                {...numericInputProps}
                label="Peso"
                onBlur={onBlur}
                onChangeText={onChange}
                placeholder="72,5"
                value={value}
              />
            )}
          />
          <Controller
            control={control}
            name="unit"
            render={({ field: { onChange, value } }) => (
              <View style={{ flexDirection: 'row', gap: spacing.xs }}>
                {(['KG', 'LB'] as const).map((unit) => (
                  <ToggleChip
                    active={value === unit}
                    key={unit}
                    label={unit}
                    onPress={() => onChange(unit)}
                  />
                ))}
              </View>
            )}
          />
          <FieldError message={errors.unit?.message} />
        </View>

        <Controller
          control={control}
          name="measuredOn"
          render={({ field: { onChange, onBlur, value } }) => (
            <View style={{ gap: spacing.xs }}>
              <Input
                error={errors.measuredOn?.message}
                keyboardType="numbers-and-punctuation"
                {...numericInputProps}
                label="Fecha del pesaje (AAAA-MM-DD)"
                onBlur={onBlur}
                onChangeText={onChange}
                placeholder={isoDay()}
                value={value}
              />
              {/* Los dos días que se anotan de verdad, a un toque. Escribir la
                  fecha completa se queda para el pesaje que se recupera tarde,
                  que es el caso raro. */}
              <View style={{ flexDirection: 'row', gap: spacing.xs }}>
                <ToggleChip
                  active={value === isoDay()}
                  label="Hoy"
                  onPress={() => onChange(isoDay())}
                />
                <ToggleChip
                  active={value === isoDay(1)}
                  label="Ayer"
                  onPress={() => onChange(isoDay(1))}
                />
              </View>
            </View>
          )}
        />

        <View style={{ gap: spacing.xs }}>
          <Button label="Guardar pesaje" loading={record.isPending} onPress={onSubmit} />
          <Text style={{ color: colors.textMuted, fontSize: fontSizes.xs, lineHeight: 18 }}>
            Cada pesaje queda en tu histórico; no reemplaza al anterior.
          </Text>
        </View>
      </Card>
    </ScrollScreen>
  );
}
