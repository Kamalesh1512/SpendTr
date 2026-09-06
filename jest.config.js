/** @type {import('jest').Config} */
module.exports = {
  preset: 'jest-expo',
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
  transformIgnorePatterns: [
    'node_modules/(?!((jest-)?react-native|@react-native(-community)?)|expo(nent)?|@expo(nent)?/.*|@expo-google-fonts/.*|react-navigation|@react-navigation/.*|@sentry/.*|native-base|react-native-svg|react-native-purchases|@testing-library/.*|@noble/.*)',
  ],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
  },
  testMatch: ['<rootDir>/__tests__/**/*.test.ts', '<rootDir>/__tests__/**/*.test.tsx'],
  collectCoverageFrom: [
    'src/services/currency.ts',
    'src/utils/date.ts',
    'src/utils/money.ts',
    'src/repositories/**/*.ts',
    'src/schemas/**/*.ts',
  ],
};
