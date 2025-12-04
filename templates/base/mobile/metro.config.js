const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// Required for BetterAuth package resolution
// Enables package exports which BetterAuth uses for module resolution
config.resolver.unstable_enablePackageExports = true;

module.exports = config;
