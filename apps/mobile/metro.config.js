// Metro config for Expo + monorepo workspaces.
// Ensures React, React Native, and Expo resolve to the mobile app's local
// node_modules instead of the hoisted root copy (which may be a different
// version pulled in by apps/api).
const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

const projectRoot = __dirname;
const monorepoRoot = path.resolve(projectRoot, '../..');

const config = getDefaultConfig(projectRoot);

// 1. Watch the entire monorepo so changes in packages/shared hot-reload
config.watchFolders = [monorepoRoot];

// 2. Tell Metro to look up modules in both the mobile app's node_modules
//    AND the monorepo root's node_modules (for @eru/shared)
config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, 'node_modules'),
  path.resolve(monorepoRoot, 'node_modules'),
];

// 3. Disable hierarchical lookup — always resolve from the paths above
config.resolver.disableHierarchicalLookup = true;

module.exports = config;
