import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  getMetadataApi, getAvatarListApi, getLightconeListApi, getRelicSetListApi,
  getMonsterListApi, getASEventListApi, getPFEventListApi, getMOCEventListApi,
  getPeakEventListApi, getChangelog, getStageApi,
} from '../src/lib/api/api.ts';

const fetchers = [getMetadataApi, getAvatarListApi, getLightconeListApi, getRelicSetListApi,
  getMonsterListApi, getASEventListApi, getPFEventListApi, getMOCEventListApi,
  getPeakEventListApi, getChangelog, getStageApi];

async function withFetch(mock, run) {
  const fetch = globalThis.fetch;
  const log = console.error;
  globalThis.fetch = mock;
  console.error = () => {};
  try { await run(); } finally { globalThis.fetch = fetch; console.error = log; }
}

describe('required data API contracts', () => {
  it('propagates network errors so query success cannot unlock an incomplete app', async () => {
    const failure = new Error('intentional network failure');
    await withFetch(async () => { throw failure; }, async () => {
      for (const fetcher of fetchers) await assert.rejects(fetcher(), error => error === failure);
    });
  });

  it('rejects non-2xx responses instead of parsing an error body as data', async () => {
    await withFetch(async () => new Response('{"ok":true}', { status: 500 }), async () => {
      for (const fetcher of fetchers) await assert.rejects(fetcher());
    });
  });

  it('returns successful payloads unchanged (no dropping dependent data)', async () => {
    const payload = { reference: 'full payload' };
    await withFetch(async () => Response.json(payload), async () => {
      for (const fetcher of fetchers) assert.deepEqual(await fetcher(), payload);
    });
  });
});
