import type {
  ASConfigStore, ASGroupDetail, BattleBuffStore, CEConfigStore, ExtraData,
  MOCConfigStore, MOCGroupDetail, MoCEvent, MonsterStore,
  PEAKConfigStore, PFConfigStore, PFGroupDetail, PeakGroupDetail, PeakBossConfig, PeakMazeConfig,
} from "@/types";

// These are the fields shared by the API's MOC/PF/AS/PEAK stage records.
// Each mode below still owns its own challenge, buff and cycle-count rules.
type BattleStage = Pick<MoCEvent, "ID" | "Level" | "MonsterList" | "Invasion">;
type SidedChallenge = { EventList1: BattleStage[]; EventList2: BattleStage[] };
type StageSelection = { side: string; stage?: BattleStage };
type BattleFields = Pick<CEConfigStore, "stage_id" | "cycle_count" | "blessings" | "monsters">;

const legacyFloorSides = new Map([
  ["first_half", "firstNode"],
  ["firstHalf", "firstNode"],
  ["second_half", "secondNode"],
  ["secondHalf", "secondNode"],
]);

function selectStage(
  requestedSide: string,
  challenge: SidedChallenge,
  thirdNodeStages?: BattleStage[],
): StageSelection {
  const normalizedSide = legacyFloorSides.get(requestedSide) ?? (requestedSide || "firstNode");
  const nodes = [
    { side: "firstNode", stages: challenge.EventList1 },
    { side: "secondNode", stages: challenge.EventList2 },
    { side: "thirdNode", stages: thirdNodeStages },
  ];
  const availableNodes = nodes.filter(node => node.stages?.length);
  const selectedNode = availableNodes.find(node => node.side === normalizedSide) ?? availableNodes[0];

  return {
    side: selectedNode?.side ?? normalizedSide,
    stage: selectedNode?.stages?.[0],
  };
}

function createBuff(id: number): BattleBuffStore {
  return { id, level: 1 };
}

function createMonsterWave(monsterIds: number[], level: number): MonsterStore[] {
  return monsterIds.map(monster_id => ({ monster_id, level, amount: 1 }));
}

function stageFields(selection: StageSelection, cycleCount: number, buffIds: number[]) {
  const { stage, side } = selection;
  const blessings = buffIds.map(createBuff);
  if (stage?.Invasion) blessings.push(createBuff(stage.Invasion.MazeBuff.ID));

  return {
    floor_side: side,
    stage_id: stage?.ID ?? 0,
    cycle_count: cycleCount,
    blessings,
    monsters: stage?.MonsterList.map(wave => createMonsterWave(Object.values(wave), stage.Level)) ?? [],
  };
}

// Preserve object identity when calculation changes nothing. This keeps the
// store bridge from notifying subscribers or persisting identical results.
function keepUnchangedConfig<T extends BattleFields>(current: T, next: T): T {
  const sameSide = !("floor_side" in current) ||
    ("floor_side" in next && current.floor_side === next.floor_side);
  const sameBuffs = current.blessings.length === next.blessings.length &&
    current.blessings.every((buff, index) => {
      const other = next.blessings[index];
      return buff.id === other.id && buff.level === other.level &&
        buff.dynamic_key?.key === other.dynamic_key?.key &&
        buff.dynamic_key?.value === other.dynamic_key?.value;
    });
  const sameMonsters = current.monsters.length === next.monsters.length &&
    current.monsters.every((wave, waveIndex) => {
      const otherWave = next.monsters[waveIndex];
      return wave.length === otherWave.length && wave.every((monster, index) => {
        const other = otherWave[index];
        return monster.monster_id === other.monster_id &&
          monster.level === other.level && monster.amount === other.amount;
      });
    });

  if (sameSide && sameBuffs && sameMonsters &&
      current.stage_id === next.stage_id && current.cycle_count === next.cycle_count) {
    return current;
  }
  return next;
}

export function deriveMocConfig(config: MOCConfigStore, event?: MOCGroupDetail): MOCConfigStore {
  const challenge = event?.Level.find(level => level.ID === config.challenge_id);
  if (!challenge || !config.event_id || !config.challenge_id) return config;

  const selection = selectStage(config.floor_side, challenge, event?.Tierce?.EventList);
  const buffIds = config.use_turbulence_buff ? challenge.MazeBuff.map(buff => buff.ID) : [];
  const cycleCount = config.use_cycle_count ? challenge.TurnLimit : 0;

  return keepUnchangedConfig(config, {
    ...config,
    ...stageFields(selection, cycleCount, buffIds),
  });
}

export function derivePfConfig(config: PFConfigStore, event?: PFGroupDetail): PFConfigStore {
  const challenge = event?.Level.find(level => level.ID === config.challenge_id);
  if (!challenge || !config.event_id || !config.challenge_id) return config;

  const selection = selectStage(config.floor_side, challenge, event?.Tierce?.EventList);
  const buffIds = challenge.MazeBuff.map(buff => buff.ID);
  if (config.buff_id) buffIds.unshift(config.buff_id);

  return keepUnchangedConfig(config, {
    ...config,
    ...stageFields(selection, challenge.TurnLimit, buffIds),
  });
}

export function deriveAsConfig(config: ASConfigStore, event?: ASGroupDetail): ASConfigStore {
  const challenge = event?.Level.find(level => level.ID === config.challenge_id);
  if (!challenge || !config.event_id || !config.challenge_id) return config;

  const selection = selectStage(config.floor_side, challenge, event?.Tierce?.EventList);
  const buffIds = challenge.MazeBuff.map(buff => buff.ID);
  if (config.buff_id) buffIds.unshift(config.buff_id);

  return keepUnchangedConfig(config, {
    ...config,
    ...stageFields(selection, challenge.TurnLimit, buffIds),
  });
}

export function derivePeakConfig(config: PEAKConfigStore, event?: PeakGroupDetail): PEAKConfigStore {
  if (!event || !config.event_id || !config.challenge_id) return config;
  const floors = [...event.PreLevel, event.BossLevel];
  const selectedFloor = floors.find(floor => floor?.ID === config.challenge_id);
  if (!selectedFloor) return config;

  const isBoss = selectedFloor.ID === event.BossLevel?.ID;
  let challenge: PeakMazeConfig | PeakBossConfig = selectedFloor;
  if (isBoss && config.boss_mode === "Hard" && event.BossConfig) {
    challenge = event.BossConfig;
  }
  const stage = challenge.EventList[0];
  if (!stage) return config;

  const blessings = challenge.MazeBuff.map(buff => createBuff(buff.ID));
  if (isBoss && config.buff_id) blessings.push(createBuff(config.buff_id));
  if (stage.Invasion) blessings.push(createBuff(stage.Invasion.MazeBuff.ID));

  return keepUnchangedConfig(config, {
    ...config,
    // Preserve the current 6-cycle export, using the normal floor's TurnLimit.
    // Hard BossConfig has TurnLimit=2; adopting that is a separate rule change.
    cycle_count: selectedFloor.TurnLimit,
    stage_id: stage.ID,
    blessings,
    monsters: stage.MonsterList.filter(Boolean).map(wave =>
      createMonsterWave(Object.values(wave).filter(Boolean), stage.Level)),
  });
}

export function fillTheoryCraftHP(config: CEConfigStore, extra?: ExtraData): ExtraData | undefined {
  if (!extra?.theory_craft?.mode) return extra;
  const hp = { ...extra.theory_craft.hp };
  let changed = false;

  config.monsters.forEach((wave, waveIndex) => {
    const waveKey = String(waveIndex + 1);
    const values = [...(hp[waveKey] ?? [])];
    if (!hp[waveKey]) changed = true;

    wave.forEach((_, monsterIndex) => {
      if (values[monsterIndex] === undefined) {
        values[monsterIndex] = 0;
        changed = true;
      }
    });
    hp[waveKey] = values;
  });

  if (!changed) return extra;
  return { ...extra, theory_craft: { ...extra.theory_craft, hp } };
}
