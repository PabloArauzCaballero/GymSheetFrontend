import { Field } from '@/shared/components/ui/field';
import { Input } from '@/shared/components/ui/input';

export const GEOFENCE_MIN_M = 20;
export const GEOFENCE_MAX_M = 5000;

/**
 * Radio para verificar rachas por ubicación. Vacío = la sede no verifica (lo
 * que pasa hoy con todas). Se valida igual que el backend: entero 20–5000 m.
 */
export function GeofenceField({ defaultValue }: Readonly<{ defaultValue?: number | null }>) {
  return (
    <Field
      hint="Al terminar un entreno en el móvil, la racha se verifica si la persona está dentro de este radio. Déjalo vacío para no verificar."
      htmlFor="branch-geofence"
      label="Radio de verificación de racha (m, opcional)"
    >
      <Input
        defaultValue={defaultValue ?? ''}
        id="branch-geofence"
        inputMode="numeric"
        max={GEOFENCE_MAX_M}
        min={GEOFENCE_MIN_M}
        name="radioGeocercaM"
        placeholder="150"
        step="1"
        type="number"
      />
    </Field>
  );
}

export function readGeofence(values: FormData): { value: number | null; error: string | null } {
  const raw = values.get('radioGeocercaM');
  const text = typeof raw === 'string' ? raw.trim() : '';
  if (!text) return { value: null, error: null };
  const value = Number(text);
  if (!Number.isInteger(value) || value < GEOFENCE_MIN_M || value > GEOFENCE_MAX_M) {
    return {
      value: null,
      error: `El radio debe ser un número entero entre ${GEOFENCE_MIN_M} y ${GEOFENCE_MAX_M} m.`,
    };
  }
  return { value, error: null };
}
