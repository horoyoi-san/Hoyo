import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { deriveMocConfig, derivePfConfig, deriveAsConfig, derivePeakConfig, fillTheoryCraftHP } from '../src/helper/battleConfig.ts';
import { startBattleConfigSync } from '../src/lib/battleConfigSync.ts';
import useUserDataStore from '../src/stores/userDataStore.ts';
import useDetailDataStore from '../src/stores/detailDataStore.ts';
import useGlobalStore from '../src/stores/globalStore.ts';

const stage = (id, monster) => ({ ID: id, Level: 95, MonsterList: [[monster]], Invasion: { MazeBuff: { ID: 77 } } });
const event = { ID: 10, Level: [{ ID: 20, TurnLimit: 30, MazeBuff: [{ ID: 55 }], EventList1: [stage(101, 1001)], EventList2: [stage(102, 1002)] }], Tierce: { EventList: [stage(103, 1003)] } };
const config = { event_id: 10, challenge_id: 20, floor_side: 'first_half', buff_id: 88, use_cycle_count: true, use_turbulence_buff: true, blessings: [], monsters: [], stage_id: 0, cycle_count: 0 };

describe('battle calculation independent of modal UI', () => {
  it('preserves MOC/PF/AS waves, buffs, aliases and side fallbacks without mutating inputs', () => {
    const before = JSON.stringify({ event, config });
    for (const [mode, derive] of [['MOC', deriveMocConfig], ['PF', derivePfConfig], ['AS', deriveAsConfig]]) {
      const result = derive(config, event);
      assert.equal(result.stage_id, 101);
      assert.equal(result.floor_side, 'firstNode');
      assert.equal(result.cycle_count, 30);
      assert.deepEqual(result.monsters, [[{ monster_id: 1001, level: 95, amount: 1 }]]);
      assert.deepEqual(result.blessings.map(b => b.id), mode === 'MOC' ? [55, 77] : [88, 55, 77]);
      assert.equal(derive({ ...config, floor_side: 'secondHalf' }, event).stage_id, 102);
      assert.equal(derive({ ...config, floor_side: 'thirdNode' }, event).stage_id, 103);
      assert.equal(derive({ ...config, floor_side: 'invalid' }, event).stage_id, 101);
      assert.equal(derive(config, undefined), config);
    }
    const moc = deriveMocConfig({ ...config, use_cycle_count: false, use_turbulence_buff: false }, event);
    assert.equal(moc.cycle_count, 0);
    assert.deepEqual(moc.blessings, [{ id: 77, level: 1 }]);
    assert.equal(JSON.stringify({ event, config }), before);
  });

  it('preserves PEAK boss normal/hard modes and custom theory-craft HP', () => {
    const peak = { PreLevel: [], BossLevel: { ID: 20, TurnLimit: 6, MazeBuff: [{ ID: 55 }], EventList: [stage(101, 1001)] }, BossConfig: { TurnLimit: 2, MazeBuff: [{ ID: 66 }], EventList: [stage(201, 2001)] } };
    assert.equal(derivePeakConfig({ ...config, boss_mode: 'Normal' }, peak).stage_id, 101);
    const hard = derivePeakConfig({ ...config, boss_mode: 'Hard' }, peak);
    assert.equal(hard.stage_id, 201);
    assert.equal(hard.cycle_count, 6);
    assert.deepEqual(hard.blessings.map(b => b.id), [66, 88, 77]);
    const extra = { theory_craft: { mode: true, hp: { 1: [123] } } };
    const filled = fillTheoryCraftHP({ monsters: [[{}, {}], [{}]] }, extra);
    assert.deepEqual(filled.theory_craft.hp, { 1: [123, 0], 2: [0] });
    assert.deepEqual(extra.theory_craft.hp, { 1: [123] });
    assert.equal(fillTheoryCraftHP({ monsters: [[{}]] }, extra), extra);
  });

  it('keeps unchanged results stable and reads cycle limits from floor data', () => {
    for (const derive of [deriveMocConfig, derivePfConfig, deriveAsConfig]) {
      const calculated = derive(config, event);
      assert.equal(derive(calculated, event), calculated);
      assert.equal(derive({ ...config, challenge_id: 999 }, event).stage_id, 0);
      const withoutStages = { ...event, Tierce: null, Level: [{ ...event.Level[0], EventList1: [], EventList2: [] }] };
      const empty = derive(config, withoutStages);
      assert.equal(empty.stage_id, 0);
      assert.deepEqual(empty.monsters, []);
    }
    const peak = { PreLevel: [], BossLevel: { ID: 20, TurnLimit: 9, MazeBuff: [], EventList: [stage(101, 1001)] }, BossConfig: { TurnLimit: 2, MazeBuff: [], EventList: [stage(201, 2001)] } };
    const calculated = derivePeakConfig({ ...config, boss_mode: 'Hard' }, peak);
    assert.equal(calculated.cycle_count, 9, 'read selected-floor limit, do not hardcode 6 or substitute the hard-stage limit');
    assert.equal(derivePeakConfig(calculated, peak), calculated);
  });

  it('updates an imported config synchronously with the modal never mounted, then unsubscribes', () => {
    const user = useUserDataStore.getState();
    const detail = useDetailDataStore.getState();
    let stop = () => {};
    try {
      useDetailDataStore.setState({ mapMoc: { 10: event } });
      stop = startBattleConfigSync();
      useUserDataStore.setState({ battle_type: 'MOC', moc_config: config });
      assert.equal(useUserDataStore.getState().moc_config.stage_id, 101);
      const derived = useUserDataStore.getState().moc_config;
      useUserDataStore.setState({ avatars: { ...user.avatars } });
      assert.equal(useUserDataStore.getState().moc_config, derived, 'avatar edits do not recalculate battle');
      stop();
      useUserDataStore.setState({ moc_config: config });
      assert.equal(useUserDataStore.getState().moc_config.stage_id, 0);
    } finally {
      stop(); useUserDataStore.setState(user); useDetailDataStore.setState(detail);
    }
  });

  it('routes only the active mode, observes data refreshes and ignores unrelated edits', () => {
    const user = useUserDataStore.getState();
    const detail = useDetailDataStore.getState();
    let stop = () => {};
    try {
      useDetailDataStore.setState({ mapMoc: { 10: event }, mapPF: { 10: event }, mapAS: { 10: event } });
      useUserDataStore.setState({ battle_type: 'MOC', moc_config: config, pf_config: config, as_config: config });
      stop = startBattleConfigSync();
      assert.equal(useUserDataStore.getState().pf_config.stage_id, 0, 'inactive modes must not be modified');
      useUserDataStore.getState().setBattleType('pf');
      assert.equal(useUserDataStore.getState().pf_config.stage_id, 101);
      const derived = useUserDataStore.getState().pf_config;
      useDetailDataStore.setState({ mapMonster: { unrelated: {} } });
      assert.equal(useUserDataStore.getState().pf_config, derived);
      const refreshed = { ...event, Level: [{ ...event.Level[0], EventList1: [stage(999, 9001)] }] };
      useDetailDataStore.setState({ mapPF: { 10: refreshed } });
      assert.equal(useUserDataStore.getState().pf_config.stage_id, 999);
      useUserDataStore.getState().setBattleType('AS');
      assert.equal(useUserDataStore.getState().as_config.stage_id, 101);
      useUserDataStore.getState().setBattleType('UNSUPPORTED');
      useUserDataStore.setState({ as_config: config });
      assert.equal(useUserDataStore.getState().as_config.stage_id, 0);
    } finally {
      stop(); useUserDataStore.setState(user); useDetailDataStore.setState(detail);
    }
  });


  it('initializes PEAK and CE without mounting their modal, preserving existing HP', () => {
    const user = useUserDataStore.getState();
    const detail = useDetailDataStore.getState();
    const global = useGlobalStore.getState();
    let stop = () => {};
    try {
      const peak = { PreLevel: [], BossLevel: { ID: 20, TurnLimit: 6, MazeBuff: [], EventList: [stage(101, 1001)] }, BossConfig: { TurnLimit: 2, MazeBuff: [], EventList: [stage(201, 2001)] } };
      useDetailDataStore.setState({ mapPeak: { 10: peak } });
      useUserDataStore.setState({ battle_type: 'PEAK', peak_config: { ...config, boss_mode: 'Hard' } });
      stop = startBattleConfigSync();
      assert.equal(useUserDataStore.getState().peak_config.stage_id, 201);
      useUserDataStore.setState({ battle_type: 'CE', ce_config: { ...user.ce_config, monsters: [[{}, {}]] } });
      useGlobalStore.setState({ extraData: { theory_craft: { mode: true, hp: { 1: [123] } } } });
      const filled = useGlobalStore.getState().extraData;
      assert.deepEqual(filled.theory_craft.hp, { 1: [123, 0] });
      useGlobalStore.setState({ isConnectPS: !global.isConnectPS });
      assert.equal(useGlobalStore.getState().extraData, filled);
    } finally {
      stop(); useUserDataStore.setState(user); useDetailDataStore.setState(detail); useGlobalStore.setState(global);
    }
  });

});
