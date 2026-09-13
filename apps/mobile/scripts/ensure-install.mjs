/**
 * Se ejecuta en EAS antes de que su propio paso automático de `yarn install`
 * arranque (gancho `eas-build-pre-install` de package.json), y hace ese
 * install de una vez, con reintentos.
 *
 * Existe por un bug conocido de Yarn Classic (1.x) en monorepos con muchos
 * workspaces: en máquinas con muchos cores —como las de EAS Build— instalar
 * varios paquetes a la vez puede correr una carrera al crear los symlinks de
 * node_modules entre workspaces, y revienta con
 * "ENOENT: no such file or directory, lstat '.../packages/<paquete>/node_modules'".
 * Confirmado en producción: dos builds seguidos fallaron en la fase
 * "Install dependencies" con ese mismo error — en `packages/domain` la
 * primera vez, en otro paquete distinto la segunda, la firma de una carrera,
 * no de un paquete roto. Comprobado también en local: un segundo intento de
 * `yarn install`, sobre el árbol parcial que dejó el primero, siempre
 * termina bien — los symlinks que faltaban ya no compiten con nada.
 *
 * `network-concurrency 1` en `.yarnrc` no basta por sí solo: la carrera está
 * en la fase de ENLAZADO (symlinks), no en la de red, así que no la toca.
 * Este reintento sí ataca la causa real.
 */
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..', '..');
const maxAttempts = 3;

for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
  console.log(`\n→ yarn install (intento ${attempt}/${maxAttempts}) en ${repoRoot}`);
  const result = spawnSync('yarn', ['install', '--network-timeout', '600000'], {
    cwd: repoRoot,
    stdio: 'inherit',
  });
  if (result.status === 0) {
    console.log(`✔ yarn install terminó bien en el intento ${attempt}.`);
    process.exit(0);
  }
  console.warn(`✖ yarn install falló en el intento ${attempt} (código ${result.status}).`);
}

console.error(`\n✖ yarn install siguió fallando tras ${maxAttempts} intentos. Esto ya no es la`);
console.error('  carrera conocida de symlinks -- revisa el log completo de esta fase.');
process.exit(1);
