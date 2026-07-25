# Reporte de pruebas — 2026-07-21

- Backend: lint PASS, type-check PASS, 26 suites/118 tests PASS, build PASS y
  auditoría de dependencias de producción PASS (0 vulnerabilidades).
- Frontend: source-check PASS, type-check PASS, lint PASS sin advertencias,
  5 suites/20 tests PASS y build de producción PASS (27 rutas).
- Navegador: Playwright PASS, 8/8 escenarios en Chromium escritorio y Pixel 7;
  cubre redirección sin sesión, accesibilidad del login, autenticación, cookie
  `HttpOnly`, historial y catálogo de ejercicios.
- Infraestructura: Docker Compose PASS con PostgreSQL y Redis saludables, migración
  exitosa, API saludable y tres workers activos. La recreación conservó 1.324
  ejercicios y el entrenamiento de demostración.
- Seeds: base y mock ejecutados dos veces sin duplicados; segunda ejecución reportó
  todos los usuarios como `unchanged`.

Los mensajes de error emitidos por algunas pruebas unitarias del filtro HTTP y del
fallback de rate limiting son casos negativos intencionales y sus suites pasan.
