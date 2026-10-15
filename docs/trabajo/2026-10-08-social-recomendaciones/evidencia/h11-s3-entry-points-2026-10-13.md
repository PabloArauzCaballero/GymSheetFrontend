# H11.S3 — Entradas de interacción y estado de PAIR

Fecha: 2026-10-13.
Implementación publicada en frontend `b94a331`.

## Entradas verificadas en código

- Web: denuncia desde perfil y reel ya estaba conectada; ahora cada mensaje recibido ofrece Reportar y abre el diálogo de moderación para `CHAT_MESSAGE`.
- Móvil: denuncia de reel ya estaba conectada; ahora perfil y cada mensaje recibido permiten elegir motivo y enviar `USER` o `CHAT_MESSAGE` al servicio común.
- Web y móvil ya exponen pausa/reactivación del perfil mediante `social-discovery-settings`. Web y móvil ya permiten bloquear desde la pantalla de perfil.

## Gates locales

- Web `message-bubble-audio.test.tsx`: PASS 3/3, incluyendo botón Reportar accesible para un mensaje recibido.
- Type-check Web: PASS.
- Type-check móvil: PASS.
- ESLint focal Web y móvil: PASS.
- Skill `vercel:react-best-practices`: hooks en nivel superior, sin componentes declarados dentro de otros componentes, acciones con nombres accesibles y mutación usando React Query.

## PAIR pendiente

No se ejecutó una prueba entre actores/dispositivos. El entorno no contiene variables `QA_*`; API/Web locales no escuchan en 3011/3002; el runner `scripts/qa/run-social-pair.py` no registra todavía la fase H11. Los dispositivos observados anteriormente no sustituyen la sesión autenticada coordinada. Por eso H11.S3.M1–M4 permanecen EN CURSO.
