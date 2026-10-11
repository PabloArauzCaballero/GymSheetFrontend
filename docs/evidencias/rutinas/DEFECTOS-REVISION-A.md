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
