# Defectos hallazgo de la revisión visual A (RF-01..06, B1)

## A-01 (baja) Autoría REPP cortada en la tarjeta móvil
- Captura: RF-01/movil/RF-01_p05_pestana-repp_ios_oscuro.png
- Reproducir: app iOS > Rutinas > pestaña REPP; en la tarjeta «Full body REPP …» la línea de autoría dice «Recomendada por RE...», truncada con elipsis en mitad de la palabra por la columna «Sin valoraciones».
- Gravedad: baja (texto cortado, el contenido sigue entendiéndose por el sello REPP).

## A-02 (media) Toast de error con texto secundario casi ilegible en oscuro 390
- Captura: RF-01/web/RF-01_p09_error-500_390_oscuro.png (en 390 claro y 1440 claro el mismo toast se lee bien).
- Reproducir: web, tema oscuro, ancho 390, Rutinas > pestaña «Recomendadas por REPP», forzar fallo 500 en la lista; aparece el toast «Algo salió mal»; su descripción «Ocurrió un error inesperado. Inténtalo más tarde.» tiene color muy cercano al fondo (~#25 sobre #0d en la muestra).
- Gravedad: media (contraste insuficiente WCAG en el mensaje de error). Posible que sea fotograma de fundido; repetir captura tras 1 s para descartarlo.

## A-03 (media) Nombres de ejercicio y músculos en inglés en la app móvil (mezcla de idiomas)
- Capturas: RF-02/movil/RF-02_p03_s2-martes-hoja-del-dia_ios_oscuro.png y RF-02_p04_ficha-del-ejercicio_ios_oscuro.png
- Reproducir: iOS > Rutinas > «Empuje 4 días» > Mes > tocar S2 martes; la hoja lista «barbell bent over row» y «dumbbell biceps curl» con «biceps»/«forearms». Abrir un ejercicio: ficha con «Músculo objetivo upper back», «Parte corporal back», chip «back».
- Además el músculo mostrado para el remo con barra es «biceps» (dato de catálogo dudoso).
- Gravedad: media (interfaz en español con contenido de catálogo sin traducir; afecta a todas las pantallas que muestren ejercicios).

## A-04 (media) Ficha web del ejercicio: mezcla de idiomas y chips con identificadores internos
- Capturas: RF-02/web/RF-02_p04_ficha-del-ejercicio_{390,1440}_{claro,oscuro}.png (y las hojas del día RF-02_p01/p03 con nombres «barbell …»).
- Reproducir: web > Rutinas > rutina > pulsar un ejercicio de la hoja del día. Se ve «barbell deadlift», «HAMSTRINGS», «Músculo objetivo glutes», «Parte corporal upper legs», «Sinergista hamstrings» (inglés) y los chips «GLOBAL» y «EXERCISES_DATASET» (código interno) a la vez que «Isquiotibiales/Glúteo mayor» en español.
- Gravedad: media (mezcla de idiomas y texto técnico crudo; mismo origen que A-03: catálogo sin traducir).

## A-05 (baja) Barra de progreso del asistente casi invisible en tema claro (web)
- Capturas: RF-03/web/RF-03_p01_paso1-vacio_1440_claro.png (comprobar en el resto de pasos del asistente en claro).
- Reproducir: web, tema claro, Rutinas > Nueva rutina; en «Paso 1 de 6 · Nombre» solo se distingue el segmento activo; los 5 restantes (pista) casi no se ven. En oscuro se ven los 6.
- Gravedad: baja (contraste de elemento no textual).
- Nota: el nombre de usuario de la cuenta de pruebas se muestra como «Active Membership Mock» (dato de la cuenta de QA, no del producto).

## A-06 (media) Detalle de rutina recién creada (web): inglés, UUID crudo y aviso confuso
- Capturas: RF-03/web/RF-03_p07_rutina-guardada_1440_{claro,oscuro}.png (revisar también las de 390).
- Reproducir: web > Rutinas > Nueva rutina > completar los 6 pasos > Guardar. En el detalle: sobrelínea «PRIVATE · HIPERTROFIA» (visibilidad en inglés), toast «Rutina guardada, pero no pudimos ajustar las semanas 6.» (aviso de éxito parcial críptico, tapa el usuario del encabezado), nombres de ejercicio en inglés y pie «Rutina de <uuid>» visible al usuario.
- Gravedad: media (mezcla de idiomas, identificador interno expuesto, mensaje poco claro).

## A-07 (baja) Ficha web: sobrelínea de músculo incoherente con «Músculo objetivo»
- Capturas: RF-06/web/RF-06_p05_ficha-anadir-a-la-rutina_*.png
- Reproducir: web, «barbell bench press»: la sobrelínea dice «TRICEPS» pero «Músculo objetivo» dice «pectorals» y triceps es sinergista. Posible dato de catálogo (campo de músculo principal distinto).
- Gravedad: baja.

## A-08 (media) Tour de bienvenida «¡Hola! 1/5» se abre dentro del asistente de rutina
- Capturas: RF-06/web/RF-06_p08_atras-conserva_{390,1440}_{claro,oscuro}.png
- Reproducir: web, cuenta de pruebas que aún no ha visto el tour; crear rutina hasta «Paso 5 de 6 · Días», añadir ejercicios a un día y pulsar «Volver a la semana»/recargar: aparece el modal «BIENVENIDO A GYMSHEET» sobre el asistente y oculta la comprobación de que el día conserva sus 2 ejercicios.
- Gravedad: media para la evidencia (la captura no demuestra lo previsto) y baja para el producto (la guía se ofrece al primer acceso). Recapturar con el tour descartado.

## A-09 (baja) Moderación 390: eyebrow «COMUNIDAD» recortado por la cabecera en la vista previa de comentario
- Capturas: RF-B1/web/RF-B1_p02_vista-previa-comentario_390_{claro,oscuro}.png (en p01 con el mismo ancho sí se ve completo).
- Reproducir: web ancho 390, admin de gimnasio > Moderación > seleccionar el caso «Comentario»; tras el scroll automático al detalle la cabecera pegajosa deja la etiqueta «COMUNIDAD» cortada. Puede ser artefacto del fullPage; verificar en dispositivo.
- Gravedad: baja.

## A-10 (baja) Moderación 390: cabecera fija y toast descolocados en capturas de página completa
- Capturas: RF-B1/web/RF-B1_p03_rutina-ocultada_390_{claro,oscuro}.png y RF-B1_p04_rutina-restaurada_390_{claro,oscuro}.png
- Reproducir: web 390, admin > Moderación > Retirar/Restaurar una rutina; el toast «Caso resuelto.» y la cabecera sticky aparecen sobre la lista (en p04 la cabecera cubre «Contenido reportado por la comunidad…»). Probablemente artefacto del fullPage con scroll previo; recapturar con viewport y scroll arriba. En 1440 el toast tapa el nombre de usuario del encabezado (menor).
- Gravedad: baja.

## A-11 (baja) Rol «SYSTEM_ADMIN» mostrado en código crudo
- Capturas: RF-B1/web/RF-B1_p06_sistema-moderacion-global_1440_{claro,oscuro}.png
- Reproducir: web, usuario system admin: bajo el nombre en el encabezado y el pie aparece «SYSTEM_ADMIN» (constante con guion bajo) en lugar de una etiqueta legible («Administrador del sistema»).
- Gravedad: baja.
