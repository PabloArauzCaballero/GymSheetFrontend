# Screen-to-endpoint matrix

| Screen | Read endpoints | Write endpoints | Gate |
|---|---|---|---|
| Login | — | `POST /auth/login` | public |
| Register | — | `POST /auth/register` | public |
| Dashboard | `/users/me`, `/profile`, `/workouts`, `/memberships/me`, `/notifications/me` | — | authenticated |
| Profile | `/users/me`, `/profile` | `POST/PATCH /profile` | authenticated |
| Exercises | `/exercises`, `/equipment`, `/user-exercises` | favorite add/remove | authenticated |
| Personal exercise | `/equipment`, `/exercises/:id` | `POST /exercises/personal`; `PATCH/DELETE /exercises/:id` | authenticated/owner |
| Exercise detail | `/exercises/:id` | favorite, media add/remove and owner inactivation | visible object; writes owner or ADMIN as applicable |
| Workout history | `/workouts` | CSV/JSON export | authenticated |
| Live workout | `/workouts/:id`, `/exercises` | session/exercise/set writes; finish/cancel | owner, session in progress |
| Membership | `/memberships/me` | — | authenticated |
| Access | `/access/me`, `/access/credentials/me` | — | authenticated |
| Notifications | `/notifications/me`, `/notifications/preferences/me` | mark read; update preferences | authenticated |
| Equipment admin | `/equipment` | admin equipment create/update/inactivate | ADMIN or FRONT_DESK page; ADMIN mutations |
| Exercise admin | `/exercises` | global create/update/inactivate; dataset dry run | ADMIN |
| Facilities admin | branches, rooms, access points, maintenance, equipment | create/update facility records; assignment; maintenance lifecycle | ADMIN/FRONT_DESK according to controller methods |
| Membership admin | plans, customers, memberships | plan/customer/membership/staff writes | ADMIN/FRONT_DESK according to controller methods |
| Access admin | devices, decision history, event detail, user credentials | device and credential writes | ADMIN/FRONT_DESK according to controller methods |

Every path above is forwarded beneath the configured backend API prefix, default `/api/v1`.
