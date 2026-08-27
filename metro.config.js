// Metro config: adds `.sql` to asset extensions so drizzle-kit migration files
// can be bundled and applied on-device by drizzle-orm/expo-sqlite's migrator.
const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

config.resolver.sourceExts.push('sql');

module.exports = config;
