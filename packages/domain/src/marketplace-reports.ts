/**
 * «⋯ Reportar» on a public business profile or listing (franja 8c, backend
 * ADR-0022): the reasons that make sense for a business, out of the closed
 * moderation taxonomy (`ModerationReason`), and what happens after sending.
 */
export const businessReportTargetKinds = ['BUSINESS_LISTING', 'BUSINESS_PROFILE'] as const;
export type BusinessReportTargetKind = (typeof businessReportTargetKinds)[number];

export const businessReportReasons = [
  'SPAM',
  'INFORMACION_ENGANOSA',
  'PERFIL_FALSO',
  'DROGAS',
  'CONTENIDO_SEXUAL',
  'OTRO',
] as const;
export type BusinessReportReason = (typeof businessReportReasons)[number];

export const businessReportReasonLabels: Readonly<Record<BusinessReportReason, string>> = {
  SPAM: 'Estafa o spam',
  INFORMACION_ENGANOSA: 'Precio o datos engañosos',
  PERFIL_FALSO: 'Se hace pasar por otro negocio',
  DROGAS: 'Vende sustancias prohibidas',
  CONTENIDO_SEXUAL: 'Contenido sexual',
  OTRO: 'Otro motivo',
};

export const businessReportCopy = {
  action: 'Reportar',
  listingTitle: 'Reportar publicación',
  profileTitle: 'Reportar negocio',
  consequence: 'El equipo de REPP lo revisa. Nadie sabrá que fuiste tú.',
  sent: 'Gracias por avisar. REPP lo revisará.',
  hidden: 'Gracias por avisar. La retiramos mientras REPP la revisa.',
  signIn: 'Inicia sesión para reportar',
} as const;
