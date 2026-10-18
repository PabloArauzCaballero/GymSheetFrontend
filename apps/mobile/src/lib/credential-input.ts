/**
 * Props de teclado para los campos que guardan una credencial.
 *
 * Una contraseña tiene que llegar al servidor **exactamente** como se tecleó.
 * `TextInput` arranca con `autoCapitalize="sentences"` y con el autocorrector
 * encendido, y iOS sólo los apaga solo mientras el campo está en modo seguro.
 * Al pulsar el ojo el campo deja de serlo y el teclado vuelve a capitalizar la
 * primera letra y a «corregir» palabras: quien revelaba la contraseña en el
 * alta para ver lo que escribía quedaba registrada con `Prueba1234` creyendo
 * haber puesto `prueba1234`. La confirmación pasaba —también estaba revelada y
 * recibía la misma mayúscula—, el alta entraba, y al cerrar sesión el acceso,
 * con el campo oculto y sin mayúscula automática, respondía «credenciales
 * inválidas» a la misma persona con la misma contraseña.
 */
export const credentialTextProps = {
  autoCapitalize: 'none',
  autoCorrect: false,
  spellCheck: false,
} as const;

/**
 * Lo mismo para el correo, más `textContentType="username"`: es la marca que
 * iOS usa para emparejar el correo con la contraseña guardada en el Llavero.
 * Con `emailAddress` el sistema guardaba la contraseña sin saber de qué cuenta
 * era y al volver a entrar no sabía qué correo proponer. `autoComplete` sigue
 * diciendo `email` para Android, que no lee `textContentType`.
 */
export const accountEmailTextProps = {
  ...credentialTextProps,
  autoComplete: 'email',
  keyboardType: 'email-address',
  textContentType: 'username',
} as const;
