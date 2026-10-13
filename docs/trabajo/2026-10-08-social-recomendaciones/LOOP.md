# /loop — reproducir, corregir y demostrar

Este archivo concreta el ciclo pedido por el usuario. No se instaló un comando `/loop`, no se creó cron ni automatización en segundo plano. El ejecutor puede realizarlo con herramientas de sesión y un registro persistente por caso.

## Entrada

ID de microtarea, criterio literal, actor A/B/C, escenario seed/runId, versión de los tres repos, entorno, test mínimo que fallaría si el requisito no estuviera satisfecho. Antes de tocar código, comprobar que el fallo no proviene de mezclar URL, credenciales, fixtures o builds.

## Ciclo de una microtarea

1. Reproducir el defecto o correr prueba de comportamiento ausente; conservar comando/salida y captura si es visible.
2. Diagnosticar una causa respaldada por datos. Clasificar producto, contrato, dato, infraestructura o proveedor.
3. Aplicar la corrección mínima; si aparece trabajo nuevo, añadir microtarea con CA/DoD antes de implementarlo. No borrar/debilitar pruebas ni subir timeouts sin demostrar causa.
4. Ejecutar caso dirigido; comprobar resultado persistido. Si falla, registrar intento y volver a diagnóstico.
5. Si pasa, probar regresión del área y superficies que comparten contrato; UI requiere recaptura y doble revisión.
6. Registrar PASS con evidencia de última versión y actualizar fila. Cualquier edición posterior invalida la evidencia de esa área.

## Ciclo de hito

Ejecutar todas las microtareas del hito, luego su demo vertical A/B en Android/iOS/web. Un backend verde sin UI o una UI con mocks no cierra el hito. Consultar errores de consola/red y lectura BD. Si un fallo revela requisito ausente, corregir especificación/plan manteniendo decisiones del usuario.

## Ciclo del recorrido completo

Después de H11, ejecutar QA-AB-01…08. Fallo → caso reproducible → microtarea responsable → corrección → repetir caso y regresión afectada. Repetir todo el recorrido cuando cambie contrato transversal, permisos o migración; no repetir indiscriminadamente suites ajenas cuando no hay cambio relevante.

## Condiciones de salida

- PASS: CA, persistencia, regresión y gates aplicables demostrados; no basta exit 0 con cero pruebas.
- FAIL: hay defecto reproducible; continuar trabajo autorizado y registrar intentos.
- BLOCKED: falta condición externa concreta que no puede resolverse con herramientas/autorización disponibles. Guardar evidencia y trabajo independiente; no marcar HECHO ni saltarse una dependencia.

Tres intentos con la misma firma de fallo sin información nueva disparan revisión de diagnóstico, no tres reintentos ciegos ni abandono automático. No imponer un máximo que convierta requisitos sin cumplir en aprobados. No pedir al usuario que repita decisiones ya registradas.

## Registro de cada intento

`runId, caso, intento, inicio/fin UTC, versiones, expected, actual, diagnóstico, archivo tocado, comando, exit code, artefactos, siguiente acción`. Sanitizar secretos. Evidencia fallida se conserva junto a la exitosa; el último PASS no borra historial.

Antes de deploy/push/contratar recursos se aplica la autorización correspondiente a esa acción concreta; el loop de QA no es permiso implícito para publicar.
