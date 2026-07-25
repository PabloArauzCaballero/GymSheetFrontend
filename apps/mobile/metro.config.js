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

module.exports = config;
