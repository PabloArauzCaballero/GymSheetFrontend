# Notifications

Notification inbox, mark-read action and preference management. External delivery requires the consent timestamp and consent version required by the backend schema.

## Browser push (Web Push / VAPID)

`WebPushCard` is the opt-in for notifications on **this** browser. The permission
prompt is raised only from the button's click handler — never on mount — and the
card always says which of the five states applies: unsupported browser, web push
not configured in this deployment, blocked by the user (with how to revert it),
subscribed, or ready to subscribe.

- `hooks/web-push-browser-store.ts` — the browser's own push state (permission,
  live subscription) as an external store read through `useSyncExternalStore`.
- `hooks/web-push-subscription.ts` — base64url key conversion and subscription
  normalization, the parts worth unit-testing without a browser.
- `hooks/web-push-state.ts` — the rule that turns browser + deployment config
  into what the card shows.
- `services/web-push-service.ts` — `GET /notifications/push/web-config` for the
  `applicationServerKey`, plus subscription register/unregister, all through the
  BFF.

The service worker lives at `public/sw.js` (root scope is required for a service
worker to control the whole origin) and only handles `push` and
`notificationclick`. Backend contract and key management: `ADR-0011` in the
backend repo.
