# Paridad en Android

El diseño de la app móvil se decide en esta rama y vale para las dos
plataformas. Este documento recoge dónde Android **no** hace lo mismo que iOS
con el mismo código, qué se hizo al respecto y qué queda sin verificar.

> **Estado: revisión de código, sin ejecución.** Nada de lo de abajo se ha
> visto correr en un Android real ni en un emulador — esta máquina no tiene
> ninguno disponible. Las correcciones salen de diferencias documentadas de
> React Native y del sistema, no de una pantalla observada, y así hay que
> leerlas. Lo que sí está verificado en hardware real es iOS: ver
> [`ios-evidencia.md`](./ios-evidencia.md).

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
