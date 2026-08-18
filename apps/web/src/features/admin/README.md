# Administration

Operational components for equipment, global exercises, facilities, memberships and access control. Pages receive the server-revalidated role and hide method-level ADMIN operations from `FRONT_DESK` users.

## Plan images (payment QR)

A plan's image is a row in the managed media repository, not a field on the plan. `PlanImageButton` uploads through `POST /admin/media` under a code derived from the plan code (`planImageCode`), then links the resulting file to the plan with `PATCH /admin/membership/plans/:id { imagenId }`. Because the code is stable, replacing the QR overwrites the same file instead of accumulating orphans. The image is rendered through the BFF media proxy with the raw URL as fallback, since the proxy refuses private hosts and the local storage provider serves from `localhost` in development.

## Staff

`POST /admin/membership/staff-users` creates the account and the employment profile together; the authorization role is derived from the position by the backend, so the console cannot mint permissions that do not match the job. `POST /admin/membership/staff` remains for linking a profile to an account that already exists.

## Face enrollment

`PersonEnrollment` captures a frame with the computer's camera (`@/shared/lib/camera`) and registers a `FACE` credential through the existing external-reference endpoint. The photograph never leaves the browser: only an enrollment reference, the capture checksum, the detection summary and the consent evidence are transmitted. Face detection uses the browser's Shape Detection API when present and a skin-tone heuristic otherwise; the heuristic is labelled as such in the UI and never asserts identity.
