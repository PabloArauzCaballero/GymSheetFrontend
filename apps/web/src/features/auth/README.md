# Authentication

Login y registro contra rutas BFF `/api/auth/*` del mismo origen. La feature nunca
recibe ni guarda el token del backend; el cierre de sesión limpia la cookie HttpOnly.

## Lo que comparte con el móvil

Estas pantallas **no** definen sus propias reglas. Todo lo que decide cómo se
comportan vive en `packages/` y lo consumen las dos plataformas:

| Qué | Dónde |
|---|---|
| Esquemas y valores por defecto de los formularios | `@gymsheet/schemas` (`forms.ts`) |
| Traducción a lo que espera `POST /auth/register` | `toRegisterPayload` |
| Textos, opciones del selector y destinos post-acceso | `@gymsheet/domain` (`auth-options.ts`) |
| Mensaje para cada tipo de fallo | `authErrorMessage` |

Si web y móvil deben decir o hacer lo mismo, el cambio va en el paquete, no aquí.
Cuando cada plataforma tenía su copia, la web exigía tres caracteres de nombre y el
móvil dos, el 401 se contaba de dos maneras distintas y el alta terminaba en
pantallas diferentes.

## Espaciado vertical

`globals.css` declara `h1, h2, h3, p { margin-block: 0 }` **fuera de toda `@layer`**,
y el CSS sin capa gana a las utilidades de Tailwind, que sí viven en una. Por eso
cualquier `mt-*` sobre un título o un párrafo de esta aplicación se calcula como
cero. El ritmo vertical de estas pantallas se lleva con `gap` en el contenedor.
