import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { connectPersistedSchema } from '../src/zod/persistedStore.zod.ts';

// The PS password must not land in localStorage; it lives in sessionStorage so
// it is gone when the tab closes and never written by the persistor.

const memoryStorage = () => {
  const map = new Map();
  return {
    getItem: (key) => (map.has(key) ? map.get(key) : null),
    setItem: (key, value) => void map.set(key, String(value)),
    removeItem: (key) => void map.delete(key),
    clear: () => map.clear(),
    key: (index) => [...map.keys()][index] ?? null,
    get length() {
      return map.size;
    },
  };
};

describe('connect credential storage', () => {
  it('drops the password from the persisted schema', () => {
    const legacy = {
      connectionType: 'March7thHoney',
      privateType: 'Local',
      serverUrl: 'http://localhost:21000',
      username: '100234567',
      password: 'Test1234',
    };

    const parsed = connectPersistedSchema.safeParse(legacy);
    assert.equal(parsed.success, true, 'an older saved payload must still load');
    assert.equal('password' in parsed.data, false, 'the password must not survive parsing');
    assert.equal(parsed.data.username, '100234567', 'the rest of the settings are kept');
  });

  it('stores the password in sessionStorage only', async () => {
    const localStorageMock = memoryStorage();
    const sessionStorageMock = memoryStorage();
    const saved = {
      window: globalThis.window,
      document: globalThis.document,
      localStorage: globalThis.localStorage,
      sessionStorage: globalThis.sessionStorage,
    };

    try {
      globalThis.window = {
        localStorage: localStorageMock,
        sessionStorage: sessionStorageMock,
        addEventListener: () => {},
        removeEventListener: () => {},
      };
      globalThis.document = { addEventListener: () => {}, visibilityState: 'visible' };
      globalThis.localStorage = localStorageMock;
      globalThis.sessionStorage = sessionStorageMock;

      const { default: useConnectStore, readSessionPassword } = await import('../src/stores/connectStore.ts');
      const store = useConnectStore.getState?.() ?? useConnectStore;

      store.setPassword('SecretPass123');

      assert.equal(readSessionPassword(), 'SecretPass123', 'sessionStorage must hold the password');
      assert.equal(sessionStorageMock.getItem('connect-password-session'), 'SecretPass123');

      // The persistor writes with a 250ms debounce.
      await new Promise((resolve) => setTimeout(resolve, 400));

      const persisted = localStorageMock.getItem('connect-storage');
      if (persisted !== null) {
        assert.equal(persisted.includes('SecretPass123'), false, 'localStorage must never contain the password');
        assert.equal(persisted.includes('password'), false, 'localStorage must not even have a password key');
      }

      store.setPassword('');
      assert.equal(readSessionPassword(), '', 'clearing the field clears sessionStorage');
    } finally {
      // Other test files share this process; do not leave a window mock behind.
      globalThis.window = saved.window;
      globalThis.document = saved.document;
      globalThis.localStorage = saved.localStorage;
      globalThis.sessionStorage = saved.sessionStorage;
    }
  });
});
