# Evidencia del portal web

Capturas del portal de administración, tomadas contra el backend y la base de
datos reales. No son maquetas: la sesión de administrador se inyecta por el
protocolo de DevTools de Chrome —Chrome cifra las cookies con el llavero de
macOS, así que sembrarlas en el perfil no funciona— y la página se fotografía
después de que sus datos lleguen por red.

| Captura | Qué demuestra |
| --- | --- |
| `01-operacion.png` | Panel del gimnasio con datos reales: uso por máquina —agrupado por ejercicio mientras no haya máquinas registradas—, flujo diario de app frente a entradas físicas, y la lista de quien no ha renovado, con «vencida hace N días» y «nunca tuvo membresía». |
| `02-activacion.png` | La pantalla que abre el administrador desde el enlace que el cliente envía por WhatsApp: quién lo pidió, su nota, cuándo caduca el enlace y el selector de plan. |
| `03-enlace-sin-sesion.png` | El mismo enlace abierto sin sesión: el portal pide iniciarla y conserva el destino en `returnTo`. Es la protección que hace que reenviar el enlace a un grupo no sirva de nada. |

## Lo que no está capturado, y por qué

El recorrido de activación **completo** —pulsar «Activar cuenta» y ver la
confirmación— se verificó contra la API con `curl`, no en pantalla: 401 sin
sesión, 403 con sesión de cliente, 200 con administrador, membresía vigente
después, y 400 al reintentar el mismo enlace. Automatizar el clic exigía
conducir un navegador con sesión, que es justo lo que el protocolo de DevTools
permite mirar pero no vale la pena orquestar para un botón.
