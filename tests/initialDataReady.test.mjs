import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { isInitialDataReady } from '../src/lib/initialDataReady.ts';

function setup() {
  const metadata = Object.fromEntries([
    'BaseType', 'DamageType', 'MainAffix', 'SubAffix', 'SkillConfig',
    'HardLevelConfig', 'EliteConfig',
  ].map(key => [key, {}]));
  const data = { metadata };
  const detail = {};
  for (const [key, field] of [
    ['avatars', 'mapAvatar'],
  ]) {
    data[key] = {};
    detail[field] = data[key];
  }
  for (const [key, value] of Object.entries(metadata)) {
    detail[key[0].toLowerCase() + key.slice(1)] = value;
  }
  return { data, detail, settings: { avatarSelected: { ID: 1001 } } };
}

describe('initial data loading barrier', () => {
  it('unlocks only after every first-screen store is populated', () => {
    const { data, detail, settings } = setup();
    assert.equal(isInitialDataReady(data, detail, settings), true);
    for (const field of Object.keys(detail)) {
      assert.equal(isInitialDataReady(data, { ...detail, [field]: {} }, settings), false, field);
    }
    assert.equal(isInitialDataReady(data, detail, { avatarSelected: null }), false);
    assert.equal(isInitialDataReady({ ...data, metadata: undefined }, detail, settings), false);
  });

  it('does not wait for light cones, relics, battle data, Stage or the changelog', () => {
    const { data, detail, settings } = setup();
    const withBattleStoresEmpty = {
      ...detail, mapLightCone: {}, mapRelicSet: {}, stage: {}, mapMonster: {}, mapPF: {}, mapMoc: {}, mapAS: {}, mapPeak: {},
    };
    assert.equal(isInitialDataReady(data, withBattleStoresEmpty, settings), true);
  });
});
