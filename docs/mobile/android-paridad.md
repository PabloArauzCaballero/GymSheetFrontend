# Paridad en Android

El diseño de la app móvil se decide en esta rama y vale para las dos
plataformas. Este documento recoge dónde Android **no** hace lo mismo que iOS
con el mismo código, qué se hizo al respecto y qué queda sin verificar.

> **Estado: ejecutado en emulador (11 sep 2026).** Lo de abajo se escribió como
> revisión de código, sin ejecución, porque no había ningún Android disponible.
> Ya lo hay: Pixel 10 Pro con Android 17, JDK 17 (el Gradle de RN 0.79 no
> compila con el 26 que trae la máquina), `BUILD SUCCESSFUL`, app instalada y
> recorrida con datos reales del backend. Lo que esa pasada confirmó y lo que
> corrigió está al final, en «Lo que se vio al ejecutarlo por fin».

## Lo que se corrigió

### El tutorial atrapaba al usuario

El `Modal` del tour se escribió sin `onRequestClose`. En Android eso significa
que el botón físico de atrás no hace nada: la única salida es el botón de la
propia tarjeta, y un tutorial a pantalla completa sin salida es indistinguible
de una app colgada. Los otros dos modales del proyecto —el selector de
ejercicios y el diálogo de confirmación— ya lo llevaban; éste se quedó fuera.

### El foco del tour caía desplazado

En Android un `Modal` es una ventana aparte y, por omisión, empieza **debajo**
de la barra de estado. Los anclajes del tour se miden con `measureInWindow`,
que devuelve coordenadas de la ventana de la app, así que el recorte iluminado
se habría dibujado desplazado exactamente esa altura — señalando el hueco entre
dos tarjetas en vez de la tarjeta. `statusBarTranslucent` hace que ambos
espacios de coordenadas coincidan.

### La jerarquía tipográfica desaparecía

Android no sintetiza pesos intermedios. Hasta API 28 la familia Roboto del
sistema no incluye SemiBold, y React Native no interpola: un
`fontWeight: '600'` cae a normal, sin aviso. No es un matiz — toda la jerarquía
de esta app descansa en tamaño y peso en lugar de en color, precisamente para
no depender del acento, así que en esos teléfonos las pantallas se leen planas.

La app tenía 39 sitios con ese peso. Ahora todos usan `semibold` del tema, que
resuelve a `'700'` en Android por debajo de API 28 y a `'600'` exacto en el
resto. Es más pesado de lo pretendido en esos dispositivos, y esa es la
concesión consciente: visible y algo tosco es mejor que invisible.

### El cronómetro de descanso bailaba

`fontVariant: ['tabular-nums']` sólo lo entiende iOS; en Android se ignora en
silencio y Roboto compone el «1» más estrecho que las demás cifras, de modo que
un número que cambia cada segundo empuja lo que tiene al lado. Se le reservó
una anchura mínima, que fija el sitio del peor caso en las dos plataformas.

## Lo que ya estaba bien

- **Barra de estado**: `ScrollScreen` toma `Math.max(insets.top,
  StatusBar.currentHeight)`, porque el inset de área segura de Android a veces
  devuelve menos que la barra realmente dibujada.
- **Teclado**: `KeyboardAvoidingView` sólo aplica `behavior` en iOS; Android
  redimensiona la ventana él mismo con `adjustResize`, y forzarlo haría saltar
  el diseño dos veces por un mismo teclado.
- **Teclado numérico**: la barra «Listo» es una necesidad de iOS —sus teclados
  numéricos no traen tecla de retorno—. En Android las tres props son inertes y
  el teclado se cierra con el botón atrás del sistema.
- **Elevación**: el único elemento que necesita separarse del fondo por sombra
  —el toast— declara `elevation` además de las props de sombra de iOS.
- **Compartir y descargar**: `export-progress` ya bifurca por plataforma.


## Repaso de lo añadido después (pago en efectivo, panel, casilla)

Segunda pasada, con el mismo alcance que la primera: revisión de código, sin
ejecutar.

### Corregido

**El botón de «Ya pagué por otro medio» podía parecer roto.** Abría WhatsApp
con `Linking.openURL` sin comprobar antes que el enlace se pudiera resolver,
mientras que el resto de la aplicación sí lo hace. En Android, un teléfono sin
WhatsApp ni navegador capaz de abrir `wa.me` deja ese `openURL` fallando en
silencio, y el botón se queda mudo justo en el momento en que la persona más
necesita que responda. Ahora se comprueba primero y, si no se puede, se le dice
qué hacer —la solicitud ya quedó registrada del lado del servidor, así que no
se pierde nada—.

### Revisado y correcto

- **La casilla de contraseña** usa `Pressable` con `hitSlop` numérico y
  Reanimated, todo con soporte en ambas plataformas. Los colores se leen fuera
  del *worklet*, que además de ser lo correcto para el tema es lo que evita que
  Reanimated congele el objeto.
- **La tarjeta de membresía no vigente** no usa nada específico de iOS: iconos,
  texto y botones del sistema de diseño compartido.
- **El enlace de activación** viaja como `https://`, que en Android abre
  WhatsApp o el navegador sin necesidad de declarar `<queries>` en el
  manifiesto; eso sólo haría falta con un esquema propio.

### Pendiente de comprobar en un dispositivo

1. Que WhatsApp reciba el mensaje con los saltos de línea intactos: la
   codificación del texto en la URL es la misma, pero quien la interpreta es la
   aplicación instalada.
2. Que el enlace abierto desde WhatsApp en Android caiga en el navegador con la
   sesión del portal, que es donde el administrador ya la tiene.

## Lo que queda pendiente de comprobar en un dispositivo

Por orden de riesgo:

1. **El recorte del foco del tour.** La corrección de `statusBarTranslucent` es
   la correcta en teoría, pero la aritmética de coordenadas entre ventanas es
   justo el tipo de cosa que hay que ver para creerla. En iOS costó dos
   iteraciones y sólo se detectó mirando la pantalla.
2. **El desplazamiento automático del tour.** Depende de `measureInWindow` y de
   los tiempos de asentamiento del scroll, que no son los mismos.
3. **Los pesos por debajo de API 28.** El umbral está tomado de la
   documentación; conviene confirmarlo en un emulador de API 24 y otro de 28.
4. **El realimentado táctil.** `PressableScale` responde con escala y opacidad,
   no con el *ripple* que un usuario de Android espera. Es una decisión de
   diseño deliberada —un lenguaje de pulsación propio y consistente entre
   plataformas—, no un olvido, pero merece verse en mano antes de darla por
   buena.

Para verificarlo hace falta un emulador Android o un teléfono con depuración
USB. Maestro sí soporta emuladores Android, así que los flujos de
`.maestro/` sirven tal cual: `maestro test .maestro/` con el emulador
arrancado y el backend accesible en la IP de LAN.


## Lo que se vio al ejecutarlo por fin

Primera ejecución real en un emulador (Pixel 10 Pro · Android 17), con el
backend NestJS y PostgreSQL en marcha y el atleta de la semilla con datos.

### El riesgo nº 1 de la lista de pendientes: confirmado bueno

«El recorte del foco del tour» encabezaba la lista de abajo, con el aviso de que
«la aritmética de coordenadas entre ventanas es justo el tipo de cosa que hay
que ver para creerla». Se vio: el recorte iluminado cae **sobre la fila que
señala**, no desplazado la altura de la barra de estado. La corrección de
`statusBarTranslucent` era la correcta, y ahora está comprobada en pantalla y no
sólo en la documentación de React Native.

### Lo demás que se comprobó en ejecución

- **Tema oscuro y edge-to-edge.** El proyecto generado trae
  `AppTheme parent="Theme.EdgeToEdge"` y
  `expo_system_ui_user_interface_style = dark`; en pantalla, el contenido llega
  hasta los bordes y los insets respetan barra de estado y barra de gestos.
- **Jerarquía tipográfica.** Los pesos se leen: en Android 17 (API muy por
  encima de 28) `semibold` resuelve a 600 exacto, que es lo pretendido. El
  umbral de API 28 sigue **sin comprobar** — haría falta un emulador de API 24.
- **Estado de foco de los campos.** El borde claro del campo activo se ve
  igual que en iOS.

### Lo que la ejecución destapó

- **`localhost` no es el anfitrión.** El emulador corre en su propia máquina
  virtual, donde `localhost` es él mismo; al anfitrión se le ve en `10.0.2.2`.
  El `.env.example` lo explicaba en un párrafo y obligaba a editar el fichero
  —y reiniciar Metro— en cada cambio de plataforma, lo que además impide tener
  las dos abiertas contra el mismo Metro, que es justo lo que se hace al
  comprobar paridad. Ahora lo traduce `src/config/env.ts` según la plataforma.
  Una IP de LAN o un host de staging pasan intactos.
- **La barra no cabía a seis.** Con Comunidad en la barra, «Comunidad» se
  truncaba a «Comuni…» en iPhone. Entrenos bajó al stack y la barra vuelve a
  cinco; en Android, con más ancho por pestaña, las cinco etiquetas entran
  holgadas. Ver el comentario en `(tabs)/_layout.tsx` para las dos salidas
  técnicas que se probaron y por qué ninguna servía.
