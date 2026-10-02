const { AndroidConfig, withAndroidManifest, withDangerousMod, withInfoPlist } = require('expo/config-plugins');
const fs = require('node:fs');
const path = require('node:path');

/**
 * Deja cargar por http plano **sólo** los dominios de `CLEARTEXT_DOMAINS`.
 *
 * El backend de test sirve la API por https, pero su almacén de medios (MinIO)
 * se publica por http —`http://gym-media.<ip>.sslip.io/...`, decisión del
 * propietario para los entornos sin certificado— y las URL de fotos y vídeos
 * que devuelve la API apuntan ahí. Un build instalado bloquea esas cargas por
 * defecto: iOS por App Transport Security y Android 9+ porque prohíbe el tráfico
 * en claro. Expo Go no lo hace, así que el fallo no se ve hasta el build, y se ve
 * como imágenes vacías sin ningún error.
 *
 * Por eso la excepción es por dominio (con sus subdominios) y no global, y sólo
 * existe si el perfil de `eas.json` la declara: un build sin la variable sale
 * con la política estricta de cada plataforma intacta.
 *
 * Ojo en Android: declarar `networkSecurityConfig` sustituye al
 * `usesCleartextTraffic` del manifiesto de debug, que es lo que deja a un
 * development build hablar con Metro por http. No declarar la variable en el
 * perfil `development`.
 */
function domainsFromEnv() {
  return (process.env.CLEARTEXT_DOMAINS ?? '')
    .split(',')
    .map((domain) => domain.trim())
    .filter(Boolean);
}

function withIosExceptions(config, domains) {
  return withInfoPlist(config, (config) => {
    const ats = config.modResults.NSAppTransportSecurity ?? {};
    const exceptions = ats.NSExceptionDomains ?? {};
    for (const domain of domains) {
      exceptions[domain] = {
        NSIncludesSubdomains: true,
        NSExceptionAllowsInsecureHTTPLoads: true,
      };
    }
    config.modResults.NSAppTransportSecurity = { ...ats, NSExceptionDomains: exceptions };
    return config;
  });
}

function withAndroidExceptions(config, domains) {
  config = withDangerousMod(config, [
    'android',
    (config) => {
      const xmlDir = path.join(config.modRequest.platformProjectRoot, 'app/src/main/res/xml');
      fs.mkdirSync(xmlDir, { recursive: true });
      const entries = domains
        .map((domain) => `    <domain includeSubdomains="true">${domain}</domain>`)
        .join('\n');
      fs.writeFileSync(
        path.join(xmlDir, 'network_security_config.xml'),
        `<?xml version="1.0" encoding="utf-8"?>
<network-security-config>
  <domain-config cleartextTrafficPermitted="true">
${entries}
  </domain-config>
</network-security-config>
`,
      );
      return config;
    },
  ]);

  return withAndroidManifest(config, (config) => {
    const application = AndroidConfig.Manifest.getMainApplicationOrThrow(config.modResults);
    application.$['android:networkSecurityConfig'] = '@xml/network_security_config';
    return config;
  });
}

function withCleartextDomains(config) {
  const domains = domainsFromEnv();
  if (domains.length === 0) return config;
  return withAndroidExceptions(withIosExceptions(config, domains), domains);
}

module.exports = withCleartextDomains;
