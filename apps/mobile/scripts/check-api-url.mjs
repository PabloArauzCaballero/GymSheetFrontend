/**
 * Guardián de compilación: se ejecuta en EAS antes de instalar dependencias
 * (gancho `eas-build-pre-install` de package.json) y aborta el build si la
 * dirección del backend que quedaría incrustada en el APK no sirve.
 *
 * Existe por un fallo que ya ocurrió: el perfil apuntaba a un túnel efímero de
 * Cloudflare. El túnel caducó, el build siguió saliendo verde, y la aplicación
 * instalada fallaba con un error de red genérico que no dice nada sobre su
 * causa real. La dirección se hornea en el binario, así que el único momento en
 * que el error es barato de arreglar es antes de compilar.
 */
const url = process.env.EXPO_PUBLIC_API_URL;
const profile = process.env.EAS_BUILD_PROFILE ?? "desconocido";

function abortar(motivo, comoArreglarlo) {
  console.error(`\n✖ Compilación abortada (perfil «${profile}»): ${motivo}\n`);
  console.error(`  ${comoArreglarlo}\n`);
  process.exit(1);
}

if (!url) {
  abortar(
    "EXPO_PUBLIC_API_URL no está definida.",
    'Ponla en el perfil correspondiente de eas.json (campo "env"). Sin ella la aplicación se cierra al arrancar.',
  );
}

if (/CAMBIAR/iu.test(url)) {
  abortar(
    `EXPO_PUBLIC_API_URL sigue siendo el marcador de posición (${url}).`,
    "Sustitúyela en eas.json por la dirección pública real del backend.",
  );
}

let parsed;
try {
  parsed = new URL(url);
} catch {
  abortar(
    `EXPO_PUBLIC_API_URL no es una dirección válida (${url}).`,
    "Revisa el valor en eas.json.",
  );
}

if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
  abortar(
    `EXPO_PUBLIC_API_URL no usa http ni https (${url}).`,
    "Revisa el valor en eas.json.",
  );
}

// El emulador traduce localhost a 10.0.2.2 (src/config/env.ts), pero eso solo
// vale en una máquina de desarrollo. Un APK compilado en la nube e instalado en
// un teléfono real no alcanza ninguna de las dos.
const localHosts = new Set(["localhost", "127.0.0.1", "10.0.2.2", "::1"]);
if (localHosts.has(parsed.hostname)) {
  abortar(
    `EXPO_PUBLIC_API_URL apunta a la propia máquina (${url}).`,
    "Un teléfono no alcanza el localhost del servidor de compilación. Usa una dirección pública.",
  );
}

// Los túneles de desarrollo caducan. Si ya está caído, este build nace roto.
const efimero =
  /\.(trycloudflare\.com|ngrok(-free)?\.(app|io|dev)|loca\.lt)$/u.test(
    parsed.hostname,
  );

const respuesta = await fetch(new URL("/api/v1/health/live", parsed.origin), {
  signal: AbortSignal.timeout(15_000),
}).catch((error) => ({
  ok: false,
  status: 0,
  motivo: error?.message ?? "sin respuesta",
}));

if (!respuesta.ok) {
  abortar(
    `el backend no responde en ${parsed.origin} (estado ${respuesta.status || "sin conexión"}).`,
    efimero
      ? "Esa dirección es un túnel de desarrollo y ya ha caducado. Levanta uno nuevo y pon la dirección nueva en eas.json antes de volver a compilar."
      : "Comprueba que el backend está publicado y accesible desde internet antes de compilar.",
  );
}

if (efimero) {
  console.warn(
    `\n⚠ ${parsed.origin} es un túnel de desarrollo: esta compilación dejará de funcionar en cuanto se cierre.\n`,
  );
}

console.log(`✔ Backend verificado en ${parsed.origin} (perfil «${profile}»).`);
