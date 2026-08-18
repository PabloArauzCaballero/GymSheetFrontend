// Metro configuration tuned for the Yarn monorepo so the mobile app can consume
// the shared `@gymsheet/*` workspace packages (TypeScript source).
const { getDefaultConfig } = require('expo/metro-config');
const path = require('node:path');

const projectRoot = __dirname;
const monorepoRoot = path.resolve(projectRoot, '../..');

const config = getDefaultConfig(projectRoot);

// Watch the whole monorepo so changes in packages/* trigger fast refresh.
config.watchFolders = [monorepoRoot];

// Resolve modules from the app first, then the hoisted root node_modules.
config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, 'node_modules'),
  path.resolve(monorepoRoot, 'node_modules'),
];

// Prevent duplicate React / React Native instances across the workspace.
config.resolver.disableHierarchicalLookup = true;

// Watching the monorepo root also puts the web app's build output under the
// file watcher. Those directories are rewritten and deleted wholesale on every
// Next.js build, and when a watched path vanishes mid-scan Metro dies with
// `ENOENT: watch .../.next/export/_next` — taking the running mobile app down
// with it. Nothing in there is ever imported by the mobile bundle, so it is
// excluded from both watching and resolution.
const IGNORED_PATHS = [
  /\/apps\/web\/\.next\/.*/,
  /\\apps\\web\\\.next\\.*/,
  /\/apps\/web\/click-evidence\/.*/,
  /\\apps\\web\\click-evidence\\.*/,
];

config.resolver.blockList = Array.isArray(config.resolver.blockList)
  ? [...config.resolver.blockList, ...IGNORED_PATHS]
  : [config.resolver.blockList, ...IGNORED_PATHS].filter(Boolean);

module.exports = config;
