# Plan — Flujo social y recomendaciones de GymSheet

> Planificación solicitada. Implementación y aceptación funcional pendientes.
> Para ejecutar: leer ESPECIFICACION.md, DECISIONES.md, CALIDAD_Y_DOD.md y LOOP.md; seguir las fases en orden de dependencias. Usar superpowers:executing-plans para ejecución directa o subagent-driven-development únicamente cuando corresponda al método autorizado.

**Objetivo:** dos personas adultas usan Android, iOS y web para activar perfiles sociales, descubrirse, conectar, entrenar juntas, compartir historias, conversar y participar en reels con resultados persistentes.
**Arquitectura:** frontend existente + backend existente + repositorio nuevo GymSheetRecommendations; el backend conserva la autorización y valida los candidatos del motor.
**Stack:** Expo/React Native; Next.js/React; NestJS/Sequelize/PostgreSQL; contratos TypeScript/Zod. El recomendador se diseña como servicio independiente.
**Especificación:** [ESPECIFICACION.md](ESPECIFICACION.md).
**Estado:** EN CURSO — redacción del plan, sin funcionalidades implementadas en esta tarea.

## Alcance confirmado

- Social opcional ofrecido tras registro/configuración de entrenamiento; «Ahora no» permite continuar entrenando.
- Solo mayores de 18 años; perfil no visible hasta activación.
- Comunidad entre gimnasios, con filtros por ubicación y gimnasio.
- Entrenamiento, amistades y citas; preferencia de hombres/mujeres obligatoria.
- Edad/distancia configurables; afinidad y reciprocidad probable sin exigir igualdad de preferencias.
- Conocer abre por defecto dentro de la sección social.
- Conexiones mutuas habilitan chat; reels usan la misma conexión.
- Historias de conexiones, reacciones, chat con visto configurable, edición, eliminación, fotos, stickers y voz.
- Reels verticales, like, comentarios, guardar y repostear; sin seguidores ni publicaciones tradicionales.
- Motor en repositorio separado: afinidad inicial sin historial, exploración y adaptación al comportamiento.
- Pruebas documentales con dos usuarios simultáneos, Android, iOS y web.
- Ciclo /loop de corrección y verificación con condiciones de salida explícitas.

## Entrega documental

Se completarán aquí el plan por fases, especificación, contratos, datos sintéticos, matriz de trazabilidad, protocolo de dos dispositivos, Definition of Done, registro de decisiones, revisión y reporte. Los comandos futuros se identificarán como herramientas por implementar.

## Restricciones de trabajo

Cambios locales previos en ambos repos. Esta tarea escribe documentación bajo este directorio y prepara simuladores existentes; no modifica el código de producto ni crea cuentas en un ambiente no identificado.

