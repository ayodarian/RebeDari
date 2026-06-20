const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

const config = getDefaultConfig(__dirname);

const emptyModule = path.resolve(__dirname, 'lib/crypto-empty.js');

config.resolver.extraNodeModules = {
  crypto: emptyModule,
};

module.exports = config;
