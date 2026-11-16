/**
 * The community rules (legal document COMMUNITY), as a summary of what
 * moderation acts on today: the report reasons of the backend's moderation
 * catalog. Shared by the web `/normas` page and the mobile screen so both
 * show the same text.
 */

export type CommunityRule = { title: string; text: string };

export const communityRulesCopy = {
  title: 'Normas de la comunidad',
  intro:
    'REPP es para personas adultas que entrenan. Estas normas valen para tu perfil, tus fotos, tus stories, el chat y todo lo que compartes.',
  pendingNote:
    'Esta página resume las normas vigentes. El texto legal completo se publicará aquí mismo con su fecha.',
  enforcementTitle: 'Qué pasa si alguien las incumple',
  enforcement: [
    'Puedes denunciar contenido o perfiles desde el menú de cada uno. Una persona del equipo de moderación lo revisa.',
    'Si varias personas denuncian lo mismo, lo ocultamos mientras se revisa. Si no incumple las normas, vuelve a estar visible.',
    'Según la gravedad, damos un aviso, suspendemos la cuenta unos días o la cerramos. Siempre te decimos el motivo.',
  ],
} as const;

export const communityRules: readonly CommunityRule[] = [
  { title: 'Solo personas adultas', text: 'Tienes que tener 18 años o más. Cerramos las cuentas de menores de edad.' },
  { title: 'Sé tú', text: 'Usa tus datos y tus fotos. No te hagas pasar por otra persona.' },
  { title: 'Respeto', text: 'Nada de acoso, intimidación, amenazas ni ataques a personas por lo que son.' },
  { title: 'Sin contenido sexual', text: 'No publiques desnudos ni contenido sexual.' },
  { title: 'Sin violencia ni drogas', text: 'No publiques contenido violento ni vendas o promociones drogas.' },
  {
    title: 'Entrena seguro',
    text: 'No compartas ejercicios ni consejos que puedan lesionar a alguien, ni información falsa que confunda o haga daño.',
  },
  { title: 'Sin spam', text: 'Nada de publicidad ni mensajes repetidos que nadie pidió.' },
  { title: 'Lo tuyo es tuyo', text: 'No presentes como propio el contenido de otra persona.' },
];
