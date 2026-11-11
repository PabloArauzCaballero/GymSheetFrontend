import { LegalDocument, type LegalClause, type LegalEssential } from '@/components/legal-document';

/**
 * Mismo texto legal que `/terminos` en la web — se enlaza desde el registro,
 * antes de que exista sesión. Antes era un muro de texto gris mientras la
 * política de privacidad ya se leía en tarjetas; ahora las dos comparten
 * `LegalDocument`. El texto de cada cláusula no cambia.
 */
const CLAUSES: readonly LegalClause[] = [
  {
    title: 'Qué es REPP',
    icon: 'barbell-outline',
    body:
      'REPP es una aplicación de registro de entrenamiento, progresión y funciones sociales entre socios de un mismo gimnasio. Al crear una cuenta aceptas estos términos y la política de privacidad.',
  },
  {
    title: 'Tu cuenta',
    icon: 'person-circle-outline',
    body:
      'Eres responsable de la confidencialidad de tu contraseña y de la información que registras. Puedes cerrar tu cuenta en cualquier momento desde el perfil.',
  },
  {
    title: 'Uso aceptable',
    icon: 'hand-left-outline',
    body:
      'No está permitido usar la aplicación para acosar a otros socios, suplantar identidades ni extraer datos de otras cuentas.',
  },
  {
    title: 'Cambios en estos términos',
    icon: 'refresh-outline',
    body:
      'Si el texto cambia de forma relevante, se te pedirá aceptar la nueva versión la próxima vez que inicies sesión.',
  },
  {
    title: 'Contacto',
    icon: 'chatbubble-ellipses-outline',
    body: 'Para dudas sobre estos términos, contacta al gimnasio donde tienes tu membresía.',
  },
];

/** Lo esencial: cada línea resume una cláusula de abajo, sin añadir nada que no diga. */
const ESSENTIALS: readonly LegalEssential[] = [
  { icon: 'key-outline', label: 'Tu contraseña es responsabilidad tuya.' },
  { icon: 'people-outline', label: 'Respeta a los socios: nada de acoso ni suplantación.' },
  { icon: 'notifications-outline', label: 'Si cambian, te pediremos aceptarlos de nuevo.' },
];

export default function TerminosScreen() {
  return (
    <LegalDocument
      clauses={CLAUSES}
      essentials={ESSENTIALS}
      icon="document-text"
      title="Términos y condiciones"
      updated="Actualizados el 25 de agosto de 2026"
    />
  );
}
