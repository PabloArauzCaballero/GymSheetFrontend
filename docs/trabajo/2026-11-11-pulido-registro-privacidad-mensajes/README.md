# Pulido de registro, privacidad, Mensajes y barra inferior (11/11/2026)

Pedido sobre tres capturas de iPhone:

1. Lista de beneficios del alta → panel de vidrio a lo ancho de la tarjeta, glifos en ficha jade,
   filas en cascada (`src/features/first-impression/benefit-list.tsx`, `src/components/auth-shell.tsx`).
2. Política de privacidad con elementos animados → escudo con halo (dos pulsos y se detiene), «Lo
   esencial» en tres líneas y cláusulas en tarjetas cuya ficha se ilumina al llegar la lectura (atado
   al scroll). Texto legal intacto (`app/(auth)/privacidad.tsx`).
3. Iconos con texto → solo iconos: pestañas General/Solicitudes/Conexiones con `SegmentedPill`
   (píldora que se desliza, contador de recibidas) y «Retirar» como ✕ de 44 pt
   (`app/(app)/(tabs)/comunidad-mensajes.tsx`).
4. Barra inferior flotante → cápsula de vidrio separada de los bordes, solo iconos; las pantallas
   reservan alto + hueco inferior (`app/(app)/(tabs)/_layout.tsx`); la mini-barra del entreno comparte
   columna (`src/features/workout/active-workout-bar.tsx`).
5. Layout → filas con avatar y antigüedad; el nombre largo se recorta y ya no empuja la acción fuera
   de la tarjeta.

Accesibilidad: cada icono conserva su nombre como etiqueta («Solicitudes», «Retirar la solicitud a
…», «Rutinas, tab, 4 of 5»). Todo el movimiento respeta «Reducir movimiento». Texto ≥ 12 pt.

## Evidencia

`evidencia/antes-despues.png` — lámina comparativa. Capturas sueltas `before-*` / `after-*` y
`pestanas-animadas.gif`.

Cómo se obtuvieron: Expo web (`expo start --web --no-dev`) en Playwright con viewport de iPhone 13,
contra un backend de maqueta local en `:3005` **no commiteado**. Para que la app arranque en web se
añadió `react-native-web` solo en `node_modules` (no está en `package.json`) y se sustituyeron en
`node_modules` el módulo web de `expo-secure-store` y `react-native-maps` por stubs. Nada de eso
está en el commit.

Límites honestos:

- **No** se ejecutó en simulador iOS ni en dispositivo. El desenfoque (`BlurView`) no se ve igual en
  web; en web la barra se apoya en el velo tintado.
- Las entradas en cascada de Reanimated se ven solapadas a mitad de animación en web, también con el
  código original; por eso las capturas de registro son con «Reducir movimiento» (antes y después igual).
- E2E no ejecutado (sin backend ni PostgreSQL).

Validación ejecutada: `yarn workspace @gymsheet/mobile type-check` OK, `lint` (incluye
`check-theme`) OK, `test` 255/255.

## Pasada 1 — el registro ayuda mientras se escribe (skills `signup`, `marketing-psychology`)

- Sugerencia ante erratas de dominio («¿Quisiste decir pablo@gmail.com?»), un toque corrige.
- «8 caracteres o más» y «Las contraseñas coinciden» en vivo, con glifo además de color.
- Junto al botón: «Después: 3 preguntas y tu primera rutina.» (sale de `onboardingSteps`) y «No
  vendemos tus datos a terceros.» (cláusula 2 de la política).
- Lógica pura en `src/features/first-impression/signup-hints.ts` con tests; el contrato con la API no
  cambia. Evidencia: `evidencia/pasada-1/`. Validación: type-check, lint y test (258/258) OK.

## Pasada 2 — Mensajes sin callejones sin salida (skills `onboarding`, `copywriting`)

- Tira de historias vacía: «Comparte tu entreno · Una foto o un vídeo de hoy.» abre la misma hoja que
  el «+» (`src/components/stories-bar.tsx`).
- Estados vacíos con salida: «Buscar gente» (→ Comunidad) en General, «Descubrir gente» (→ Descubrir)
  en Solicitudes y Conexiones. Botones secundarios.
- Subtítulo contextual: «N personas quieren conectar contigo.» cuando hay solicitudes recibidas.
- Pendiente visto en la captura: con la mini-barra del entreno abierta, el botón del estado vacío de
  General queda bajo ella hasta desplazar. Evidencia: `evidencia/pasada-2/`. Validación: type-check,
  lint y test (258/258) OK.

## Pasada 3 — privacidad con cierre y barra que avisa (skills `marketing-psychology`, `onboarding`)

- Privacidad: barra fija «Tu lectura» que se llena con el desplazamiento y «Entendido» que vuelve al
  alta; aire al final para que la última cláusula no quede debajo.
- Barra inferior: contador de solicitudes recibidas en Mensajes (misma caché que Solicitudes),
  etiqueta accesible con la cuenta, y la cápsula se oculta con el teclado abierto.
- Evidencia: `evidencia/pasada-3/` (maqueta con una solicitud recibida en las dos columnas).
  Validación: type-check, lint y test (258/258) OK.

## Pasada 4 — lo que quedaba pendiente

- `EmptyState` gana una variante `compact` opcional (horizontal, más baja). Mensajes la usa: el botón
  del estado vacío ya no queda bajo la mini-barra del entreno (pendiente de la pasada 2, resuelto).
- Solicitudes: sección «Quieren conectar» (antes «Te escribieron», que no era cierto) y antigüedad
  «Hace 2 h» que cabe junto a aceptar y rechazar.
- Registro: notas bajo el botón alineadas a la izquierda, una línea cada una.
- Evidencia: `evidencia/pasada-4/`. Validación: type-check, lint y test (258/258) OK.

## Pasada 5 — los dos documentos legales, al mismo nivel

- Nueva primitiva `src/components/legal-document.tsx` (`LegalDocument`): emblema, fecha, «Lo esencial»,
  cláusulas en tarjetas que se encienden al leer y barra de lectura. Privacidad y Términos la usan.
- Términos deja de ser un muro de texto; su texto legal no cambia.
- La barra de lectura aparece al empezar a desplazarse (antes tapaba la primera cláusula al abrir).
- **Hallazgo sin corregir (texto legal, decisión de negocio):** Términos dice «Puedes cerrar tu cuenta
  en cualquier momento desde el perfil» y Privacidad «contactando al gimnasio». Se contradicen.
- Evidencia: `evidencia/pasada-5/`. Validación: type-check, lint y test (258/258) OK.

## Pasada 6 — el login

- Título compartido «Vuelve a entrenar.» (`packages/domain`, móvil y web; `apps/web/e2e/auth.spec.ts`
  actualizado al texto nuevo).
- Sugerencia ante erratas del correo (misma pieza que el alta), placeholder en la contraseña,
  «¿Olvidaste tu contraseña?» junto al campo y «Crear cuenta» como botón secundario.
- Evidencia: `evidencia/pasada-6/`. Validación: móvil type-check, lint y test (258/258); web y domain
  type-check y test OK. E2E web no ejecutado (sin backend).

## Pasada 7 — Mensajes con datos reales

- `ChatConversationRow` (General y `/chat`): `PersonAvatar` con color por persona (antes relleno de
  acento, contra `accentPolicy`), nombre y hora en una línea, vista previa a todo el ancho (2 líneas),
  sin flecha.
- Conexiones: la fila abre el chat; «Desconectar» pasa a un «⋯» discreto con su confirmación; detalle
  «Conectados hace N».
- Se probó y retiró un aviso tocable de solicitudes: empujaba la lista y repetía el dato de los
  contadores. El subtítulo vuelve a ser fijo.
- Evidencia: `evidencia/pasada-7/` (maqueta con datos). Validación: type-check, lint y test (258/258) OK.

## Pasada 8 — el peor caso, en un iPhone SE

- Contraste medido (no a ojo) de los pares nuevos: tinte de «Lo esencial», emblema, contadores, ayudas
  del alta y «Tu lectura», en REPP y TOP Fitness. Todos pasan AA; quedan fijados en
  `src/theme/contrast.test.ts`.
- Peor caso (nombres larguísimos, emojis, chat de sistema, 120 solicitudes, conexión de hace > 1 año):
  acciones compactas (36 pt + hitSlop a 44) y nombres en dos líneas en Solicitudes; 20 solicitudes y
  «Ver más» en vez de 120 filas; contador de la barra «9+»; «Desde oct 2025»; tarjeta de historias
  acotada al ancho; «Enviadas» sin repetir «Enviada».
- `src/features/messages/since.ts` con tests (antes «Hace 12 oct 2025» era posible).
- Evidencia: `evidencia/pasada-8/` (iPhone SE). Validación: type-check, lint y test (266/266) OK.
