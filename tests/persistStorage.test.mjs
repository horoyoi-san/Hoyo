import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { z } from 'zod';
import { createValidatedJSONStorage } from '../src/stores/persistStorage.ts';

const delay = ms => new Promise(resolve => setTimeout(resolve, ms));
const schema = z.object({ count: z.number() });
function setup() {
  const values = new Map();
  const writes = [];
  const storage = createValidatedJSONStorage(() => ({
    getItem: key => values.get(key) ?? null,
    setItem: (key, value) => { writes.push([key, value]); values.set(key, value); },
    removeItem: key => { values.delete(key); },
  }), schema);
  return { storage, values, writes };
}

describe('validated debounced persistence', () => {
  it('reads the latest pending edit before it reaches disk', async () => {
    const { storage, values, writes } = setup();
    values.set('test', JSON.stringify({ state: { count: 1 }, version: 0 }));
    storage.setItem('test', { state: { count: 2 }, version: 0 });
    assert.equal(storage.getItem('test').state.count, 2);
    storage.setItem('test', { state: { count: 3 }, version: 0 });
    assert.equal(writes.length, 0);
    await delay(300);
    assert.equal(writes.length, 1);
    assert.equal(JSON.parse(values.get('test')).state.count, 3);
  });

  it('removing a store cancels pending writes', async () => {
    const { storage, values, writes } = setup();
    storage.setItem('test', { state: { count: 2 } });
    storage.removeItem('test');
    await delay(300);
    assert.equal(storage.getItem('test'), null);
    assert.equal(values.size, 0);
    assert.equal(writes.length, 0);
  });

  it('validates persisted data and removes corrupt JSON/schema', () => {
    const { storage, values } = setup();
    for (const raw of ['{', '{}', '{"state":{"count":"invalid"}}']) {
      values.set('test', raw);
      assert.equal(storage.getItem('test'), null);
      assert.equal(values.has('test'), false);
    }
    values.set('test', '{"state":{"count":5},"version":2}');
    assert.deepEqual(storage.getItem('test'), { state: { count: 5 }, version: 2 });
  });

  it('flushes pending edits on pagehide and when a mobile page is hidden', () => {
    const previousWindow = globalThis.window;
    const previousDocument = globalThis.document;
    globalThis.window = new EventTarget();
    globalThis.document = new EventTarget();
    try {
      const { storage, values, writes } = setup();
      storage.setItem('test', { state: { count: 2 } });
      window.dispatchEvent(new Event('pagehide'));
      assert.equal(JSON.parse(values.get('test')).state.count, 2);
      storage.setItem('test', { state: { count: 3 } });
      document.visibilityState = 'hidden';
      document.dispatchEvent(new Event('visibilitychange'));
      assert.equal(JSON.parse(values.get('test')).state.count, 3);
      window.dispatchEvent(new Event('pagehide'));
      assert.equal(writes.length, 2, 'already flushed edits must not be written again');
    } finally {
      globalThis.window = previousWindow;
      globalThis.document = previousDocument;
    }
  });

  it('retains the latest value if storage quota is exceeded', async () => {
    const storage = createValidatedJSONStorage(() => ({
      getItem: () => null,
      setItem: () => { throw new Error('quota exceeded (expected test)'); },
      removeItem: () => {},
    }), schema);
    storage.setItem('test', { state: { count: 7 } });
    await delay(300);
    assert.equal(storage.getItem('test').state.count, 7);
    storage.removeItem('test');
  });
});
