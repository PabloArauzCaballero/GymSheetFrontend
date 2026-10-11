# Defectos hallados en la revisión humana B (RF-07..13, RF-B2)

Revisión parcial: solo las capturas abiertas una a una (ver `revisiones-cierre-B.json`). Gravedad: A alta, M media, B baja.

- **D-B1 (B)** Etiqueta cruda «EXERCISES_DATASET» y nombre/músculo en inglés en la ficha de ejercicio. Pasos: entrar como cliente, Ejercicios, abrir «barbell bench press». Visto en RF-07 p01 (390/1440, claro/oscuro).
- **D-B2 (B)** Barra lateral cortada a 900 px en capturas de página completa 1440. Probable artefacto de captura, no de la app.
- **D-B3 (B)** Las pastillas de región en Ejercicios salen en inglés («Upper arms», «Waist», «Lower legs», «Cardio», «Neck»). Pasos: Ejercicios con cualquier filtro. RF-07 p02.
- **D-B6 (M)** Toast sobre fondo oscuro con cuerpo gris casi ilegible («No encontramos el recurso solicitado.»). Pasos: tema oscuro, Bruno abre una rutina revocada. RF-13 p09b 1440/390 oscuro.
- **D-B7 (M)** Captura inválida: el tour «¡Hola!» (1/5) tapa la pantalla y las tarjetas del panel están vacías, por lo que no prueba que el admin de gimnasio no accede a Rutinas REPP. Pasos: entrar como ADMIN de gimnasio con tour pendiente. RF-B2 p05 (4 variantes). Recapturar tras cerrar el tour y visitar la ruta REPP.
- **D-B9 (M)** Código crudo «· IN_APP» en la fecha de los avisos. Pasos: Ana comparte una rutina, Bruno rechaza, Ana abre Avisos. RF-13 p08b.
- **D-B12 (B)** Rutina revocada muestra «Rutina no encontrada» con «Reintentar» genérico, sin explicar la revocación. RF-13 p09b.
- **D-B13 (M)** Auditoría global a 390 px: solo se ven CUÁNDO y QUIÉN; la acción y el resto de columnas quedan fuera de pantalla. Pasos: SYSTEM_ADMIN, Auditoría global, dominio Rutinas, ancho 390. RF-B2 p06 390 claro/oscuro.
