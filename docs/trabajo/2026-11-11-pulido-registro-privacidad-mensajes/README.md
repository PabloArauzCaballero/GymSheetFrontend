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
