# Evidencia — iOS Simulator

Capturas tomadas por los flujos de Maestro contra el simulador real, con el
backend NestJS y PostgreSQL en marcha. Los PNG están en
[`apps/mobile/ios-evidence/`](../../apps/mobile/ios-evidence/).

Para reproducirlo: `apps/mobile/scripts/run-ios-evidence.sh` (requisitos en
[`ios-paridad.md`](./ios-paridad.md)).

| | |
| --- | --- |
| Dispositivo | iPhone 17 Pro · iOS 26.5 |
| App | `app.gymsheet.mobile`, build Debug compilada desde fuente |
| Backend | `http://192.168.80.17:3011/api/v1` — la IP de LAN del Mac, no `localhost`, rama `fix/membership-seed-and-lock` |
| Usuario | `athlete.mock@gymsheet.local`, **con membresía activa y datos** (ver `scripts/seed-demo-data.mjs`) |

## 01 · Sesión — arranque y login

| Captura | Qué demuestra |
| --- | --- |
| `01-login.png` | Arranque en frío. Fondo ambiental (la onda), botón volt, tema oscuro y el status bar en contenido claro sobre negro. |
| `02-login-relleno.png` | Credenciales escritas. El campo de contraseña enmascara, y el formulario no se desplaza bajo el teclado. |
| `03-tour-bienvenida.png` | El tour de bienvenida, presentado como `Modal` nativo sobre Inicio. |
| `04-inicio.png` | Inicio con datos reales: membresía «Pro Mensual · Activa», vencimiento y días restantes calculados, la fila de actividad con las sesiones del usuario, la rutina asignada por su entrenador y las últimas sesiones con su estado. |

## 02 · Navegación — las cinco pestañas

| Captura | Qué demuestra |
| --- | --- |
| `05-rutinas.png` | Rutinas: la semana con sus días marcados y los de descanso, «Hoy · Tirón - Día 2», y las asignadas por el entrenador con su nota («Sube 2,5 kg en banca cuand…»). |
| `06-ejercicios.png` | Ejercicios: buscador y la rejilla por grupo muscular con el catálogo cargado. |
| `07-entrenos.png` | Entrenos: el historial con sus sesiones finalizadas, número de ejercicios y estado. |
| `08-perfil.png` | Perfil: identidad (avatar, nombre, correo, rol «Cliente»), datos físicos y membresía. |
| `09-inicio-vuelta.png` | Vuelta a Inicio desde la última pestaña: la barra conserva el estado y la sección se vuelve a montar. |

## 03 · Teclado numérico — la corrección específica de iOS

Es la prueba que justifica el cambio: en iOS `number-pad` y `decimal-pad` no
traen tecla de retorno y no hay botón atrás del sistema, así que sin la barra
accesoria el teclado no se puede cerrar.

| Captura | Qué demuestra |
| --- | --- |
| `10-editar-datos.png` | «Completar perfil», el formulario por pasos, antes de tocar el campo. |
| `11-teclado-numerico-con-listo.png` | Teclado numérico abierto **con la barra «Listo» del sistema encima**. Nótese lo que hay debajo: el teclado tapa «Continuar». Sin esa barra, en iOS no hay forma de cerrarlo y la pantalla es un callejón sin salida. |
| `12-teclado-cerrado.png` | Tras pulsar «Listo»: teclado cerrado y «Continuar» de nuevo alcanzable. Éste es el par de capturas que justifica el cambio. |

## 04 · Ajustes y cierre de sesión

| Captura | Qué demuestra |
| --- | --- |
| `13-ajustes.png` | Ajustes: correo, dónde vive la sesión («Guardada en el llavero del dispositivo» — el Keychain), versión y entorno. |
| `14-confirmacion-cerrar-sesion.png` | El diálogo de confirmación sobre un `Modal` nativo, con la salida segura («Volver») a la izquierda. Tras pulsarla el flujo comprueba que se vuelve a Ajustes. |

## Condiciones de la ejecución

Esta máquina corre en paralelo el Docker de otro proyecto (más de 30
contenedores, >120 % de CPU sostenida), VS Code y el simulador. Con
`load average` por encima de 20 cada acción de Maestro tarda, y la primera
petición tras un rato de silencio llega a agotar los 15 s de espera del cliente
API — momento en el que **la app se rinde sola** y muestra «Sin conexión».
Alargar los tiempos de Maestro no arregla eso, porque quien abandonó fue la app.

De ahí las tres concesiones, que están en el código y **no** ocultan defectos:

- el envío del login va dentro de un `retry` que relanza la app, en el flujo 01
  y en el subflujo de sesión;
- tras entrar se pulsa el «Reintentar» de la propia tarjeta si aparece, que es
  lo que haría una persona ante «Sin conexión»;
- `run-ios-evidence.sh` calienta la API antes de cada flujo y reintenta cada
  flujo una vez, porque el primero de una tanda suele morir mientras Maestro
  reinstala su driver XCUITest.

Con la API caliente el login responde por debajo del segundo, y con la carga
por debajo de 25 los cuatro flujos pasan seguidos.


## 05 · Contraseña: revelarla y recuperarla

Las cuatro últimas no salen de los flujos automatizados sino de un recorrido
dirigido sobre el mismo simulador y el mismo backend. Se documentan aparte para
no confundir lo que la suite garantiza en cada ejecución con lo que se comprobó
una vez.

| Captura | Qué demuestra |
| --- | --- |
| `15-login-contrasena-oculta.png` | Login con la contraseña escrita y enmascarada, y la casilla sin marcar. Arranca así siempre, aunque la última vez se dejara visible. |
| `16-login-contrasena-visible.png` | La misma pantalla con la casilla marcada: cuadrado relleno en el acento de la marca, su palomita, y la contraseña en texto legible. |
| `17-recuperar-paso-1.png` | Recuperación, paso uno. El indicador de dos pasos y un único campo: a quien ha olvidado su contraseña no se le piden más datos. |
| `18-recuperar-paso-2.png` | Paso dos, ya con el correo enviado. Código, contraseña nueva con su casilla para revelarla, y la salida a pedir otro código. Ambos pasos viven en la misma pantalla, porque quien recibe el código vuelve a la app con seis cifras en la cabeza. |

El envío es real: el mensaje sale por el puerto de mensajería del backend y
queda registrado en `notifications.messages` como canal `EMAIL` en estado
`SENT`, con su intento de entrega en `delivery_attempts`.

## La IP de LAN caduca — comprobarla antes de cada tanda

`EXPO_PUBLIC_API_URL` lleva la IP de LAN del Mac escrita a mano. Al cambiar de
red esa IP cambia y el fichero se queda apuntando a una dirección muerta; la
app entonces falla el login con `{"severity":"error","code":"network"}`, y como
el cliente lo registra con `console.error`, en Debug se abre el redbox de Expo
encima de todo y los flujos mueren sin explicar por qué. Se parece a un fallo
de la app y no lo es.

Comprobación antes de levantar nada:

```bash
ipconfig getifaddr en0 || for i in en1 en2 en3 en4 en5; do ipconfig getifaddr $i; done
grep EXPO_PUBLIC_API_URL apps/mobile/.env
```

Si no coinciden, corregir el `.env` y **relanzar Metro con `--clear`**: las
variables `EXPO_PUBLIC_*` se incrustan al empaquetar, así que recargar la app
no basta.

## Sobre el iPhone físico

**Maestro no soporta dispositivos iOS físicos** — su propia ayuda lo dice: *«on
a local iOS Simulator or Android Emulator»*. El teléfono sirve para mirar y
juzgar el diseño en hardware real; la evidencia documentada sale del simulador.
No son alternativas.

Para instalar en un iPhone hace falta además una cuenta de Apple en Xcode
(Ajustes → Cuentas); sin ella `security find-identity -p codesigning` devuelve
cero identidades y no hay nada que firmar. Y la app debe apuntar a la IP de LAN del Mac, no a `localhost`, que es lo que
ya hay en `apps/mobile/.env`.
