/* eslint-disable @typescript-eslint/no-require-imports */
// Test-environment mocks for the Expo/RevenueCat native modules. None of these
// modules can execute under Node, so every one the app touches is stubbed here.
// Repository tests run against a real in-memory better-sqlite3 database injected
// via setDbForTesting() (see __tests__/helpers/testDb.ts), never expo-sqlite.

jest.mock('expo-crypto', () => ({
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  randomUUID: () => require('crypto').randomUUID(),
  CryptoDigestAlgorithm: { SHA256: 'SHA-256' },
  digestStringAsync: async (_algorithm, data) =>
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    require('crypto').createHash('sha256').update(data).digest('hex'),
  getRandomValues: (typedArray) => {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const bytes = require('crypto').randomBytes(typedArray.length);
    typedArray.set(bytes);
    return typedArray;
  },
}));

jest.mock('expo-sqlite', () => ({
  openDatabaseSync: () => {
    throw new Error(
      'expo-sqlite must not be opened in tests — inject a test DB with setDbForTesting().',
    );
  },
}));

jest.mock('expo-localization', () => ({
  getLocales: () => [{ languageTag: 'en-US', currencyCode: 'USD', regionCode: 'US' }],
}));

jest.mock('expo-notifications', () => ({
  AndroidImportance: { DEFAULT: 3 },
  SchedulableTriggerInputTypes: { DATE: 'date' },
  getPermissionsAsync: jest.fn(async () => ({ status: 'granted', granted: true })),
  requestPermissionsAsync: jest.fn(async () => ({ status: 'granted', granted: true })),
  scheduleNotificationAsync: jest.fn(async () => 'notif-id'),
  cancelScheduledNotificationAsync: jest.fn(async () => undefined),
  getAllScheduledNotificationsAsync: jest.fn(async () => []),
  setNotificationHandler: jest.fn(),
  setNotificationChannelAsync: jest.fn(async () => undefined),
  addNotificationResponseReceivedListener: jest.fn(() => ({ remove: jest.fn() })),
  getLastNotificationResponseAsync: jest.fn(async () => null),
}));

jest.mock('expo-local-authentication', () => ({
  hasHardwareAsync: jest.fn(async () => true),
  isEnrolledAsync: jest.fn(async () => true),
  authenticateAsync: jest.fn(async () => ({ success: true })),
}));

jest.mock('expo-print', () => ({
  printToFileAsync: jest.fn(async () => ({ uri: 'file:///tmp/spendtr.pdf' })),
}));

jest.mock('expo-sharing', () => ({
  isAvailableAsync: jest.fn(async () => true),
  shareAsync: jest.fn(async () => undefined),
}));

jest.mock('expo-file-system', () => {
  const store = new Map(); // uri -> content string

  function nameFromArgs(args) {
    const last = args[args.length - 1];
    return typeof last === 'string' ? last : 'file';
  }

  class MockFile {
    constructor(...args) {
      this.name = nameFromArgs(args);
      this.uri = `file:///tmp/${this.name}`;
    }
    get exists() {
      return store.has(this.uri);
    }
    get size() {
      return (store.get(this.uri) ?? '').length;
    }
    create() {
      if (!store.has(this.uri)) store.set(this.uri, '');
    }
    write(content) {
      store.set(this.uri, content);
    }
    delete() {
      store.delete(this.uri);
    }
    async text() {
      return store.get(this.uri) ?? '';
    }
  }

  class MockDirectory {
    constructor() {
      this.uri = 'file:///tmp/';
    }
    get exists() {
      return true;
    }
    create() {}
    list() {
      return Array.from(store.keys()).map((uri) => {
        const f = new MockFile(uri.replace('file:///tmp/', ''));
        return f;
      });
    }
  }

  return {
    Paths: { cache: { uri: 'file:///tmp/' }, document: { uri: 'file:///tmp/' } },
    File: MockFile,
    Directory: MockDirectory,
  };
});

jest.mock('expo-document-picker', () => ({
  getDocumentAsync: jest.fn(async () => ({ canceled: true, assets: null })),
}));

jest.mock('react-native-purchases', () => ({
  __esModule: true,
  LOG_LEVEL: { ERROR: 'ERROR', DEBUG: 'DEBUG' },
  default: {
    configure: jest.fn(),
    setLogLevel: jest.fn(),
    getCustomerInfo: jest.fn(async () => ({ entitlements: { active: {} } })),
    getOfferings: jest.fn(async () => ({ current: null, all: {} })),
    purchasePackage: jest.fn(async () => ({ customerInfo: { entitlements: { active: {} } } })),
    restorePurchases: jest.fn(async () => ({ entitlements: { active: {} } })),
    logIn: jest.fn(async () => ({ customerInfo: { entitlements: { active: {} } }, created: false })),
  },
}));
