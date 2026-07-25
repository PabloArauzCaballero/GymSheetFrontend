# Modelo de base de datos

El backend usa Sequelize con migraciones versionadas y `synchronize: false`. Dominios:
usuarios/perfiles; ejercicios/equipos/multimedia; sesiones/ejercicios/series; sedes/salas;
membresías; acceso/credenciales; notificaciones; eventos/outbox e importación legacy.

Las migraciones están en `GymSheetBackend/src/database/migrations`. Readiness comprueba
PostgreSQL y estado de migraciones. No se ejecutó `migration:up` porque Docker Desktop
no pudo iniciar; no se modificó ni eliminó información existente.
