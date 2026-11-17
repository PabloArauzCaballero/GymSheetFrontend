import type { CiExtension } from '@gymsheet/schemas';
import type { KycLegalPart } from './business-kyc';

/** Texts of the KYC steps 4–7 (plan §4.1), web and mobile. De tú, short, verb first. */
export const kycCopy = {
  phone: {
    label: 'Tu celular',
    placeholder: '7XXXXXXX',
    hint: 'Celular de Bolivia, con WhatsApp. El +591 ya va puesto.',
    send: 'Enviarme el código',
    codeLabel: 'Código de 6 dígitos',
    codeSent: (masked: string) => `Te enviamos un código por WhatsApp al ${masked}.`,
    confirm: 'Confirmar código',
    resend: 'Enviar otro código',
    changeNumber: 'Cambiar número',
    noProvider: 'Verificaremos tu número',
    noProviderBody: (masked: string) =>
      `Guardamos el ${masked}. Por ahora lo confirma una persona de REPP cuando revise tu negocio. Puedes seguir.`,
    verified: (masked: string) => `${masked} · verificado`,
    saved: (masked: string) => `${masked} · sin verificar`,
    retryAt: (clock: string) => `Puedes pedir otro código en ${clock}.`,
  },
  legal: {
    parts: {
      business: { title: 'Tu negocio', description: 'Cambiar el nombre o la categoría lo revisa REPP.' },
      company: { title: 'Tu empresa', description: 'Como figura en el NIT.' },
      representative: { title: 'Representante legal', description: 'Quien firma por la empresa.' },
      person: { title: 'Tus datos', description: 'Como figuran en tu carnet.' },
    } satisfies Record<KycLegalPart, { title: string; description: string }>,
    tradeName: 'Nombre comercial',
    legalName: 'Razón social',
    legalNamePlaceholder: 'Top Fitness S.R.L.',
    nit: 'NIT',
    nitPlaceholder: 'Solo números',
    address: 'Dirección',
    addressPlaceholder: 'Av. Banzer 123, Santa Cruz',
    seprec: 'Matrícula SEPREC (opcional)',
    repFullName: 'Nombre completo',
    personFullName: 'Tu nombre completo',
    ciLegend: 'Carnet de identidad',
    ciNumber: 'Número de carnet',
    ciComplement: 'Complemento',
    ciComplementHint: 'Solo si tu carnet lo tiene (2 caracteres).',
    ciExtension: 'Expedido en',
    specialty: 'Tu especialidad',
    specialtyPlaceholder: 'Entrenamiento funcional',
    savedSecret: (masked: string) => `Guardado: ${masked}. Escríbelo solo si quieres cambiarlo.`,
    saving: 'Guardando…',
    saved: 'Guardado',
  },
  documents: {
    take: 'Tomar foto',
    choose: 'Subir foto',
    gallery: 'Elegir de la galería',
    retake: 'Tomar otra',
    remove: 'Quitar',
    uploading: 'Subiendo…',
    missing: 'Falta',
    optional: 'Opcional',
    logoReady: 'Logo listo',
    consentTitle: 'Antes de tu selfie',
    consentBody:
      'Una persona de REPP compara tu selfie con la foto de tu carnet para verificar tu negocio. Borramos la selfie 30 días después de decidir.',
    consentAccept: 'Aceptar y continuar',
    gestureAsk: 'Pedir mi gesto',
    gestureTitle: 'Tu gesto',
    gestureLeft: (clock: string) => `Te quedan ${clock}`,
    gestureExpired: 'El gesto venció. Pide otro.',
    heic: 'Usa JPG o PNG.',
    unreadableNote: 'Puedes seguir, pero una foto que no se lee manda tu negocio a revisión manual.',
    needAll: 'Sube las fotos marcadas como «Falta» para seguir.',
    frameGuide: 'Encuadra el carnet dentro del marco',
  },
  review: {
    edit: 'Editar',
    sections: { business: 'Tu negocio', phone: 'Tu teléfono', legal: 'Datos legales', documents: 'Documentos' },
    phoneMissing: 'Sin teléfono',
    documentsSummary: (ok: number, total: number) => `${ok} de ${total} fotos listas`,
    unreadable: (count: number) => (count === 1 ? 'Una foto no se lee bien.' : `${count} fotos no se leen bien.`),
    fixFirst: 'Corrígela antes de enviar y tu negocio puede publicarse en segundos.',
    submit: 'Enviar a verificación',
    submitting: 'Verificando…',
    terms: 'Al enviar confirmas que los datos son ciertos y que puedes representar a este negocio.',
  },
  continue: 'Seguir',
  back: 'Atrás',
} as const;

export const ciExtensionLabels: Readonly<Record<CiExtension, string>> = {
  LP: 'La Paz',
  CB: 'Cochabamba',
  SC: 'Santa Cruz',
  OR: 'Oruro',
  PT: 'Potosí',
  TJ: 'Tarija',
  CH: 'Chuquisaca',
  BE: 'Beni',
  PD: 'Pando',
};

/** «Paso N de 8» sub-progress inside «Datos legales»: «Tu empresa · 1 de 2». */
export function legalPartProgress(part: KycLegalPart, parts: readonly KycLegalPart[]): string {
  const title = kycCopy.legal.parts[part].title;
  return parts.length > 1 ? `${title} · ${parts.indexOf(part) + 1} de ${parts.length}` : title;
}
