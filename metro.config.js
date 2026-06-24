const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

const config = getDefaultConfig(__dirname);

const emptyModule = path.resolve(__dirname, 'lib/crypto-empty.js');

// Redirect any require('@insforge/shared-schemas') (used internally by
// @insforge/sdk's CJS bundle) to a CJS shim. The real package is ESM-only
// and the SDK's CJS require() throws ERR_PACKAGE_PATH_NOT_EXPORTED, crashing
// the app on launch.
const sharedSchemasShim = path.resolve(__dirname, 'shims/shared-schemas-cjs.js');

config.resolver.extraNodeModules = {
  ...(config.resolver.extraNodeModules || {}),
  crypto: emptyModule,
  '@insforge/shared-schemas': sharedSchemasShim,
};

module.exports = config;
