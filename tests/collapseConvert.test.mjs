import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { converterToCollapseConnection } from '../src/helper/converterToCollapse.ts';

const sub = (sub_affix_id, count, step) => ({ sub_affix_id, count, step });

const relic = (relic_id, main_affix_id, sub_affixes, level = 15) => ({
  level,
  relic_id,
  relic_set_id: Math.trunc(relic_id / 10) % 1000,
  main_affix_id,
  sub_affixes,
  internal_uid: 0,
  equip_avatar: 1204,
});

const lightcone = (overrides = {}) => ({
  level: 80,
  item_id: 23010,
  rank: 5,
  promotion: 6,
  internal_uid: 0,
  equip_avatar: 1204,
  ...overrides,
});

const avatar = (overrides = {}) => ({
  avatar_id: 1204,
  data: { rank: 6, skills: {}, ex_rank_id_list: [120401] },
  level: 80,
  promotion: 6,
  techniques: [],
  sp_value: 0,
  sp_max: 0,
  enhanced_id: 0,
  ...overrides,
});

const FULL_RELICS = [
  relic(61151, 1, [sub(8, 3, 4), sub(9, 3, 5), sub(5, 2, 2), sub(7, 1, 1)]),
  relic(61152, 1, [sub(8, 2, 3), sub(9, 4, 6), sub(5, 2, 2), sub(7, 1, 0)]),
  relic(61153, 4, [sub(9, 4, 6), sub(5, 2, 3), sub(7, 2, 2), sub(4, 1, 1)]),
  relic(61154, 2, [sub(8, 3, 5), sub(9, 3, 4), sub(7, 2, 2), sub(2, 1, 1)]),
  relic(63065, 7, [sub(8, 3, 4), sub(9, 3, 5), sub(5, 2, 2), sub(7, 1, 1)]),
  relic(63066, 4, [sub(8, 3, 5), sub(9, 3, 4), sub(7, 2, 2), sub(3, 1, 0)]),
];

const freezeSR = (overrides = {}) => ({
  lightcones: [lightcone()],
  relics: FULL_RELICS,
  avatars: { '1204': avatar() },
  battle_config: { battle_type: 'DEFAULT', blessings: [], custom_stats: [], cycle_count: 0, stage_id: 0, path_resonance_id: 0, monsters: [] },
  ...overrides,
});

describe('converterToCollapseConnection', () => {
  it('reproduces the sample body the server owner supplied', () => {
    const body = converterToCollapseConnection(freezeSR(), 'a6herQTNjVBT2', 'lf#Zw6w1Ddev');

    assert.deepEqual(body, {
      Username: 'a6herQTNjVBT2',
      Password: 'lf#Zw6w1Ddev',
      Avatars: [
        {
          AvatarID: 1204,
          Rank: 6,
          EnhancedID: 0,
          EquipmentID: 23010,
          EquipmentRank: 5,
          Relics: [
            { ItemID: 61151, Level: 15, MainAffixID: 1, SubAffixes: [{ AffixID: 8, Cnt: 3, Step: 4 }, { AffixID: 9, Cnt: 3, Step: 5 }, { AffixID: 5, Cnt: 2, Step: 2 }, { AffixID: 7, Cnt: 1, Step: 1 }] },
            { ItemID: 61152, Level: 15, MainAffixID: 1, SubAffixes: [{ AffixID: 8, Cnt: 2, Step: 3 }, { AffixID: 9, Cnt: 4, Step: 6 }, { AffixID: 5, Cnt: 2, Step: 2 }, { AffixID: 7, Cnt: 1, Step: 0 }] },
            { ItemID: 61153, Level: 15, MainAffixID: 4, SubAffixes: [{ AffixID: 9, Cnt: 4, Step: 6 }, { AffixID: 5, Cnt: 2, Step: 3 }, { AffixID: 7, Cnt: 2, Step: 2 }, { AffixID: 4, Cnt: 1, Step: 1 }] },
            { ItemID: 61154, Level: 15, MainAffixID: 2, SubAffixes: [{ AffixID: 8, Cnt: 3, Step: 5 }, { AffixID: 9, Cnt: 3, Step: 4 }, { AffixID: 7, Cnt: 2, Step: 2 }, { AffixID: 2, Cnt: 1, Step: 1 }] },
            { ItemID: 63065, Level: 15, MainAffixID: 7, SubAffixes: [{ AffixID: 8, Cnt: 3, Step: 4 }, { AffixID: 9, Cnt: 3, Step: 5 }, { AffixID: 5, Cnt: 2, Step: 2 }, { AffixID: 7, Cnt: 1, Step: 1 }] },
            { ItemID: 63066, Level: 15, MainAffixID: 4, SubAffixes: [{ AffixID: 8, Cnt: 3, Step: 5 }, { AffixID: 9, Cnt: 3, Step: 4 }, { AffixID: 7, Cnt: 2, Step: 2 }, { AffixID: 3, Cnt: 1, Step: 0 }] },
          ],
          ExRankIDs: [120401],
        },
      ],
    });
  });

  it('sends explicit clears for an empty build, because absent would mean "keep"', () => {
    const body = converterToCollapseConnection(
      freezeSR({ relics: [], lightcones: [], avatars: { '1204': avatar({ data: { rank: 2, skills: {} } }) } }),
      'u',
      'p'
    );

    assert.deepEqual(body.Avatars[0].Relics, [], 'an empty list strips the relics, which mirrors the tool');
    assert.deepEqual(body.Avatars[0].ExRankIDs, [], 'an empty list clears every EX rank');
    assert.equal(body.Avatars[0].EquipmentID, 0, 'zero unequips the light cone');
    assert.equal(body.Avatars[0].EquipmentRank, 1, 'the rank is still inside 1-5');
    assert.equal(body.Avatars[0].Rank, 2);
    assert.equal(body.Avatars[0].EnhancedID, 0);
  });

  it('always sends every field, so the server never keeps stale gear', () => {
    const body = converterToCollapseConnection(
      freezeSR({ avatars: { '1204': avatar({ data: { skills: {} }, enhanced_id: undefined }) } }),
      'u',
      'p'
    );

    assert.deepEqual(Object.keys(body.Avatars[0]).sort(), [
      'AvatarID', 'EnhancedID', 'EquipmentID', 'EquipmentRank', 'ExRankIDs', 'Rank', 'Relics',
    ]);
    assert.equal(body.Avatars[0].Rank, 0, 'a missing rank becomes 0 rather than being dropped');
    assert.equal(body.Avatars[0].EnhancedID, 0, 'a missing enhanced id means the base form');
  });

  it('clamps EquipmentRank into the 1-5 window the server validates', () => {
    const low = converterToCollapseConnection(freezeSR({ lightcones: [lightcone({ rank: 0 })] }), 'u', 'p');
    assert.equal(low.Avatars[0].EquipmentRank, 1, 'rank 0 fails server validation and aborts the push');

    const high = converterToCollapseConnection(freezeSR({ lightcones: [lightcone({ rank: 9 })] }), 'u', 'p');
    assert.equal(high.Avatars[0].EquipmentRank, 5);
  });

  it('clamps relic level and sub affix counters into the accepted ranges', () => {
    const body = converterToCollapseConnection(
      freezeSR({ relics: [relic(61151, 1, [sub(8, 9, 2), sub(9, 0, -3)], 25)] }),
      'u',
      'p'
    );

    assert.equal(body.Avatars[0].Relics[0].Level, 15, 'the server rejects anything above RELIC_MAX_LEVEL');
    assert.deepEqual(body.Avatars[0].Relics[0].SubAffixes, [
      { AffixID: 8, Cnt: 6, Step: 2 },
      { AffixID: 9, Cnt: 1, Step: 0 },
    ]);
  });

  it('keeps at most four sub affixes', () => {
    const body = converterToCollapseConnection(
      freezeSR({ relics: [relic(61151, 1, [sub(8, 1, 0), sub(9, 1, 0), sub(5, 1, 0), sub(7, 1, 0), sub(4, 1, 0)])] }),
      'u',
      'p'
    );

    assert.equal(body.Avatars[0].Relics[0].SubAffixes.length, 4, 'a fifth sub affix aborts the whole push');
  });

  it('drops relics whose ItemID does not resolve to slot 1-6', () => {
    const body = converterToCollapseConnection(
      freezeSR({ relics: [relic(61157, 1, []), relic(61151, 1, [])] }),
      'u',
      'p'
    );

    assert.deepEqual(body.Avatars[0].Relics.map((r) => r.ItemID), [61151]);
  });

  it('keeps one relic per slot, first one wins', () => {
    const body = converterToCollapseConnection(
      freezeSR({ relics: [relic(61151, 1, []), relic(63061, 2, [])] }),
      'u',
      'p'
    );

    assert.deepEqual(body.Avatars[0].Relics.map((r) => r.ItemID), [61151]);
  });

  it('orders relics by slot regardless of payload order', () => {
    const body = converterToCollapseConnection(
      freezeSR({ relics: [relic(63066, 4, []), relic(61151, 1, []), relic(61153, 4, [])] }),
      'u',
      'p'
    );

    assert.deepEqual(body.Avatars[0].Relics.map((r) => r.ItemID), [61151, 61153, 63066]);
  });

  it('respects an explicit avatar selection and dedupes it', () => {
    const data = freezeSR({
      avatars: { '1204': avatar(), '1310': avatar({ avatar_id: 1310, data: { rank: 0, skills: {} } }) },
    });

    const body = converterToCollapseConnection(data, 'u', 'p', [1310, '1204', 1310]);
    assert.deepEqual(body.Avatars.map((a) => a.AvatarID), [1310, 1204], 'a duplicate AvatarID aborts the push');
    assert.equal(body.Avatars[0].EquipmentID, 0);
    assert.equal(body.Avatars[1].EquipmentID, 23010);
  });

  it('ignores unknown avatar keys and unusable ids', () => {
    const data = freezeSR({ avatars: { '999': avatar({ avatar_id: 0 }) } });

    assert.deepEqual(converterToCollapseConnection(data, 'u', 'p').Avatars, []);
    assert.deepEqual(converterToCollapseConnection(data, 'u', 'p', ['404']).Avatars, []);
  });

  it('dedupes EX ranks, which the server rejects when listed twice', () => {
    const body = converterToCollapseConnection(
      freezeSR({ avatars: { '1204': avatar({ data: { rank: 6, skills: {}, ex_rank_id_list: [120401, 120401, 120402] } }) } }),
      'u',
      'p'
    );

    assert.deepEqual(body.Avatars[0].ExRankIDs, [120401, 120402]);
  });

  it('ignores light cones with item_id 0 and leaves the avatar unequipped', () => {
    const body = converterToCollapseConnection(freezeSR({ lightcones: [lightcone({ item_id: 0 })] }), 'u', 'p');
    assert.equal(body.Avatars[0].EquipmentID, 0);
  });
});
