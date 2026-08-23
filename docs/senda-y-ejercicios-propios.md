# La senda y los ejercicios propios (web + móvil)

Dos funciones nuevas, una sola implementación de cada una en cada plataforma y
paridad deliberada entre ambas.

El **porqué** del sistema de progresión —narrativa, puntos, filtrado por género,
multi-inquilino— vive en el backend, en `docs/progression/la-senda.md`. Este
documento cubre solo la parte de cliente.

---

## 1. Paridad

La senda es la misma función del producto en las dos aplicaciones, y quien use
ambas no debería tener que reaprenderla. Coinciden:

- **El relato y su orden**: quién eres → lo recién conseguido → el camino → lo
  que suma → las insignias → la clasificación.
- **Los tres estados de un hito**: conseguido (color propio), actual (anillo que
  late) y pendiente (apagado, con nombre y puntos legibles).
- **La geometría del raíl**: nodo de 44 px, línea de 2 px, encendida en el tramo
  recorrido y apagada en el que queda.
- **Los textos**, palabra por palabra, incluidos los de estado vacío y el de
  racha rota.
- **El latido**: misma duración (2,4 s), misma curva y misma escala; detenido por
  «reducir movimiento» en las dos plataformas.

Lo que **no** coincide, a propósito:

| | Móvil | Web |
|---|---|---|
| Composición | Una columna | Camino y cifras en dos columnas en escritorio |
| Insignias | Una por fila (dos en tableta) | Dos o tres por fila |
| Iconos | Ionicons | lucide (traducidos desde el nombre que envía el servidor) |
| Motor de animación | Reanimated | `@keyframes` CSS |

### Los iconos

El catálogo guarda nombres de **Ionicons**, que es el juego del móvil. La web los
traduce en `progression-icon.tsx`. Se hizo así, y no con un campo de icono por
plataforma, para que el catálogo tenga una sola fila por rango: un administrador
elige un icono, no dos, y no puede dejarlos descuadrados. Un nombre desconocido
cae en un icono genérico en vez de romper la pantalla.

## 2. Dónde vive cada cosa

```
packages/schemas/src/definitions/progression.ts   contratos compartidos

apps/mobile/
  app/(app)/trayectoria.tsx                       la pantalla
  app/(app)/ejercicio-nuevo.tsx                   alta guiada por músculo
  src/components/progression.tsx                  raíl, insignia, cabecera
  src/components/gender-preference.tsx            con qué arquetipos te habla

apps/web/src/features/progression/components/
  progression-client.tsx                          la pantalla
  progression-parts.tsx                           cabecera + reexportes
  progression-path-node.tsx  progression-badge-tile.tsx  progression-track.tsx
  progression-icon.tsx                            Ionicons → lucide
  senda-card.tsx                                  entrada desde el panel
  gender-preference-field.tsx
apps/web/src/features/exercises/components/
  muscle-machine-picker.tsx                       músculo → máquina
  use-muscle-inference.ts                         rellenado del formulario
```

Los contratos son los mismos para las dos aplicaciones, así que un cambio en el
backend rompe la validación en ambas a la vez en lugar de dejar una
silenciosamente desactualizada.

## 3. Cómo se entra

| | Móvil | Web |
|---|---|---|
| Principal | Tarjeta «Tu senda» en Inicio | «Tu senda» en el menú, segundo |
| Secundaria | Fila en Perfil | Tarjeta en el Panel |

En el móvil **no** es una pestaña: cinco es el techo de una barra inferior antes
de que las etiquetas empiecen a truncarse, y esa decisión ya estaba tomada. La
tarjeta de Inicio la pone en el recorrido diario, que es mejor que un sexto icono.

## 4. Ejercicios propios: el músculo elige la máquina

Se elige el músculo entrenado y el servidor deduce el equipamiento contando con
qué se entrena ese músculo en los ejercicios que ya existen en el catálogo.

**La deducción no se hace en el cliente.** Una tabla músculo→máquina escrita aquí
sería una opinión, y quedaría desfasada en cuanto el catálogo se sincronizara con
su origen. El cliente solo envía `muscleCode` y, si la persona eligió otra
opción, `equipmentLabel`.

Rellenar no es bloquear: los campos que la deducción completa —grupo muscular,
parte corporal, músculo objetivo— siguen siendo editables, y en la web sigue
existiendo la forma antigua («prefiero escribirlo a mano»).

Cuando un músculo no tiene ejercicios catalogados, el servidor responde que no
hay sugerencia y la pantalla lo dice. No se inventa una máquina.

## 5. El género

Se pregunta en el registro **como opcional** y se edita después desde el perfil,
en las dos plataformas. El control se llama por lo que hace —«elige con qué
rangos e insignias te habla tu senda»— y no por el dato que guarda, porque esa es
literalmente la única razón por la que la aplicación lo conoce.

Al cambiarlo se invalida la caché de `['progression']`: sin eso se seguirían
viendo los rangos de la rama anterior hasta recargar.

## 6. Rutas del BFF

La web solo puede alcanzar del backend lo que la lista de
`backend-route-policy.ts` permita. Se añadieron:

```
/me/progression                        /muscles
/me/progression/acknowledge            /muscle-groups
/me/progression/leaderboard            /exercises/equipment-suggestion
```

La administración del catálogo (`/admin/progression/**`) **no** está abierta: la
pantalla que la consumirá todavía no existe, y abrir la ruta antes de tener quien
la vigile sería dejar accesible desde el navegador una API que nadie mira. Hay
una prueba que fija ese bloqueo.

## 7. iOS

Sin ramas de plataforma en nada de lo nuevo, según la regla de
`docs/mobile/ios-paridad.md`: una sola implementación para las dos plataformas.
Todo lo usado —Reanimated, Ionicons, `expo-linear-gradient`, `expo-haptics`— es
común. Verificado en Android sobre emulador; iOS no se ejecutó.
