/**
 * Llena la parte social de la base local: elenco de socios con fotos, matches,
 * stories, likes, nexts y vistas de perfil.
 *
 * Uso:  node apps/mobile/scripts/seed-social-demo.mjs
 * (con el backend en marcha y las semillas del backend ya ejecutadas)
 *
 * Hermano de `seed-demo-data.mjs`, que deja al atleta con membresía, rutinas e
 * historial. Aquí se puebla lo otro: la base local tiene diez cuentas pero cero
 * fotos de perfil, cero conexiones, cero stories, cero descartes y cero vistas,
 * así que cada pantalla social se abre vacía y no hay nada que enseñar en el
 * simulador. Además dota de perfil y fotos a las cuentas mock que ya existían:
 * la baraja empata a puntos y desempata por nombre, así que salían primero y la
 * primera carta de Descubrir era una tarjeta vacía. De esas cuentas se toca
 * únicamente perfil y fotos — sus membresías, conexiones y estados se dejan
 * exactamente como están, porque otras suites dependen de ellos.
 *
 * Como en aquel script, **todo se crea por la API, con los mismos
 * roles y validaciones que en producción; nada se escribe a mano en
 * PostgreSQL**: si una regla de negocio cambia, esta siembra falla igual que
 * fallaría la app, que es justo lo que se quiere de unos datos de demostración.
 *
 * Idempotente: puede ejecutarse dos veces seguidas. Un socio que ya existe se
 * reutiliza (409 del registro → login), las fotos y stories se completan hasta
 * el objetivo en vez de duplicarse, y los swipes repetidos dan 409 «ya existe
 * una solicitud», que aquí es el resultado esperado y no un error.
 */
import { deflateSync } from "node:zlib";

const BASE = process.env.GYMSHEET_API_URL ?? "http://localhost:3011/api/v1";

/** Todas las cuentas de la base local viven en este gimnasio; el directorio y la
 *  baraja filtran por tenant, así que un socio en otro no se vería nunca. */
const TENANT_ID = process.env.GYMSHEET_TENANT_ID ?? "topfitness";

/** El protagonista: es la cuenta con la que se abrirá la app en el simulador. */
const ATHLETE = { email: "athlete.mock@gymsheet.local", password: "MockLocal2026!" };

/** Contraseña del elenco nuevo. Mínimo 8 caracteres (registerSchema). */
const SOCIO_PASSWORD = "SocialDemo2026!";

// ── HTTP ────────────────────────────────────────────────────────────────────

/**
 * Espera entre reintentos por límite de peticiones.
 *
 * El backend limita a 100 peticiones/minuto en general y a 10/minuto en
 * `auth/*`. Esta siembra hace bastantes más que eso (nueve altas, ~36 fotos,
 * stories, swipes…), así que el 429 es una parada normal del guion, no un
 * fallo: se espera lo que diga `Retry-After` y se reintenta.
 */
const MAX_REINTENTOS_429 = 12;
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Una petición a la API, con el sobre `{ ok, data }` del backend ya abierto y
 * el error convertido en algo legible: método, ruta, código y lo que respondió
 * el servidor. Nunca falla en silencio.
 */
async function request(method, path, { token, body, form } = {}) {
  for (let intento = 0; ; intento += 1) {
    const headers = { Accept: "application/json" };
    if (token) headers.Authorization = `Bearer ${token}`;
    // `FormData` pone su propio Content-Type con el boundary: fijarlo a mano
    // rompería el multipart que espera `FileInterceptor('file')`.
    if (!form && body !== undefined) headers["Content-Type"] = "application/json";

    let response;
    try {
      response = await fetch(`${BASE}${path}`, {
        method,
        headers,
        ...(form ? { body: form } : body === undefined ? {} : { body: JSON.stringify(body) }),
      });
    } catch (cause) {
      throw new Error(
        `${method} ${path} -> no se pudo contactar con ${BASE}: ${cause.message}. ` +
          "¿Está el backend levantado?",
      );
    }

    const text = await response.text();
    let json = null;
    try {
      json = JSON.parse(text);
    } catch {
      /* respuesta vacía o no-JSON */
    }

    if (response.status === 429 && intento < MAX_REINTENTOS_429) {
      const retryAfter = Number(response.headers.get("retry-after"));
      const esperaMs = (Number.isFinite(retryAfter) && retryAfter > 0 ? retryAfter : 10) * 1000;
      console.log(`   · límite de peticiones en ${path}: esperando ${esperaMs / 1000}s…`);
      await sleep(esperaMs);
      continue;
    }

    if (!response.ok) {
      const detalle = json?.detail ?? json?.error?.message ?? text.slice(0, 300);
      throw Object.assign(new Error(`${method} ${path} -> ${response.status}: ${detalle}`), {
        status: response.status,
        detail: detalle,
      });
    }

    return json?.data ?? json;
  }
}

/** Cliente atado a un token: `api(token)('GET', '/me/photos')`. */
const api = (token) => (method, path, options) => request(method, path, { ...options, token });

async function login({ email, password }) {
  const data = await request("POST", "/auth/login", { body: { email, password } });
  return { token: data.accessToken, user: data.user };
}

/**
 * Alta de un socio, o su sesión si ya estaba.
 *
 * El registro devuelve 409 cuando el correo ya existe (`AuthService.register`),
 * y ese es el camino normal de la segunda ejecución: se reutiliza la cuenta en
 * vez de romper la siembra.
 */
async function registrarOEntrar(socio) {
  try {
    const data = await request("POST", "/auth/register", {
      body: {
        email: socio.email,
        password: SOCIO_PASSWORD,
        nombreCompleto: socio.nombre,
        tenantId: TENANT_ID,
        genero: socio.genero,
        // Obligatorio y literal `true` en el schema: sin esto el alta no pasa.
        acceptedTerms: true,
      },
    });
    return { token: data.accessToken, user: data.user, creado: true };
  } catch (error) {
    if (error.status !== 409) throw error;
    const sesion = await login({ email: socio.email, password: SOCIO_PASSWORD });
    return { ...sesion, creado: false };
  }
}

// ── Imágenes ────────────────────────────────────────────────────────────────
//
// De dónde salen las fotos:
//
// 1) Primera opción, `images.unsplash.com`. Es el host que el propio backend
//    tiene en su lista blanca de descargas (`MEDIA_MIRROR_ALLOWED_HOSTS` en
//    `.env`, usada por `db:media:mirror`), así que traer bytes de ahí es
//    exactamente lo que el proyecto ya hace para poblar medios. Se piden
//    recortes verticales 600x900 porque la tarjeta de descubrimiento es un
//    carrusel a pantalla casi completa.
//
// 2) Respaldo, cuando no hay red o la descarga no devuelve una imagen válida
//    (error HTTP, tipo MIME que no es `image/*`, cuerpo vacío o por encima del
//    tope de 5 MB de `MEDIA_UPLOAD_MAX_BYTES`): se genera aquí mismo un PNG
//    vertical con un degradado y dos caracteres grandes —la inicial del socio y
//    el número de foto—. No es un retrato, pero sí una imagen válida, distinta
//    de todas las demás y reconocible de un vistazo, que es lo que hace falta
//    para que el carrusel tenga varias fotos que pasar. Importa que sean
//    distintas entre sí: el almacenamiento local guarda por SHA-256 del
//    contenido, así que dos ficheros idénticos serían el mismo medio repetido.

const FOTO_ANCHO = 600;
const FOTO_ALTO = 900;
const MAX_BYTES_FOTO = 5 * 1024 * 1024; // MEDIA_UPLOAD_MAX_BYTES del backend

/**
 * Identificadores de fotos verticales de Unsplash (gente entrenando y retratos).
 * Si alguno ya no existe, esa foto concreta cae al respaldo generado: el socio
 * no se queda con menos fotos por ello.
 *
 * La lista tiene que ser al menos tan larga como el total de fotos que siembra
 * el guion (ver `reservarUnsplash`): dos personas con la misma cara en la
 * baraja se nota inmediatamente y arruina la captura.
 */
const UNSPLASH_IDS = [
  "photo-1517836357463-d25dfeac3438",
  "photo-1534438327276-14e5300c3a48",
  "photo-1571019613454-1cb2f99b2d8b",
  "photo-1541534741688-6078c6bfb5c5",
  "photo-1583454110551-21f2fa2afe61",
  "photo-1550345332-09e3ac987658",
  "photo-1526506118085-60ce8714f8c5",
  "photo-1594381898411-846e7d193883",
  "photo-1517838277536-f5f99be501cd",
  "photo-1548690312-e3b507d8c110",
  "photo-1544367567-0f2fcb009e0b",
  "photo-1518310383802-640c2de311b2",
  "photo-1499952127939-9bbf5af6c51c",
  "photo-1508214751196-bcfd4ca60f91",
  "photo-1500648767791-00dcc994a43e",
  "photo-1494790108377-be9c29b29330",
  "photo-1438761681033-6461ffad8d80",
  "photo-1534528741775-53994a69daeb",
  "photo-1517841905240-472988babdf9",
  "photo-1552374196-c4e7ffc6e126",
  "photo-1521119989659-a83eee488004",
  "photo-1546539782-6fc531453083",
  "photo-1607990281513-2c110a25bd8c",
  "photo-1583468982228-19f19164aee2",
  "photo-1581009146145-b5ef050c2e1e",
  "photo-1596357395217-80de13130e92",
  "photo-1532384748853-8f54a8f476e2",
  "photo-1517502884422-41eaead166d4",
  "photo-1524594152303-9fd13543fe6e",
  "photo-1519085360753-af0119f7cbe7",
  "photo-1530143584546-02191bc84eb5",
  "photo-1519058082700-08a0b56da9b4",
  "photo-1487412720507-e7ab37603c6f",
  "photo-1502685104226-ee32379fefbe",
  "photo-1531123897727-8f129e1688ce",
  "photo-1509967419530-da38b4704bc6",
  "photo-1540206395-68808572332f",
  "photo-1522075469751-3a6694fb2f61",
  "photo-1518611012118-696072aa579a",
  "photo-1517344368193-41552b6ad3f5",
  "photo-1541600383005-565c949cf777",
  "photo-1583500178690-f7fd39d8eabc",
  "photo-1579758629938-03607ccdbaba",
  "photo-1584466977773-e625c37cdd50",
  "photo-1605296867304-46d5465a13f1",
  "photo-1524250502761-1ac6f2e30d43",
  "photo-1519699047748-de8e457a634e",
  "photo-1488426862026-3ee34a7d66df",
  "photo-1492562080023-ab3db95bfbce",
  "photo-1506794778202-cad84cf45f1d",
  "photo-1503443207922-dff7d543fd0e",
  "photo-1489980557514-251d61e3eeb6",
  "photo-1504257432389-52343af06ae3",
  "photo-1463453091185-61582044d556",
  "photo-1544005313-94ddf0286df2",
  "photo-1573497019940-1c28c88b4f3e",
  "photo-1580489944761-15a19d654956",
  "photo-1554151228-14d9def656e4",
  "photo-1499996860823-5214fcc65f8f",
  "photo-1541216970279-affbfdd55aa8",
  "photo-1557862921-37829c790f19",
  "photo-1506277886164-e25aa3f4ef7f",
  "photo-1564564321837-a57b7070ac4f",
  "photo-1531891437562-4301cf35b7e4",
  "photo-1542178243-bc20204b769f",
  "photo-1517845476-91b1e1d3b4f6",
  "photo-1526413232644-8a40f03cc03b",
  "photo-1571731956672-f2b94d7dd0cb",
  "photo-1517941823-815bea90d291",
  "photo-1583500178450-e59e4309b57a",
  "photo-1590556409324-aa1d726e5c3c",
  "photo-1518459031867-a89b944bffe4",
  "photo-1534367507873-d2d7e24c797f",
];

/**
 * Reparto de identificadores de Unsplash.
 *
 * Cada galería y cada tanda de stories se lleva un bloque contiguo y propio, en
 * vez de calcular el índice a partir de la posición en el elenco: con la
 * fórmula anterior los bloques se pisaban y una story de alguien acababa siendo
 * la misma imagen que la foto de otro. El reparto se hace una sola vez, al
 * cargar el módulo, así que es el mismo en cada ejecución.
 */
let cursorUnsplash = 0;
function reservarUnsplash(cantidad) {
  const inicio = cursorUnsplash;
  cursorUnsplash += cantidad;
  return inicio;
}

/** Descarga una foto de Unsplash. Devuelve `null` ante cualquier problema. */
async function descargarUnsplash(photoId) {
  const url = `https://images.unsplash.com/${photoId}?auto=format&fit=crop&crop=faces&w=${FOTO_ANCHO}&h=${FOTO_ALTO}&q=70`;
  try {
    const controlador = new AbortController();
    const temporizador = setTimeout(() => controlador.abort(), 15000);
    const respuesta = await fetch(url, { signal: controlador.signal });
    clearTimeout(temporizador);
    if (!respuesta.ok) return null;
    const tipo = (respuesta.headers.get("content-type") ?? "").split(";")[0].trim().toLowerCase();
    // El backend sólo acepta estos cuatro para foto de perfil (MEDIA_ALLOWED_MIME).
    if (!["image/jpeg", "image/png", "image/webp", "image/gif"].includes(tipo)) return null;
    const bytes = Buffer.from(await respuesta.arrayBuffer());
    if (bytes.length === 0 || bytes.length > MAX_BYTES_FOTO) return null;
    return { bytes, tipo, extension: tipo === "image/jpeg" ? "jpg" : tipo.split("/")[1] };
  } catch {
    // Sin red, DNS caído, timeout… todo cae al respaldo.
    return null;
  }
}

// — Codificador PNG mínimo (sin dependencias) ——————————————————————————————

const TABLA_CRC = (() => {
  const tabla = new Uint32Array(256);
  for (let n = 0; n < 256; n += 1) {
    let c = n;
    for (let k = 0; k < 8; k += 1) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    tabla[n] = c >>> 0;
  }
  return tabla;
})();

function crc32(buffer) {
  let c = 0xffffffff;
  for (let i = 0; i < buffer.length; i += 1) c = TABLA_CRC[(c ^ buffer[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

function trozoPng(tipo, datos) {
  const longitud = Buffer.alloc(4);
  longitud.writeUInt32BE(datos.length, 0);
  const cuerpo = Buffer.concat([Buffer.from(tipo, "latin1"), datos]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(cuerpo), 0);
  return Buffer.concat([longitud, cuerpo, crc]);
}

/** PNG truecolor 8 bits sin filtros: lo mínimo que reconoce cualquier decodificador. */
function codificarPng(ancho, alto, rgb) {
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(ancho, 0);
  ihdr.writeUInt32BE(alto, 4);
  ihdr[8] = 8; // profundidad de bits
  ihdr[9] = 2; // color type 2 = RGB
  const bytesPorFila = ancho * 3;
  const crudo = Buffer.alloc(alto * (bytesPorFila + 1));
  for (let y = 0; y < alto; y += 1) {
    crudo[y * (bytesPorFila + 1)] = 0; // filtro «None»
    rgb.copy(crudo, y * (bytesPorFila + 1) + 1, y * bytesPorFila, (y + 1) * bytesPorFila);
  }
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    trozoPng("IHDR", ihdr),
    trozoPng("IDAT", deflateSync(crudo, { level: 9 })),
    trozoPng("IEND", Buffer.alloc(0)),
  ]);
}

/** Tipografía 5x7 de trazo, sólo para la inicial y el número de la foto. */
const FUENTE = {
  A: "01110,10001,10001,11111,10001,10001,10001",
  B: "11110,10001,10001,11110,10001,10001,11110",
  C: "01110,10001,10000,10000,10000,10001,01110",
  D: "11110,10001,10001,10001,10001,10001,11110",
  E: "11111,10000,10000,11110,10000,10000,11111",
  F: "11111,10000,10000,11110,10000,10000,10000",
  G: "01110,10001,10000,10111,10001,10001,01111",
  H: "10001,10001,10001,11111,10001,10001,10001",
  I: "11111,00100,00100,00100,00100,00100,11111",
  J: "00111,00010,00010,00010,00010,10010,01100",
  K: "10001,10010,10100,11000,10100,10010,10001",
  L: "10000,10000,10000,10000,10000,10000,11111",
  M: "10001,11011,10101,10101,10001,10001,10001",
  N: "10001,11001,10101,10011,10001,10001,10001",
  O: "01110,10001,10001,10001,10001,10001,01110",
  P: "11110,10001,10001,11110,10000,10000,10000",
  Q: "01110,10001,10001,10001,10101,10010,01101",
  R: "11110,10001,10001,11110,10100,10010,10001",
  S: "01111,10000,10000,01110,00001,00001,11110",
  T: "11111,00100,00100,00100,00100,00100,00100",
  U: "10001,10001,10001,10001,10001,10001,01110",
  V: "10001,10001,10001,10001,10001,01010,00100",
  W: "10001,10001,10001,10101,10101,11011,10001",
  X: "10001,10001,01010,00100,01010,10001,10001",
  Y: "10001,10001,01010,00100,00100,00100,00100",
  Z: "11111,00001,00010,00100,01000,10000,11111",
  0: "01110,10001,10011,10101,11001,10001,01110",
  1: "00100,01100,00100,00100,00100,00100,01110",
  2: "01110,10001,00001,00010,00100,01000,11111",
  3: "11111,00010,00100,00010,00001,10001,01110",
  4: "00010,00110,01010,10010,11111,00010,00010",
  5: "11111,10000,11110,00001,00001,10001,01110",
  6: "00110,01000,10000,11110,10001,10001,01110",
  7: "11111,00001,00010,00100,01000,01000,01000",
  8: "01110,10001,10001,01110,10001,10001,01110",
  9: "01110,10001,10001,01111,00001,00010,01100",
  "?": "01110,10001,00001,00110,00100,00000,00100",
};

/** HSL → RGB, para sacar degradados variados de un solo número. */
function hslARgb(h, s, l) {
  const k = (n) => (n + h / 30) % 12;
  const a = s * Math.min(l, 1 - l);
  const f = (n) => Math.round(255 * (l - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)))));
  return [f(0), f(8), f(4)];
}

function hashTexto(texto) {
  let h = 2166136261;
  for (let i = 0; i < texto.length; i += 1) {
    h ^= texto.charCodeAt(i);
    h = Math.imul(h, 16777619) >>> 0;
  }
  return h;
}

/**
 * Imagen de respaldo: degradado vertical + inicial del socio + un segundo
 * glifo (el número de foto, o una «S» si es una story).
 *
 * El tono sale de `semillaTexto`, que incluye el nombre y el uso concreto, así
 * que dos imágenes de la misma persona nunca salen iguales — importa porque el
 * almacenamiento indexa por SHA-256 del contenido y dos binarios idénticos
 * serían el mismo medio repetido.
 */
function generarFotoRespaldo(nombre, glifoSecundario, semillaTexto) {
  const semilla = hashTexto(semillaTexto);
  const tono = semilla % 360;
  const [r1, g1, b1] = hslARgb(tono, 0.55, 0.32);
  const [r2, g2, b2] = hslARgb((tono + 45) % 360, 0.6, 0.62);

  const rgb = Buffer.alloc(FOTO_ANCHO * FOTO_ALTO * 3);
  for (let y = 0; y < FOTO_ALTO; y += 1) {
    const t = y / (FOTO_ALTO - 1);
    const r = Math.round(r1 + (r2 - r1) * t);
    const g = Math.round(g1 + (g2 - g1) * t);
    const b = Math.round(b1 + (b2 - b1) * t);
    for (let x = 0; x < FOTO_ANCHO; x += 1) {
      // Viñeta suave hacia los bordes: sin ella el degradado plano parece un
      // error de carga más que una foto de marcador de posición.
      const dx = (x / FOTO_ANCHO - 0.5) * 2;
      const atenuacion = 1 - 0.25 * dx * dx;
      const p = (y * FOTO_ANCHO + x) * 3;
      rgb[p] = Math.round(r * atenuacion);
      rgb[p + 1] = Math.round(g * atenuacion);
      rgb[p + 2] = Math.round(b * atenuacion);
    }
  }

  const inicial = (nombre.trim()[0] ?? "?").toUpperCase();
  const texto = `${FUENTE[inicial] ? inicial : "?"}${glifoSecundario}`;
  const escala = 46;
  const anchoGlifo = 5 * escala;
  const altoGlifo = 7 * escala;
  const separacion = Math.round(escala * 1.2);
  const anchoTexto = texto.length * anchoGlifo + (texto.length - 1) * separacion;
  const x0 = Math.round((FOTO_ANCHO - anchoTexto) / 2);
  const y0 = Math.round((FOTO_ALTO - altoGlifo) / 2);

  const pintar = (px, py, [r, g, b]) => {
    if (px < 0 || py < 0 || px >= FOTO_ANCHO || py >= FOTO_ALTO) return;
    const p = (py * FOTO_ANCHO + px) * 3;
    rgb[p] = r;
    rgb[p + 1] = g;
    rgb[p + 2] = b;
  };

  texto.split("").forEach((caracter, posicion) => {
    const filas = (FUENTE[caracter] ?? FUENTE["?"]).split(",");
    const origenX = x0 + posicion * (anchoGlifo + separacion);
    for (let fila = 0; fila < 7; fila += 1) {
      for (let columna = 0; columna < 5; columna += 1) {
        if (filas[fila][columna] !== "1") continue;
        for (let dy = 0; dy < escala; dy += 1) {
          for (let dx = 0; dx < escala; dx += 1) {
            const px = origenX + columna * escala + dx;
            const py = y0 + fila * escala + dy;
            pintar(px + 6, py + 6, [0, 0, 0]); // sombra, para que se lea sobre cualquier tono
            pintar(px, py, [255, 255, 255]);
          }
        }
      }
    }
  });

  return { bytes: codificarPng(FOTO_ANCHO, FOTO_ALTO, rgb), tipo: "image/png", extension: "png" };
}

/**
 * Una imagen para el hueco `indice` de la reserva `reserva`: Unsplash si se
 * puede, respaldo generado si no.
 */
async function obtenerImagen({ nombre, indice, reserva, glifo, semilla }) {
  const photoId = UNSPLASH_IDS[(reserva + indice) % UNSPLASH_IDS.length];
  const descargada = await descargarUnsplash(photoId);
  if (descargada) return { ...descargada, origen: "unsplash" };
  return { ...generarFotoRespaldo(nombre, glifo, semilla), origen: "respaldo" };
}

/**
 * Rellena la galería de quien sea hasta `persona.fotos`, y devuelve cuántas
 * tiene al terminar.
 *
 * Lee primero `GET /me/photos` y sólo sube el déficit: eso es lo que hace la
 * siembra repetible, y además evita el 400 de `ProfilePhotosService` cuando se
 * pasa del tope de seis fotos por cuenta.
 */
async function completarGaleria(token, persona, contadores) {
  const como = api(token);
  const existentes = await como("GET", "/me/photos");
  let total = existentes.length;
  for (let indice = total; indice < persona.fotos; indice += 1) {
    const imagen = await obtenerImagen({
      nombre: persona.nombre,
      indice,
      reserva: persona.reservaFotos,
      glifo: String(indice + 1),
      semilla: `${persona.clave}#foto${indice}`,
    });
    await subirArchivo(token, "/me/photos", {
      bytes: imagen.bytes,
      tipo: imagen.tipo,
      nombreArchivo: `${persona.clave}-${indice + 1}.${imagen.extension}`,
    });
    if (imagen.origen === "unsplash") contadores.unsplash += 1;
    else contadores.respaldo += 1;
    total += 1;
  }
  return total;
}

/** Sube un binario a un endpoint multipart con el campo `file`, como espera `FileInterceptor('file')`. */
function subirArchivo(token, path, { bytes, tipo, nombreArchivo }) {
  const form = new FormData();
  form.append("file", new Blob([bytes], { type: tipo }), nombreArchivo);
  return request("POST", path, { token, form });
}

// ── El elenco ───────────────────────────────────────────────────────────────
//
// Nueve socios, no ocho: hacen falta tres para los matches, tres para los likes
// pendientes, dos para los «me dieron next» —que siguen apareciendo en la
// baraja, porque el deck sólo excluye lo que decide el propio atleta— y uno más
// para que el atleta tenga a quién descartar sin vaciar la baraja.

const ELENCO = [
  { clave: "valeria", nombre: "Valeria Terceros", genero: "FEMALE", edad: 27, pesoKg: 61.5, estaturaCm: 166, objetivo: "HIPERTROFIA", socialStatus: "OPEN_TO_MEET", fotos: 5, papel: "MATCH" },
  { clave: "mateo", nombre: "Mateo Villarroel", genero: "MALE", edad: 31, pesoKg: 82.0, estaturaCm: 181, objetivo: "FUERZA", socialStatus: "SINGLE", fotos: 4, papel: "MATCH" },
  { clave: "camila", nombre: "Camila Ferrufino", genero: "FEMALE", edad: 24, pesoKg: 57.0, estaturaCm: 162, objetivo: "PERDIDA_GRASA", socialStatus: "OPEN_TO_MEET", fotos: 4, papel: "MATCH" },
  { clave: "sebastian", nombre: "Sebastián Quiroga", genero: "MALE", edad: 29, pesoKg: 77.5, estaturaCm: 176, objetivo: "HIPERTROFIA", socialStatus: "SINGLE", fotos: 4, papel: "LIKE_PENDIENTE" },
  { clave: "daniela", nombre: "Daniela Zambrana", genero: "FEMALE", edad: 34, pesoKg: 64.0, estaturaCm: 170, objetivo: "RESISTENCIA", socialStatus: "IN_RELATIONSHIP", fotos: 3, papel: "LIKE_PENDIENTE" },
  { clave: "ignacio", nombre: "Ignacio Peñaranda", genero: "MALE", edad: 38, pesoKg: 88.0, estaturaCm: 184, objetivo: "SALUD_GENERAL", socialStatus: "IN_RELATIONSHIP", fotos: 3, papel: "LIKE_PENDIENTE" },
  { clave: "lucia", nombre: "Lucía Mendoza", genero: "FEMALE", edad: 22, pesoKg: 55.5, estaturaCm: 159, objetivo: "HIPERTROFIA", socialStatus: "OPEN_TO_MEET", fotos: 4, papel: "NEXT_RECIBIDO" },
  { clave: "rodrigo", nombre: "Rodrigo Antelo", genero: "MALE", edad: 45, pesoKg: 91.0, estaturaCm: 178, objetivo: "REHABILITACION", socialStatus: null, fotos: 3, papel: "NEXT_RECIBIDO" },
  { clave: "andrea", nombre: "Andrea Salvatierra", genero: "FEMALE", edad: 30, pesoKg: 66.0, estaturaCm: 168, objetivo: "FUERZA", socialStatus: "SINGLE", fotos: 4, papel: "NEXT_PROPIO" },
].map((socio) => ({ ...socio, email: `${socio.clave}.social@gymsheet.local` }));

/** Cuántas stories sube cada uno de los que hicieron match, y si el atleta las ve. */
const PLAN_STORIES = [
  { clave: "valeria", cantidad: 2, atletaLasVe: true }, // anillo gris
  { clave: "mateo", cantidad: 2, atletaLasVe: false }, // anillo de color
  { clave: "camila", cantidad: 1, atletaLasVe: false }, // anillo de color
];

/** Quién mira el perfil del atleta y cuántas veces (alguno más de una, para `viewCount` > 1). */
const PLAN_VISTAS = [
  { clave: "valeria", veces: 3 },
  { clave: "mateo", veces: 1 },
  { clave: "camila", veces: 1 },
  { clave: "sebastian", veces: 2 },
  { clave: "daniela", veces: 1 },
  { clave: "lucia", veces: 1 },
];

/**
 * Las cuentas que ya vivían en la base local, del mismo gimnasio y activas.
 *
 * Existen para probar casos de membresía (activa, por vencer, vencida, renovación
 * pendiente, recién creada, onboarding a medias) y **no se les toca nada de eso**:
 * ni conexiones, ni membresías, ni estado. Se les pone sólo lo que la tarjeta de
 * descubrimiento necesita para pintarse —género, perfil físico y fotos— porque
 * la baraja ordena por puntos y, al estar todos sin puntos, desempata por nombre:
 * «Active M.» sale antes que cualquier socio del elenco nuevo, así que la primera
 * carta que se ve al abrir Descubrir era una tarjeta vacía, sin carrusel y sin
 * «Nombre, edad». Eso es justo lo que la pantalla nueva existe para enseñar.
 */
const MOCKS_EXISTENTES = [
  { clave: "active", email: "active.mock@gymsheet.local", nombre: "Active Membership Mock", password: "MockLocal2026!", genero: "FEMALE", edad: 28, pesoKg: 62.0, estaturaCm: 167, objetivo: "HIPERTROFIA", fotos: 5 },
  { clave: "coach", email: "coach.mock@gymsheet.local", nombre: "Coach Mock", password: "MockLocal2026!", genero: "MALE", edad: 36, pesoKg: 84.0, estaturaCm: 180, objetivo: "FUERZA", fotos: 4, rol: "COACH" },
  { clave: "expired", email: "expired.mock@gymsheet.local", nombre: "Expired Membership Mock", password: "MockLocal2026!", genero: "FEMALE", edad: 41, pesoKg: 68.0, estaturaCm: 164, objetivo: "SALUD_GENERAL", fotos: 3 },
  { clave: "expiring", email: "expiring.mock@gymsheet.local", nombre: "Expiring Membership Mock", password: "MockLocal2026!", genero: "MALE", edad: 33, pesoKg: 79.0, estaturaCm: 175, objetivo: "PERDIDA_GRASA", fotos: 4 },
  { clave: "new", email: "new.mock@gymsheet.local", nombre: "New User Mock", password: "MockLocal2026!", genero: "MALE", edad: 23, pesoKg: 72.0, estaturaCm: 177, objetivo: "HIPERTROFIA", fotos: 4 },
  { clave: "onboarding", email: "onboarding.mock@gymsheet.local", nombre: "Incomplete Onboarding Mock", password: "MockLocal2026!", genero: "FEMALE", edad: 26, pesoKg: 59.0, estaturaCm: 161, objetivo: "RESISTENCIA", fotos: 4 },
  { clave: "pending", email: "pending.mock@gymsheet.local", nombre: "Pending Renewal Mock", password: "MockLocal2026!", genero: "MALE", edad: 44, pesoKg: 86.0, estaturaCm: 172, objetivo: "REHABILITACION", fotos: 3 },
  // El administrador del gimnasio también sale en la baraja: el directorio y el
  // deck filtran por gimnasio y por estado, no por rol (`SocialRepository.directory`
  // no mira `usuarios.rol`). Con «GymSheet Administrator» ordenando en quinto
  // lugar por nombre, se cuela en las diez primeras cartas, y sin esto quedaría
  // como la única tarjeta vacía de la captura. Se le toca lo mismo que a los
  // demás: perfil y fotos, nada de permisos ni de membresías.
  { clave: "admin", email: "admin@gymsheet.local", nombre: "GymSheet Administrator", password: "AdminLocal2026!", genero: "MALE", edad: 39, pesoKg: 80.0, estaturaCm: 179, objetivo: "SALUD_GENERAL", fotos: 3, rol: "ADMIN" },
  // `inactive.mock@gymsheet.local` queda fuera a propósito: está INACTIVO y el
  // directorio filtra por `u.estado = 'ACTIVO'`, así que nunca aparece en la
  // baraja y darle fotos sería trabajo que nadie va a ver.
];

// El reparto de imágenes se hace aquí, con todas las listas ya definidas, para
// que ninguna cara se repita entre galerías ni entre stories.
for (const socio of ELENCO) socio.reservaFotos = reservarUnsplash(socio.fotos);
for (const plan of PLAN_STORIES) plan.reservaStories = reservarUnsplash(plan.cantidad);
for (const mock of MOCKS_EXISTENTES) mock.reservaFotos = reservarUnsplash(mock.fotos);
if (cursorUnsplash > UNSPLASH_IDS.length) {
  console.warn(
    `AVISO: se reparten ${cursorUnsplash} imágenes sobre un catálogo de ${UNSPLASH_IDS.length}; ` +
      "algunas caras se repetirán en la baraja. Añade identificadores a UNSPLASH_IDS.",
  );
}

const porPapel = (papel) => ELENCO.filter((socio) => socio.papel === papel);

// ── Siembra ─────────────────────────────────────────────────────────────────

async function main() {
  console.log(`API: ${BASE}\n`);

  const atleta = await login(ATHLETE);
  const asAtleta = api(atleta.token);
  console.log(`atleta: ${atleta.user.nombreCompleto} (${atleta.user.id})`);

  // ── 1. Elenco: alta o reutilización ───────────────────────────────────────
  const sesiones = new Map();
  let altas = 0;
  for (const socio of ELENCO) {
    const sesion = await registrarOEntrar(socio);
    sesiones.set(socio.clave, sesion);
    if (sesion.creado) altas += 1;
    if (sesion.user.id === atleta.user.id) {
      throw new Error(`El socio ${socio.email} es la misma cuenta que el atleta; revisa el elenco.`);
    }
  }
  console.log(`elenco: ${ELENCO.length} socios (${altas} nuevos, ${ELENCO.length - altas} reutilizados)`);

  const sesion = (clave) => {
    const encontrada = sesiones.get(clave);
    if (!encontrada) throw new Error(`falta la sesión del socio ${clave}`);
    return encontrada;
  };
  const idDe = (clave) => sesion(clave).user.id;

  // ── 2. Género, perfil físico y estado social ──────────────────────────────
  // El género ya va en el registro, pero se reafirma con `PATCH /users/me`:
  // una cuenta reutilizada de una ejecución anterior pudo crearse sin él.
  const fotosPorSocio = new Map();
  for (const socio of ELENCO) {
    const como = api(sesion(socio.clave).token);
    await como("PATCH", "/users/me", { body: { genero: socio.genero } });

    // `POST /profile` es un upsert (`upsertMyProfile`), así que repetirlo no
    // duplica nada. Los cuatro campos son obligatorios en el schema: sin `edad`
    // la tarjeta de descubrimiento no podría escribir «Nombre, edad».
    await como("POST", "/profile", {
      body: {
        edad: socio.edad,
        pesoKg: socio.pesoKg,
        estaturaCm: socio.estaturaCm,
        objetivo: socio.objetivo,
      },
    });

    // El schema exige los dos campos juntos, no es un parcial.
    await como("PATCH", "/me/social-status", {
      body: { socialStatus: socio.socialStatus, visible: socio.socialStatus !== null },
    });
  }
  const conEstado = ELENCO.filter((socio) => socio.socialStatus !== null).length;
  console.log(`perfiles completos: ${ELENCO.length} · estado social visible: ${conEstado}`);

  // ── 3. Fotos: hasta 3-5 por socio, para que el carrusel tenga qué pasar ────
  const contadores = { unsplash: 0, respaldo: 0 };
  for (const socio of ELENCO) {
    const total = await completarGaleria(sesion(socio.clave).token, socio, contadores);
    fotosPorSocio.set(socio.clave, total);
    console.log(`   · ${socio.nombre}: ${total} fotos`);
  }

  // ── 3 bis. Los mocks que ya vivían en la base ─────────────────────────────
  // Salen antes que el elenco nuevo en la baraja (mismo empate a puntos, orden
  // alfabético), así que sin esto la primera carta de Descubrir es una tarjeta
  // vacía. Se les pone sólo género, perfil y fotos: ni una conexión, ni una
  // membresía, ni un estado — esos mocks existen para probar otras cosas.
  const mocksEnriquecidos = [];
  const mocksOmitidos = [];
  for (const mock of MOCKS_EXISTENTES) {
    let sesionMock;
    try {
      sesionMock = await login({ email: mock.email, password: mock.password });
    } catch (error) {
      // Que falte un mock no invalida la siembra: es una cuenta preexistente
      // que puede no estar en esta base. Se dice en voz alta y se sigue.
      mocksOmitidos.push(`${mock.email}: no se pudo iniciar sesión (${error.message})`);
      continue;
    }
    try {
      const como = api(sesionMock.token);
      await como("PATCH", "/users/me", { body: { genero: mock.genero } });
      await como("POST", "/profile", {
        body: {
          edad: mock.edad,
          pesoKg: mock.pesoKg,
          estaturaCm: mock.estaturaCm,
          objetivo: mock.objetivo,
        },
      });
      const total = await completarGaleria(sesionMock.token, mock, contadores);
      mocksEnriquecidos.push({ ...mock, total });
      console.log(`   · ${mock.nombre}${mock.rol ? ` [${mock.rol}]` : ""}: ${total} fotos`);
    } catch (error) {
      // `/profile` y `/me/photos` no llevan `@Roles`, así que valen para
      // cualquier rol autenticado; si algún día se restringen, un 403 sale por
      // aquí y sólo se pierde esa cuenta.
      if (error.status !== 401 && error.status !== 403) throw error;
      mocksOmitidos.push(
        `${mock.email}${mock.rol ? ` (rol ${mock.rol})` : ""}: ${error.status} en un endpoint de perfil — ${error.detail}`,
      );
    }
  }
  for (const aviso of mocksOmitidos) console.log(`   · OMITIDO ${aviso}`);

  console.log(
    `fotos subidas en esta ejecución: ${contadores.unsplash} de Unsplash, ${contadores.respaldo} generadas localmente`,
  );

  // ── 4. Tres matches ───────────────────────────────────────────────────────
  // El backend convierte el like mutuo en match dentro de `sendConnection`: si
  // ya existe una solicitud PENDING de la otra punta, la acepta en vez de crear
  // otra fila. El atleta da like primero y el socio responde, así que es la
  // respuesta del socio la que debe traer `matched: true`.
  const yaConectados = new Set(
    (await asAtleta("GET", "/me/connections?status=ACCEPTED")).map((conexion) => conexion.otherUserId),
  );

  for (const socio of porPapel("MATCH")) {
    if (yaConectados.has(idDe(socio.clave))) {
      console.log(`   · match ya existente con ${socio.nombre}`);
      continue;
    }
    // 409 = «ya existe una solicitud pendiente entre ustedes»: es el estado que
    // se quería, no un fallo.
    await swipeTolerante(asAtleta, atleta.user.id, idDe(socio.clave), "LIKE");
    const respuesta = await swipeTolerante(
      api(sesion(socio.clave).token),
      idDe(socio.clave),
      atleta.user.id,
      "LIKE",
    );
    if (respuesta && respuesta.matched !== true) {
      throw new Error(
        `POST /me/discovery/swipes (${socio.nombre} -> atleta) no devolvió matched:true; ` +
          `respondió ${JSON.stringify(respuesta)}. El like mutuo debía convertirse en match.`,
      );
    }
    console.log(`   · match con ${socio.nombre}`);
  }

  const matches = await asAtleta("GET", "/me/connections?status=ACCEPTED");
  const idsMatch = new Set(matches.map((conexion) => conexion.otherUserId));
  for (const socio of porPapel("MATCH")) {
    if (!idsMatch.has(idDe(socio.clave))) {
      throw new Error(
        `GET /me/connections?status=ACCEPTED no incluye a ${socio.nombre} (${idDe(socio.clave)}): ` +
          "el match no llegó a cuajar.",
      );
    }
  }
  console.log(`matches del atleta: ${matches.length}`);

  // ── 5. Stories de los que hicieron match ──────────────────────────────────
  // El feed sólo enseña stories de conexiones aceptadas, así que esto va
  // después de los matches. Se cuenta lo que ya hay en el feed para no
  // duplicar: las stories caducan a las 24h, de modo que al día siguiente la
  // siembra vuelve a llenarlo sola.
  const feedPrevio = await asAtleta("GET", "/me/stories/feed");
  const storiesPorUsuario = new Map(feedPrevio.map((entrada) => [entrada.userId, entrada.stories.length]));

  for (const plan of PLAN_STORIES) {
    const socio = ELENCO.find((candidato) => candidato.clave === plan.clave);
    const token = sesion(plan.clave).token;
    const existentes = storiesPorUsuario.get(idDe(plan.clave)) ?? 0;
    for (let indice = existentes; indice < plan.cantidad; indice += 1) {
      // Las stories tienen su propia reserva de imágenes, aparte de la galería:
      // el medio se guarda por SHA-256 del contenido, así que repetir un
      // binario sería el mismo fichero enseñado dos veces.
      const imagen = await obtenerImagen({
        nombre: socio.nombre,
        indice,
        reserva: plan.reservaStories,
        glifo: "S",
        semilla: `${plan.clave}#story${indice}`,
      });
      await subirArchivo(token, "/me/stories", {
        bytes: imagen.bytes,
        tipo: imagen.tipo,
        nombreArchivo: `story-${plan.clave}-${indice + 1}.${imagen.extension}`,
      });
    }
  }

  // Vistas: unas stories vistas (anillo gris) y otras sin ver (anillo de color).
  const feed = await asAtleta("GET", "/me/stories/feed");
  let storiesVistas = 0;
  let storiesTotales = 0;
  for (const entrada of feed) {
    storiesTotales += entrada.stories.length;
    const plan = PLAN_STORIES.find((candidato) => idDe(candidato.clave) === entrada.userId);
    if (!plan?.atletaLasVe) continue;
    for (const story of entrada.stories) {
      // `recordView` es un findOrCreate: marcar dos veces no molesta.
      await asAtleta("POST", `/me/stories/${story.id}/view`);
      storiesVistas += 1;
    }
  }
  if (storiesTotales === 0) {
    throw new Error("GET /me/stories/feed quedó vacío: las stories no llegaron al feed del atleta.");
  }

  // Se relee el feed: `hasUnviewed` del primer `GET` es anterior a las marcas
  // de arriba, y contar los anillos con ese dato daría una cifra mentirosa en
  // el resumen — justo el número que sirve de evidencia de que hay los dos
  // estados del patrón de Instagram.
  let feedFinal = await asAtleta("GET", "/me/stories/feed");
  let conSinVer = feedFinal.filter((entrada) => entrada.hasUnviewed).length;

  // Si no queda ninguna sin ver, se publica una más y se vuelve a mirar.
  //
  // Es el caso normal de una segunda ejecución: entre una siembra y la
  // siguiente alguien ha abierto la app y ha visto las stories, y una vista no
  // se puede deshacer —no hay endpoint, ni debería haberlo—. Sin esto el
  // script se quedaba sin poder reconstruir el estado que existe para
  // enseñar, y fallaba pidiendo algo que él mismo podía arreglar.
  //
  // La story nueva es de quien el plan marcó como «no las ve el atleta», así
  // que el reparto de anillos vuelve a ser el previsto en vez de uno
  // cualquiera.
  if (conSinVer === 0 && feedFinal.length > 1) {
    const plan = PLAN_STORIES.find((candidato) => !candidato.atletaLasVe);
    const socio = plan ? ELENCO.find((persona) => persona.clave === plan.clave) : undefined;
    if (plan && socio) {
      console.log(`   · todas vistas: se publica una story nueva de ${socio.nombre} para el anillo de color`);
      const token = sesion(plan.clave).token;
      const imagen = await obtenerImagen({
        nombre: socio.nombre,
        indice: Date.now() % 1000,
        reserva: plan.reservaStories,
        glifo: "S",
        semilla: `${plan.clave}#story-refresco-${Date.now()}`,
      });
      await subirArchivo(token, "/me/stories", {
        bytes: imagen.bytes,
        tipo: imagen.tipo,
        nombreArchivo: `story-${plan.clave}-refresco.${imagen.extension}`,
      });
      feedFinal = await asAtleta("GET", "/me/stories/feed");
      conSinVer = feedFinal.filter((entrada) => entrada.hasUnviewed).length;
      storiesTotales = feedFinal.reduce((suma, entrada) => suma + entrada.stories.length, 0);
    }
  }

  console.log(
    `stories en el feed: ${storiesTotales} de ${feedFinal.length} personas ` +
      `(${conSinVer} con anillo de color, ${feedFinal.length - conSinVer} ya vistas)`,
  );
  if (conSinVer === 0 || conSinVer === feedFinal.length) {
    throw new Error(
      `El feed quedó con ${conSinVer} personas sin ver de ${feedFinal.length}: hacían falta las dos ` +
        "cosas a la vez —alguna story sin ver (anillo de color) y alguna ya vista (anillo gris)—.",
    );
  }

  // ── 6. Tres «me dieron like» sin responder ────────────────────────────────
  for (const socio of porPapel("LIKE_PENDIENTE")) {
    await swipeTolerante(api(sesion(socio.clave).token), idDe(socio.clave), atleta.user.id, "LIKE");
  }
  const likesRecibidos = await asAtleta("GET", "/me/interactions/likes-received?limit=50");
  console.log(`likes recibidos pendientes: ${likesRecibidos.length}`);

  // ── 7. Dos «me dieron next» ───────────────────────────────────────────────
  // `createPass` ignora duplicados, así que repetirlo no es un error ni mueve
  // la fecha. Y un next recibido no saca a esa persona de la baraja del
  // atleta: el deck sólo excluye lo que el propio atleta decidió.
  for (const socio of porPapel("NEXT_RECIBIDO")) {
    await swipeTolerante(api(sesion(socio.clave).token), idDe(socio.clave), atleta.user.id, "PASS");
  }
  const nextsRecibidos = await asAtleta("GET", "/me/interactions/passes-received?limit=50");
  console.log(`nexts recibidos: ${nextsRecibidos.length}`);

  // ── 8. Un «le di next» del atleta ─────────────────────────────────────────
  for (const socio of porPapel("NEXT_PROPIO")) {
    await swipeTolerante(asAtleta, atleta.user.id, idDe(socio.clave), "PASS");
  }
  const nextsPropios = await asAtleta("GET", "/me/interactions/passes-sent?limit=50");
  console.log(`nexts propios (devolvibles a la baraja): ${nextsPropios.length}`);

  // ── 9. Vistas de perfil ───────────────────────────────────────────────────
  // `POST /me/profile-views` inserta una fila por visita y la lista las agrupa
  // con `COUNT(*)`: repetir la siembra sube el `viewCount`, que es el efecto
  // buscado, no un duplicado indeseado.
  for (const plan of PLAN_VISTAS) {
    const como = api(sesion(plan.clave).token);
    for (let vez = 0; vez < plan.veces; vez += 1) {
      await como("POST", "/me/profile-views", { body: { viewedUserId: atleta.user.id } });
    }
  }
  const vistas = await asAtleta("GET", "/me/profile-views?limit=50");
  const repetidas = vistas.viewers.filter((visitante) => visitante.viewCount > 1).length;
  console.log(`vistas de perfil: ${vistas.viewers.length} personas (${repetidas} con más de una visita)`);

  // ── 10. Cartas sin decidir ────────────────────────────────────────────────
  const baraja = await asAtleta("GET", "/me/discovery/deck?limit=30");
  const idsBaraja = new Set(baraja.map((carta) => carta.userId));
  const sinDecidirDelElenco = porPapel("NEXT_RECIBIDO").filter((socio) => idsBaraja.has(idDe(socio.clave)));
  if (sinDecidirDelElenco.length < 2) {
    throw new Error(
      `GET /me/discovery/deck devolvió sólo ${sinDecidirDelElenco.length} socios del elenco sin decidir; ` +
        "hacían falta al menos dos para que la baraja no salga vacía.",
    );
  }

  // ── 11. La baraja tiene que poder fotografiarse ───────────────────────────
  // Se miran las diez primeras cartas, que son las que se van a ver en el
  // simulador. Una sola sin fotos o sin edad basta para que la captura enseñe
  // el estado vacío en vez del carrusel y del «Nombre, edad», que es justo lo
  // que la tarjeta nueva existe para enseñar.
  const primeras = await asAtleta("GET", "/me/discovery/deck?limit=10");
  const incompletas = primeras.filter((carta) => carta.photos.length === 0 || carta.age === null);
  if (incompletas.length > 0) {
    throw new Error(
      "GET /me/discovery/deck?limit=10 trae cartas sin fotos o sin edad: " +
        incompletas
          .map((carta) => `${carta.displayName} (fotos=${carta.photos.length}, edad=${carta.age})`)
          .join(", ") +
        ". Añade esas cuentas a MOCKS_EXISTENTES o al elenco.",
    );
  }

  // ── Resumen ───────────────────────────────────────────────────────────────
  const conteos = await asAtleta("GET", "/me/interactions/counts");
  console.log("\n── lo que verá la app con athlete.mock@gymsheet.local ──");
  console.log(`socios del elenco   : ${ELENCO.length}`);
  for (const socio of ELENCO) {
    console.log(
      `  · ${socio.nombre.padEnd(22)} ${String(fotosPorSocio.get(socio.clave)).padStart(2)} fotos` +
        ` · ${socio.edad} años · ${socio.objetivo} · ${socio.papel}`,
    );
  }
  console.log(`mocks preexistentes : ${mocksEnriquecidos.length} con perfil y fotos`);
  for (const mock of mocksEnriquecidos) {
    console.log(
      `  · ${mock.nombre.padEnd(28)} ${String(mock.total).padStart(2)} fotos` +
        ` · ${mock.edad} años · ${mock.objetivo}${mock.rol ? ` · rol ${mock.rol}` : ""}`,
    );
  }
  for (const aviso of mocksOmitidos) console.log(`  · OMITIDO ${aviso}`);
  console.log(`matches             : ${matches.length} (${matches.map((c) => c.otherUserName).join(", ")})`);
  console.log(
    `stories en el feed  : ${storiesTotales} de ${feedFinal.length} personas, ` +
      `${conSinVer} con anillo de color y ${feedFinal.length - conSinVer} con anillo gris`,
  );
  console.log(`stories marcadas    : ${storiesVistas} vistas por el atleta`);
  console.log(`likes pendientes    : ${likesRecibidos.length}  (counts: ${conteos.likesReceived})`);
  console.log(`nexts recibidos     : ${nextsRecibidos.length}  (counts: ${conteos.passesReceived})`);
  console.log(`nexts propios       : ${nextsPropios.length}  (counts: ${conteos.passesSent})`);
  console.log(`vistas de perfil    : ${vistas.viewers.length} personas, ${repetidas} con viewCount > 1`);
  console.log(`baraja sin decidir  : ${baraja.length} cartas (${sinDecidirDelElenco.length} del elenco)`);
  console.log("primeras 10 cartas  :");
  for (const carta of primeras) {
    console.log(
      `  · ${String(carta.displayName).padEnd(18)} edad=${carta.age} fotos=${carta.photos.length}`,
    );
  }
  console.log(
    `imágenes            : ${contadores.unsplash} descargadas de Unsplash, ` +
      `${contadores.respaldo} generadas localmente en esta ejecución`,
  );
}

/**
 * Un swipe que acepta el 409 como resultado válido.
 *
 * Repetir la siembra vuelve a mandar los mismos likes, y entonces el backend
 * responde «Ya están conectados» o «Ya existe una solicitud pendiente»: eso es
 * exactamente el estado que se quería dejar. Cualquier otro error se propaga
 * con su endpoint y su respuesta, como el resto del guion.
 *
 * Devuelve la respuesta del swipe, o `null` si se resolvió con un 409.
 */
async function swipeTolerante(cliente, autorId, targetId, direction) {
  if (autorId === targetId) throw new Error("un socio no puede hacerse swipe a sí mismo");
  try {
    return await cliente("POST", "/me/discovery/swipes", { body: { targetId, direction } });
  } catch (error) {
    if (error.status === 409) return null;
    throw error;
  }
}

main().catch((error) => {
  console.error("FALLO:", error.message);
  process.exit(1);
});
