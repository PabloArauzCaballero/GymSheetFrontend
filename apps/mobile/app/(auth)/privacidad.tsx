import { LegalDocument, type LegalClause, type LegalEssential } from '@/components/legal-document';

/**
 * Mismo texto legal que `/privacidad` en la web — se enlaza desde el registro,
 * antes de que exista sesión. La maqueta (emblema, «Lo esencial», cláusulas en
 * tarjetas, barra de lectura) vive en `LegalDocument`, compartida con Términos.
 */
const CLAUSES: readonly LegalClause[] = [
  {
    title: 'Qué datos guardamos',
    icon: 'folder-open-outline',
    body:
      'Datos de cuenta, entrenamientos y series registradas, medidas antropométricas, y —solo si las activas— género, ubicación al verificar una racha, fotos de perfil y datos de las funciones sociales.',
  },
  {
    title: 'Para qué los usamos',
    icon: 'stats-chart-outline',
    body:
      'Para mostrarte tu progreso, calcular rachas e insignias, y generar la clasificación de tu gimnasio. No vendemos tus datos a terceros.',
  },
  {
    title: 'Quién los ve',
    icon: 'eye-outline',
    body:
      'La clasificación del gimnasio solo muestra tu nombre e inicial. El personal del gimnasio ve los datos necesarios para tu membresía; no ve tus conversaciones ni tu ubicación exacta.',
  },
  {
    title: 'Tus derechos',
    icon: 'hand-left-outline',
    body:
      'Puedes pedir la eliminación de tu cuenta y de tus datos en cualquier momento contactando al gimnasio donde tienes tu membresía.',
  },
];

/** Lo esencial: cada línea resume una cláusula de abajo, sin añadir nada que no diga. */
const ESSENTIALS: readonly LegalEssential[] = [
  { icon: 'ban-outline', label: 'No vendemos tus datos a terceros.' },
  { icon: 'lock-closed-outline', label: 'El gimnasio no ve tus chats ni tu ubicación exacta.' },
  { icon: 'trash-outline', label: 'Pide borrar tu cuenta cuando quieras.' },
];

export default function PrivacidadScreen() {
  return (
    <LegalDocument
      clauses={CLAUSES}
      essentials={ESSENTIALS}
      icon="shield-checkmark"
      title="Política de privacidad"
      updated="Actualizada el 25 de agosto de 2026"
    />
  );
}
