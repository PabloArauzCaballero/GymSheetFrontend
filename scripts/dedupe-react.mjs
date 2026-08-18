import { readdir, readFile, rm } from 'node:fs/promises';
import path from 'node:path';

/**
 * Keeps exactly one React in the hoisted dependency tree.
 *
 * The two apps need different React majors — `apps/web` runs Next 16 (React
 * 19.2), `apps/mobile` runs Expo SDK 53 / react-native 0.79, which is built
 * against React 19.0 and refuses to render against anything else
 * ("Incompatible React versions: react vs react-native-renderer"). Yarn 1 has no
 * per-workspace version pinning: a global `resolutions` entry would force one
 * version on both, and nested (`pkg/dep`) resolutions are ignored.
 *
 * `apps/mobile` is in `nohoist`, so it legitimately keeps its own React 19.0
 * under `apps/mobile/node_modules` — that copy is never touched. What Yarn does
 * additionally is nest a second React 19.0 under root packages shared by both
 * apps (@tanstack/react-query, react-hook-form). Two Reacts inside one render
 * tree make every hook fail with "Cannot read properties of null (reading
 * 'useEffect')", which is exactly how the web test suite breaks.
 *
 * This prunes those stray copies so the hoisted tree resolves the root React.
 * Drop this script once the monorepo moves to a package manager with
 * per-workspace resolutions (Yarn 3+/pnpm) or both apps agree on one React.
 */
const root = process.cwd();
const hoisted = path.join(root, 'node_modules');
const DUPLICATES = ['react', 'react-dom'];
/** Workspaces resolve their own copies on purpose (see `nohoist`). */
const PROTECTED_SCOPE = '@gymsheet';

async function safeReaddir(directory) {
  try {
    return await readdir(directory, { withFileTypes: true });
  } catch {
    return [];
  }
}

/** Every immediate package folder in node_modules, scoped ones included. */
async function packageDirs(directory) {
  const found = [];
  for (const entry of await safeReaddir(directory)) {
    if (!entry.isDirectory() && !entry.isSymbolicLink()) continue;
    if (entry.name === '.bin') continue;
    if (entry.name.startsWith('@')) {
      if (entry.name === PROTECTED_SCOPE) continue;
      for (const scoped of await safeReaddir(path.join(directory, entry.name))) {
        found.push(path.join(directory, entry.name, scoped.name));
      }
    } else {
      found.push(path.join(directory, entry.name));
    }
  }
  return found;
}

async function versionOf(packageDir) {
  try {
    const manifest = JSON.parse(await readFile(path.join(packageDir, 'package.json'), 'utf8'));
    return manifest.version;
  } catch {
    return null;
  }
}

const rootVersions = new Map();
for (const name of DUPLICATES) {
  rootVersions.set(name, await versionOf(path.join(hoisted, name)));
}

const pruned = [];
for (const packageDir of await packageDirs(hoisted)) {
  for (const name of DUPLICATES) {
    const nested = path.join(packageDir, 'node_modules', name);
    const version = await versionOf(nested);
    if (version === null) continue;
    await rm(nested, { recursive: true, force: true });
    pruned.push(
      `${path.relative(root, nested).replaceAll(path.sep, '/')} (${version} → ${rootVersions.get(name) ?? 'raíz'})`,
    );
  }
}

if (pruned.length > 0) {
  console.log(`dedupe-react: se podaron ${pruned.length} copias duplicadas:`);
  for (const entry of pruned) console.log(`  - ${entry}`);
} else {
  console.log('dedupe-react: sin duplicados de React en el árbol hoisted.');
}
