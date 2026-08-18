# Evidencia de sweep de clicks — GymSheet Web

Generado con Playwright + Chromium contra el stack real (web `:3002` → backend NestJS `:3000` → PostgreSQL) usando usuarios mock sembrados.

## Totales

- **Rutas barridas:** 25 (cliente 19 + admin 6)
- **Clicks ejecutados:** 838
- **Fallos de click:** 0
- **Usuarios mock:** `active.mock` (CLIENTE activo), `new.mock` (onboarding), `expired.mock` (membresía vencida), `admin.dev` (ADMIN)

## Rutas cliente + públicas + logout

| Ruta | Aterrizó en | Clicks | Navegaciones | Popups |
|---|---|---:|---:|---:|
| `/login` | `/login` | 5 | 1 | 0 |
| `/register` | `/register` | 7 | 1 | 0 |
| `/dashboard` | `/dashboard` | 24 | 0 | 0 |
| `/workouts` | `/workouts` | 34 | 0 | 0 |
| `/workouts/new` | `/workouts/new` | 20 | 0 | 0 |
| `/plans` | `/plans` | 20 | 0 | 0 |
| `/routines` | `/routines` | 27 | 0 | 0 |
| `/exercises` | `/exercises` | 93 | 0 | 0 |
| `/exercises/new` | `/exercises/new` | 28 | 0 | 0 |
| `/membership` | `/membership` | 19 | 0 | 0 |
| `/access` | `/access` | 17 | 0 | 0 |
| `/notifications` | `/notifications` | 21 | 0 | 0 |
| `/profile` | `/profile` | 27 | 0 | 0 |
| `/tutorials` | `/tutorials` | 30 | 0 | 0 |
| `/exercises/80665cc4-0157-4f9f-ae14-16b3cf1fb4cc` | `/exercises/80665cc4-0157-4f9f-ae14-16b3cf1fb4cc` | 20 | 0 | 0 |
| `/exercises/80665cc4-0157-4f9f-ae14-16b3cf1fb4cc/edit` | `/exercises/80665cc4-0157-4f9f-ae14-16b3cf1fb4cc/edit` | 17 | 0 | 0 |
| `/onboarding` | `/onboarding` | 25 | 0 | 0 |
| `/membership` | `/membership` | 20 | 0 | 0 |
| `/dashboard` | `/dashboard` | 19 | 0 | 0 |

## Rutas admin (rol ADMIN)

| Ruta | Aterrizó en | Clicks | Navegaciones | Popups |
|---|---|---:|---:|---:|
| `/admin` | `/admin` | 28 | 0 | 0 |
| `/admin/equipment` | `/admin/equipment` | 25 | 0 | 0 |
| `/admin/exercises` | `/admin/exercises` | 225 | 0 | 0 |
| `/admin/facilities` | `/admin/facilities` | 29 | 0 | 0 |
| `/admin/membership` | `/admin/membership` | 31 | 0 | 0 |
| `/admin/access` | `/admin/access` | 27 | 0 | 0 |

## Estructura de carpetas

```
00_public/      login, register (sin autenticar)
01_active_mock/ todas las rutas del portal (CLIENTE activo)
02_new_mock/    onboarding (cliente nuevo)
03_expired_mock/membership + dashboard (membresía vencida)
04_logout/      cierre de sesión
05_admin/       panel de operaciones (rol ADMIN)
```

Cada carpeta de ruta contiene: `NNN_page.png` (estado base) y un `NNN_<elemento>.png` por cada click, con sufijo `__nav_<ruta>` si navegó o `__popup` si abrió una pestaña externa.

> Datos: app poblada con datos reales — 1324 ejercicios importados, 8 rutinas propias, 14 entrenamientos con series registradas (estados FINALIZADA/EN_PROGRESO/CANCELADA) y 3 planes asignados por el coach. El sweep cubre una ruta `/exercises/<uuid>` real y su edición.
