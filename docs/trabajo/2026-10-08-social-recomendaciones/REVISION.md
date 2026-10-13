# Revisión de consistencia del plan

Fecha: 2026-10-08. Autorrevisión documental; no revisión independiente ni prueba funcional.

## Comprobaciones realizadas en el contenido

| Área | Revisión / corrección |
|---|---|
| Cuestionario | 18 respuestas recomendadas + requisito de mapa + tres opciones de mapa incorporados en R01–R37. |
| Sustituciones | Se retiró la propuesta de conservar historial de solo lectura; ahora desaparición para ambos y chat nuevo al reconectar. |
| Privacidad de lectura | Se separó contador interno de no leídos de recibos públicos; añadido caso anti-retroactividad. |
| Mapa | Diferencia entre zona explorada y posición real persistida; personas agrupadas, gyms con coordenadas de establecimiento. |
| Repost | Dos tabs; duplicación por reelId evitada; guardado privado; no seguidores. |
| Motor | Repo independiente, cold start y aprendizaje desde versión inicial; calidad sintética separada de eficacia real. |
| Cross-gym | Autorización social no elimina scoping de datos empresariales o salud. |
| Dependencias | H3 no espera cancelar invitaciones inexistentes; cancelación concreta queda en H10. |
| Seeds | H1 prepara identidades actuales y manifest; estados nuevos se materializan al aplicar migraciones de módulo. |
| Migraciones | Se añadieron subtareas de compatibilidad/base vacía en cada módulo con persistencia nueva. |
| Herramientas QA | Se etiquetan scripts/tests propuestos; H1 crea orquestador. Los primeros preflights tienen comandos directos para evitar depender de su propio runner. |
| Entorno | Node 22 local confirmado. Android sin AVD. No se llama prueba simultánea a dos sesiones no ejercitadas. |
| Fuentes | Mapas/directorio/SDK y ranking citados; no se afirma cobertura de gimnasios ni compatibilidad nativa sin prueba. |

## Límites de la revisión

La validación automática comprueba enlaces internos, unicidad de IDs, cobertura asignada, dependencias, estados y concordancia de índices. No demuestra que los casos futuros estén implementados, que contratos ya respondan ni que todas las futuras decisiones de implementación estén libres de defectos. Los pasos de QA operativa y revisión visual forman parte del trabajo pendiente.
