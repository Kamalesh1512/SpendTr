module.exports = function (api) {
  api.cache(true);
  return {
    presets: [['babel-preset-expo', { unstable_transformImportMeta: true }]],
    plugins: [
      // Lets migrations.js `import` a raw .sql file as a string
      // (docs/DATABASE_SCHEMA.md migration tooling; drizzle-orm/expo-sqlite
      // quick start). Paired with metro.config.js's sourceExts.push('sql').
      ['inline-import', { extensions: ['.sql'] }],
      'react-native-worklets/plugin',
    ],
  };
};
