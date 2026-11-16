import { after, before, describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { createCollapseServer, createPlayerState } from '../scripts/collapseMockServer.mjs';
import { buildConnectUrl } from '../src/helper/connectEndpoint.ts';
import { converterToCollapseConnection } from '../src/helper/converterToCollapse.ts';
import { SendDataToCollapse, ProbeCollapseConnection } from '../src/lib/api/api.ts';

const SUB = (id, cnt, step) => ({ sub_affix_id: id, count: cnt, step });
const RELIC = (id, mainAffix, subs) => ({
  level: 15, relic_id: id, relic_set_id: Math.trunc(id / 10) % 1000, main_affix_id: mainAffix,
  sub_affixes: subs, internal_uid: 0, equip_avatar: 1204,
});

const FULL_RELICS = [
  RELIC(61151, 1, [SUB(8, 3, 4), SUB(9, 3, 5), SUB(5, 2, 2), SUB(7, 1, 1)]),
  RELIC(61152, 1, [SUB(8, 2, 3), SUB(9, 4, 6), SUB(5, 2, 2), SUB(7, 1, 0)]),
  RELIC(61153, 4, [SUB(9, 4, 6), SUB(5, 2, 3), SUB(7, 2, 2), SUB(4, 1, 1)]),
  RELIC(61154, 2, [SUB(8, 3, 5), SUB(9, 3, 4), SUB(7, 2, 2), SUB(2, 1, 1)]),
  RELIC(63065, 7, [SUB(8, 3, 4), SUB(9, 3, 5), SUB(5, 2, 2), SUB(7, 1, 1)]),
  RELIC(63066, 4, [SUB(8, 3, 5), SUB(9, 3, 4), SUB(7, 2, 2), SUB(3, 1, 0)]),
];

const AVATAR = (overrides = {}) => ({
  avatar_id: 1204,
  data: { rank: 6, skills: {}, ex_rank_id_list: [120401] },
  level: 80, promotion: 6, techniques: [], sp_value: 0, sp_max: 0, enhanced_id: 0,
  ...overrides,
});

const freeSR = ({ relics = FULL_RELICS, lightcones, avatars } = {}) => ({
  lightcones: lightcones ?? [{ level: 80, item_id: 23010, rank: 1, promotion: 6, internal_uid: 0, equip_avatar: 1204 }],
  relics,
  avatars: avatars ?? { '1204': AVATAR() },
  battle_config: { battle_type: 'DEFAULT', blessings: [], custom_stats: [], cycle_count: 0, stage_id: 0, path_resonance_id: 0, monsters: [] },
});

const relicRow = (id) => [id, { type: id % 10, maxLevel: 15, mainAffixGroup: 1, subAffixGroup: 1 }];

const EXCEL = {
  avatars: { 1204: { maxRank: 6, enhancedIds: [] }, 1310: { maxRank: 6, enhancedIds: [] } },
  equipments: new Set([23010, 21000]),
  relics: new Map([61151, 61152, 61153, 61154, 63065, 63066].map(relicRow)),
  mainAffixes: new Map([
    ['1:1', { property: 'hp' }], ['1:2', { property: 'atk' }],
    ['1:4', { property: 'def' }], ['1:7', { property: 'spd' }],
  ]),
  subAffixes: new Map([8, 9, 5, 7, 4, 3, 2].map((id) => [`1:${id}`, { property: `p${id}`, stepNum: 3 }])),
  exRanks: new Map([[120401, { avatarID: 1204 }]]),
};

const ownedPlayer = () => {
  const state = createPlayerState();
  state.avatars.set(1204, { id: 1204, rank: 0, enhancedId: 0, exRankIds: [], equipmentUid: 0, relicEquipped: new Map() });
  state.avatars.set(1310, { id: 1310, rank: 0, enhancedId: 0, exRankIds: [], equipmentUid: 0, relicEquipped: new Map() });
  return state;
};

let state, server, endpoint, statsOf;

const push = (options, credentials = { username: 'tester', password: 'secret' }) => {
  const body = converterToCollapseConnection(freeSR(options), credentials.username, credentials.password);
  return SendDataToCollapse(credentials.username, credentials.password, endpoint, body.Avatars);
};

describe('collage /query_connection end to end', () => {
  before(async () => {
    const started = createCollapseServer({ state: ownedPlayer(), excel: EXCEL });
    state = started.state;
    statsOf = started.snapshot;
    server = started.server;
    await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
    endpoint = buildConnectUrl('Collapse', `127.0.0.1:${server.address().port}`);
  });

  after(() => new Promise((resolve) => server.close(resolve)));

  it('answers the CORS preflight the browser sends before the push', async () => {    const response = await fetch(endpoint, {
      method: 'OPTIONS',
      headers: { 'Access-Control-Request-Method': 'POST', 'Access-Control-Request-Headers': 'content-type' },
    });

    assert.equal(response.status, 204);
    assert.equal(response.headers.get('access-control-allow-origin'), '*');
    assert.match(response.headers.get('access-control-allow-methods'), /POST/);
  });

  it('resolves the endpoint from a bare host and creates everything on a first push', async () => {
    assert.equal(endpoint, `http://127.0.0.1:${server.address().port}/query_connection`, 'bare host must get the path');

    const response = await push({});

    assert.equal(response.status, 200, JSON.stringify(response));
    assert.equal(response.message, 'OK');
    assert.deepEqual(response.stats, { avatars: 1, created: 7, updated: 0, deleted: 0 });
    assert.equal(response.warnings, undefined);

    const [avatar] = started_avatar();
    assert.equal(avatar.rank, 6);
    assert.equal(avatar.equipment, 23010);
    assert.deepEqual(avatar.exRanks, [120401]);
    assert.deepEqual(avatar.relics.map((relic) => relic.slot), [1, 2, 3, 4, 5, 6]);
  });

  it('is idempotent: the same push again changes nothing', async () => {
    const response = await push({});

    assert.deepEqual(response.stats, { avatars: 0, created: 0, updated: 0, deleted: 0 });
  });

  it('reuses the worn set instead of duplicating it when stats change', async () => {
    const relics = FULL_RELICS.map((relic) => (relic.relic_id === 61151 ? { ...relic, level: 15, main_affix_id: 1, sub_affixes: [SUB(8, 4, 6), SUB(9, 4, 6)] } : relic));
    const response = await push({ relics });

    assert.equal(response.status, 200);
    assert.deepEqual(response.stats, { avatars: 1, created: 0, updated: 1, deleted: 0 });
    assert.equal(state.inventory.relics.size, 6, 'no duplicate relic may appear');
  });

  it('strips a slot the tool no longer has, and deletes the orphan', async () => {
    const response = await push({ relics: FULL_RELICS.slice(0, 5) });

    assert.deepEqual(response.stats, { avatars: 1, created: 0, updated: 1, deleted: 1 });
    assert.deepEqual(started_avatar()[0].relics.map((relic) => relic.slot), [1, 2, 3, 4, 5]);
  });

  it('honours the empty-list and zero means clear semantics of the Java apply', async () => {
    const response = await push({ relics: [], lightcones: [] });

    assert.equal(response.status, 200);
    assert.deepEqual(response.stats, { avatars: 1, created: 0, updated: 0, deleted: 6 });
    const [avatar] = started_avatar();
    assert.deepEqual(avatar.relics, []);
    assert.equal(avatar.equipment, 0);
    assert.deepEqual(avatar.exRanks, [120401], 'EX ranks were not part of this push and must survive');
  });

  it('leaves no orphan behind when gear moves from one avatar to another', async () => {
    await push({});
    const moved = converterToCollapseConnection(
      freeSR({
        avatars: { '1204': AVATAR(), '1310': AVATAR({ avatar_id: 1310, data: { rank: 0, skills: {} } }) },
      }),
      'tester', 'secret'
    );
    moved.Avatars[0].EquipmentID = 0;
    moved.Avatars[0].Relics = [];
    moved.Avatars[1].EquipmentID = 23010;
    moved.Avatars[1].EquipmentRank = 1;
    moved.Avatars[1].Relics = converterToCollapseConnection(freeSR({}), 'tester', 'secret').Avatars[0].Relics;

    const response = await SendDataToCollapse('tester', 'secret', endpoint, moved.Avatars);
    assert.equal(response.status, 200, JSON.stringify(response));

    const [owner1204, owner1310] = started_avatar();
    assert.equal(owner1204.equipment, 0);
    assert.deepEqual(owner1204.relics, []);
    assert.equal(owner1310.equipment, 23010);
    assert.equal(owner1310.relics.length, 6);
    assert.equal(state.inventory.equipments.size, 1, 'the light cone was handed over, not duplicated');
    assert.equal(state.inventory.relics.size, 6);
  });

  it('reports per-avatar problems as warnings while still applying the rest', async () => {
    state.avatars.delete(1310);
    const body = converterToCollapseConnection(
      freeSR({ avatars: { '1204': AVATAR(), '1310': AVATAR({ avatar_id: 1310, data: { rank: 0, skills: {} } }) } }),
      'tester', 'secret'
    );

    const response = await SendDataToCollapse('tester', 'secret', endpoint, body.Avatars);

    assert.equal(response.status, 200, 'a missing avatar is not a rejected push');
    assert.deepEqual(response.warnings, ['Avatar 1310 is not owned']);
    assert.equal(response.message, 'Partly applied');
  });

  it('refuses a push whose credentials are wrong, without touching the save', async () => {
    const response = await push({}, { username: 'tester', password: 'wrong' });

    assert.equal(response.status, 401);
    assert.equal(response.message, 'Wrong username / password, or the player is not online');
  });

  it('refuses a push while the player is offline', async () => {
    state.online = false;
    try {
      const response = await push({});
      assert.equal(response.status, 401);
    } finally {
      state.online = true;
    }
  });

  it('rejects an invalid entry atomically and returns the reasons', async () => {
    const before = JSON.stringify([...state.inventory.relics.entries()]);
    const body = converterToCollapseConnection(freeSR({}), 'tester', 'secret');
    body.Avatars[0].Rank = 99;

    const response = await SendDataToCollapse('tester', 'secret', endpoint, body.Avatars);

    assert.equal(response.status, 400);
    assert.equal(response.message, 'Invalid avatar data, nothing was changed');
    assert.ok(response.warnings?.[0]?.includes('Rank must be 0-6'), JSON.stringify(response.warnings));
    assert.equal(JSON.stringify([...state.inventory.relics.entries()]), before, 'nothing may be applied');
  });

  it('surfaces the server reason when a relic is not legal', async () => {
    const body = converterToCollapseConnection(freeSR({}), 'tester', 'secret');
    body.Avatars[0].Relics = [{ ItemID: 61151, Level: 15, MainAffixID: 99, SubAffixes: [] }];

    const response = await SendDataToCollapse('tester', 'secret', endpoint, body.Avatars);

    assert.equal(response.status, 400);
    assert.ok(response.warnings?.[0]?.includes('MainAffixID 99 does not fit this relic'), JSON.stringify(response.warnings));
  });

  it('stage 1: proves the connection without touching the save', async () => {
    const before = JSON.stringify(statsOf());

    const response = await ProbeCollapseConnection('tester', 'secret', endpoint);

    assert.equal(response.status, 200, JSON.stringify(response));
    assert.equal(JSON.stringify(statsOf()), before, 'a connect check must never change gear');
  });

  it('stage 1: refuses a probe when the credentials are wrong', async () => {
    const response = await ProbeCollapseConnection('tester', 'wrong', endpoint);

    assert.equal(response.status, 401);
    assert.equal(response.message, 'Wrong username / password, or the player is not online');
  });

  it('stage 1: refuses a probe while the player is offline', async () => {
    state.online = false;
    try {
      const response = await ProbeCollapseConnection('tester', 'secret', endpoint);
      assert.equal(response.status, 401);
    } finally {
      state.online = true;
    }
  });

  it('stage 2: a push after a good probe goes through', async () => {
    assert.equal((await ProbeCollapseConnection('tester', 'secret', endpoint)).status, 200);

    const response = await push({});
    assert.equal(response.status, 200, 'a push after a good probe cannot fail on auth');
  });
});

function started_avatar() {
  return statsOf();
}
