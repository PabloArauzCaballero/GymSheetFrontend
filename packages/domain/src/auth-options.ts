import type { UserGender } from '@gymsheet/types';

/**
 * Copy y opciones de las pantallas de sesión, compartidas por web y móvil.
 *
 * Existe por la misma razón que `onboarding-options`: las dos plataformas hacen
 * las mismas preguntas y deben hacerlas con las mismas palabras. Cuando cada
 * una tenía su texto, la web recibía a la gente con «Vuelve al trabajo.» y el
 * móvil con «Inicia sesión para continuar» — dos productos distintos para la
 * misma cuenta.
 */

/**
 * Opciones del selector de género.
 *
 * `''` es «prefiero no decirlo» y no se envía al servidor. `UNSPECIFIED` no
 * aparece como opción visible a propósito: es lo que el backend guarda cuando
 * alguien decide no responder, no algo que se elija por su nombre.
 */
export const genderOptions: ReadonlyArray<{ value: UserGender | ''; label: string }> = [
  { value: '', label: 'Prefiero no decirlo' },
  { value: 'MALE', label: 'Hombre' },
  { value: 'FEMALE', label: 'Mujer' },
];

/** Textos de las dos pantallas. Un solo sitio para las dos plataformas. */
export const authCopy = {
  login: {
    eyebrow: 'Acceso seguro',
    title: 'Vuelve al trabajo.',
    description: 'Accede a tu entrenamiento, historial y operaciones según tu rol.',
    submit: 'Iniciar sesión',
    forgotPassword: '¿Olvidaste tu contraseña?',
    switchPrompt: '¿Aún no tienes cuenta?',
    switchAction: 'Regístrate',
  },
  register: {
    eyebrow: 'Nuevo atleta',
    title: 'Construye tu registro.',
    description: 'Crea una cuenta para empezar a documentar cada sesión con datos consistentes.',
    submit: 'Crear cuenta',
    switchPrompt: '¿Ya tienes cuenta?',
    switchAction: 'Inicia sesión',
  },
  fields: {
    fullName: { label: 'Nombre completo', placeholder: 'Nombre y apellido' },
    email: { label: 'Correo electrónico', placeholder: 'tu@correo.com' },
    password: { label: 'Contraseña', placeholder: 'Mínimo 8 caracteres' },
    confirmation: { label: 'Confirmar contraseña', placeholder: 'Repite la contraseña' },
    gender: {
      label: 'Género (opcional)',
      hint: 'Solo se usa para elegir los rangos e insignias con los que te habla la app. Puedes cambiarlo o dejarlo en blanco.',
    },
  },
  showPassword: 'Mostrar contraseña',
  hidePassword: 'Ocultar contraseña',
  terms: {
    prefix: 'Acepto los',
    termsLabel: 'términos y condiciones',
    connector: 'y la',
    privacyLabel: 'política de privacidad',
    /**
     * La misma frase sin enlaces dentro. La web la compone en piezas porque
     * puede incrustar dos enlaces en mitad del texto; el móvil no —una casilla
     * de React Native lleva una etiqueta de texto plano— y ahí los documentos
     * se abren desde dos enlaces aparte, bajo la casilla.
     */
    plain: 'Acepto los términos y condiciones y la política de privacidad',
    readTerms: 'Leer términos',
    readPrivacy: 'Leer privacidad',
  },
} as const;

/**
 * Mensajes de error de sesión.
 *
 * `invalidCredentials` está aquí porque las dos plataformas tenían que
 * reescribir el 401: el texto genérico de sesión caducada («Tu sesión ha
 * expirado») es falso cuando lo que ha ocurrido es que la contraseña está mal,
 * y nadie que acaba de escribirla entiende que le digan que expiró.
 */
export const authErrors = {
  invalidCredentials: 'Correo o contraseña incorrectos.',
  loginFailed: 'No se pudo iniciar sesión.',
  registerFailed: 'No se pudo crear la cuenta.',
  emailTaken: 'Ya existe una cuenta con ese correo.',
} as const;

/**
 * A dónde va cada plataforma cuando la sesión queda establecida.
 *
 * Las rutas no coinciden literalmente —la web usa `/dashboard` y el móvil
 * `/home` para la misma pantalla— pero **la intención sí** debe coincidir, y es
 * lo que se declara aquí: tras un alta se va a completar el onboarding, tras un
 * acceso se va al inicio. Antes la web mandaba al panel y dejaba que un guardia
 * la rebotara al onboarding, de modo que la cuenta recién creada veía un panel
 * a medio pintar antes del cuestionario que el móvil abría directamente.
 */
export const authDestination = {
  web: { afterLogin: '/dashboard', afterRegister: '/onboarding' },
  mobile: { afterLogin: '/home', afterRegister: '/onboarding' },
} as const;

/**
 * Traduce el fallo de una petición de sesión al texto que ve la persona.
 *
 * Las dos plataformas hacían esta traducción por su cuenta y no coincidían: el
 * móvil interceptaba el 401 con su propio texto y dejaba el resto al motor de
 * avisos, mientras la web mostraba el `detail` del servidor tal cual. Para el
 * mismo fallo y la misma cuenta salían dos mensajes distintos.
 *
 * `kind` es la clasificación de `ApiError` (`@gymsheet/api-client`), pasada como
 * cadena para que este paquete no dependa del cliente HTTP.
 */
export function authErrorMessage(
  kind: string | undefined,
  context: 'login' | 'register',
  serverMessage?: string,
): string {
  if (context === 'login' && kind === 'unauthorized') return authErrors.invalidCredentials;
  if (context === 'register' && kind === 'conflict') return authErrors.emailTaken;
  // El texto del servidor manda cuando existe y es específico: un 400 de
  // validación sabe qué campo falla mejor que cualquier texto fijo de aquí.
  if (serverMessage && serverMessage.trim() !== '') return serverMessage;
  return context === 'login' ? authErrors.loginFailed : authErrors.registerFailed;
}
