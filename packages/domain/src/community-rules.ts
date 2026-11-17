/**
 * Summary of the community rules (legal document COMMUNITY): six rules and
 * what happens when someone breaks them. The full text is the one that counts.
 * Shared by the web `/normas` page and the mobile screen so both show the same text.
 */

export type CommunityRule = { title: string; text: string };

export const communityRulesCopy = {
  title: 'Normas de la comunidad',
  intro:
    'REPP es para personas adultas que entrenan. Estas normas valen en todo REPP: tu perfil, tus fotos, tus historias, los reels, los comentarios, el chat y el mapa.',
  summaryNote: 'Esto es un resumen. Lo que vale es el texto completo de las normas de la comunidad.',
  enforcementTitle: 'Qué pasa si alguien las incumple',
  enforcement: [
    'Denuncia desde el menú de un perfil, un reel, un comentario, una rutina, un ejercicio o un mensaje. Moderación lo revisa. No le decimos a la otra persona quién la denunció, pero puede notar que el chat se cerró.',
    'Si tres personas distintas denuncian lo mismo, lo ocultamos mientras se revisa. Las sanciones siguen una escalera fija: aviso; suspensión de 1, 3, 7 y 30 días; y expulsión. Si te sancionamos u ocultamos tu contenido, te decimos el motivo.',
  ],
} as const;

export const communityRules: readonly CommunityRule[] = [
  {
    title: 'Solo personas adultas',
    text: 'Tienes que tener 18 años o más. Si confirmamos que una cuenta es de un menor, la cerramos y borramos sus datos.',
  },
  { title: 'Sé tú', text: 'Usa tus fotos y tus datos. No te hagas pasar por nadie y no copies datos de otras personas.' },
  {
    title: 'Respeto',
    text: 'Nada de acoso, amenazas ni violencia. Nadie ataca a otra persona por su sexo, orientación, identidad de género, origen, religión, discapacidad o cuerpo.',
  },
  {
    title: 'Consentimiento',
    text: 'No publiques desnudos ni contenido sexual. En el chat, no envíes nada sexual a quien no lo pidió. Nunca compartas imágenes íntimas de otra persona.',
  },
  {
    title: 'Sin dinero, drogas ni spam',
    text: 'No pidas dinero ni datos bancarios, no vendas drogas ni dopaje, no envíes publicidad repetida y no uses bots.',
  },
  {
    title: 'Entrena seguro y con lo tuyo',
    text: 'No compartas ejercicios que lastimen ni información falsa. No presentes como tuyo lo de otra persona.',
  },
];
