# Defectos hallados en la revisión humana B2 (RF-07..13, resto)

Cada captura se abrió una a una (ver `revisiones-cierre-B2.json`). Gravedad: A alta, M media, B baja. Los defectos D-B1, D-B2, D-B6, D-B9 y D-B12 ya figuran en `DEFECTOS-REVISION-B.md` y aquí solo se citan.

- **D2-1 (M)** La captura no muestra el aviso «rutina publicada». Pasos: iOS, publicar una rutina. Vista: RF-09 p02a iOS oscuro, idéntica a p02. Recapturar con el toast visible.
- **D2-2 (M)** La captura «aparece en Públicas con autor» muestra el detalle de la rutina y no el listado, sin autor visible; además «13 copias» en una rutina recién publicada es dudoso. RF-09 p02b iOS oscuro.
- **D2-3 (M)** Falta el toast «copiada a Mías»: se ve el detalle de la rutina pública con «Copiar a Mías» aún visible. RF-10 p01 iOS oscuro.
- **D2-4 (B)** En «Ver cambios» el nombre del ejercicio añadido sale en inglés (p. ej. «barbell close-grip bench press»). RF-10 p05, web (4 variantes) e iOS.
- **D2-5 (B)** Etiquetas de día truncadas («Senta…», «Peso…», «Acces…») en iOS. Pasos: abrir una rutina con días con nombre largo en iOS. RF-10 p05b y RF-12 p01 iOS oscuro.
- **D2-6 (B)** Ficha de ejercicio incoherente: la etiqueta superior dice «TRICEPS» mientras el músculo objetivo es «pectorals». RF-07 p03/p04/p05 (web e iOS).
- **D2-7 (M)** Captura inválida: el tour «¡Hola!» (1/5) tapa la cabecera y se ve la rutina original «Empuje 4 días» (v2, con copias) en lugar de una rutina hecha desde cero, así que no prueba la ausencia de franja. RF-10 p07 (4 variantes). Recapturar tras cerrar el tour y abrir una rutina creada desde cero.
- **D2-8 (B)** Diseño descuadrado en capturas de página completa a 1440: la barra lateral aparece desplazada hacia abajo con un hueco vacío arriba y el título partido en 3 líneas. Probable artefacto de captura. RF-12 p01 1440, p03 1440 oscuro, p04, p04b, p08; RF-08 p02 1440; RF-13 p08 1440.
- **D2-9 (M)** El comentario denunciado sigue visible con Responder/Reportar y sin estado «oculto»: no se demuestra el ocultado automático tras tres denuncias. RF-12 p08 (4 variantes). Recapturar tras aplicarse el ocultado.
- **D2-10 (B)** Al abrir por URL una invitación pendiente aparece un toast de error «Acceso denegado · No tienes permisos para realizar esta acción.» junto a la tarjeta Aceptar/Rechazar; es un estado normal y el toast alarma. En oscuro el cuerpo es casi ilegible (D-B6). RF-13 p05 (4 variantes).

Reverificadas con imagen abierta las frases de RF-13 p08b y p09b de `revisiones-cierre-B.json`: p08b era correcta; las de p09b se reescriben en B2 (mismo contenido, confirmado) y, al cargarse después, prevalecen.
