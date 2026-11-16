import { createServer } from 'node:http';

const RETCODE = { BAD_BODY: -1, AUTH: -2, INVALID: -3 };

const cors = (res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Access-Control-Allow-Private-Network', 'true');
};

const reply = (res, status, retcode, message, data = null) => {
  cors(res);
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json');
  res.end(JSON.stringify({ retcode, message, data }));
};

const emptyInventory = () => ({
  equipments: new Map(), // uid -> { itemId, rank, equipAvatarID, fromSRTools, protected }
  relics: new Map(), // uid -> { itemId, level, mainAffixID, subAffixes, equipAvatarID, fromSRTools, protected }
  nextId: 1,
});

export const createPlayerState = (overrides = {}) => ({
  username: 'tester',
  password: 'secret',
  online: true,
  avatars: new Map(), // avatarId -> { rank, enhancedId, exRankIds:[], equipmentUid, relicEquipped:Map(slot->uid) }
  inventory: emptyInventory(),
  ...overrides,
});

const stats = (state) => ({
  avatars: [...state.avatars.values()].map((a) => ({
    id: a.id,
    rank: a.rank,
    enhancedId: a.enhancedId,
    exRanks: [...a.exRankIds],
    equipment: a.equipmentUid ? state.inventory.equipments.get(a.equipmentUid)?.itemId ?? 0 : 0,
    relics: [...a.relicEquipped.entries()]
      .filter(([, uid]) => uid)
      .sort(([left], [right]) => left - right)
      .map(([slot, uid]) => {
        const relic = state.inventory.relics.get(uid);
        return { slot, itemId: relic.itemId, level: relic.level, mainAffixID: relic.mainAffixID };
      }),
  })),
});

export function createCollapseServer({ state = createPlayerState(), excel = {} } = {}) {
  const avatarExcel = excel.avatars ?? {};
  const equipmentExcel = excel.equipments ?? new Map();
  const relicExcel = excel.relics ?? new Map();
  const mainAffixes = excel.mainAffixes ?? new Map(); // `${group}:${affixId}` -> { property }
  const subAffixes = excel.subAffixes ?? new Map(); // `${group}:${affixId}` -> { property, stepNum }
  const exRankExcel = excel.exRanks ?? new Map(); // id -> { avatarID }

  const planRelic = (relics, where, errors) => {
    const plan = new Map();
    (relics ?? []).forEach((relic, index) => {
      const at = `${where}: Relics[${index}]`;
      if (!relic) return errors.push(`${at}: null`);

      const entry = relicExcel.get(relic.ItemID);
      if (!entry) return errors.push(`${at}: unknown ItemID ${relic.ItemID}`);

      const slot = relic.ItemID % 10;
      if (slot < 1 || slot > 6 || entry.type !== slot) {
        return errors.push(`${at}: ItemID ${relic.ItemID} does not fit relic slot ${slot}`);
      }
      if (plan.has(slot)) return errors.push(`${at}: slot ${slot} listed twice`);
      plan.set(slot, relic);

      if (relic.Level < 0 || relic.Level > entry.maxLevel) errors.push(`${at}: Level must be 0-${entry.maxLevel}`);

      const main = mainAffixes.get(`${entry.mainAffixGroup}:${relic.MainAffixID}`);
      if (!main) return errors.push(`${at}: MainAffixID ${relic.MainAffixID} does not fit this relic`);

      const subs = relic.SubAffixes ?? [];
      if (subs.length > 4) return errors.push(`${at}: at most 4 SubAffixes`);

      const seen = new Set([main.property]);
      for (const sub of subs) {
        const subEntry = subAffixes.get(`${entry.subAffixGroup}:${sub?.AffixID}`);
        if (!subEntry) {
          errors.push(`${at}: unknown sub AffixID ${sub?.AffixID ?? 'null'}`);
        } else if (seen.has(subEntry.property)) {
          errors.push(`${at}: sub AffixID ${sub.AffixID} repeats the main affix or another sub affix`);
        } else if (sub.Cnt < 1 || sub.Cnt > 6 || sub.Step < 0 || sub.Step > sub.Cnt * subEntry.stepNum) {
          errors.push(`${at}: sub AffixID ${sub.AffixID} needs Cnt 1-6 and Step 0-(Cnt * ${subEntry.stepNum})`);
        }
        seen.add(subEntry.property);
      }
    });
    return plan;
  };

  const buildPlans = (body, errors) => {
    const plans = [];
    const avatarList = body.Avatars;
    if (!Array.isArray(avatarList) || avatarList.length === 0) {
      errors.push('Avatars is empty');
      return plans;
    }

    const seenAvatars = new Set();
    avatarList.forEach((data, index) => {
      if (!data) return errors.push(`Avatars[${index}]: null`);

      const where = `Avatars[${index}] (${data.AvatarID})`;
      const avatarId = Number(data.AvatarID);
      const avatarRow = avatarExcel[avatarId];
      if (!avatarRow) return errors.push(`${where}: unknown AvatarID`);
      if (seenAvatars.has(avatarId)) return errors.push(`${where}: AvatarID listed twice`);
      seenAvatars.add(avatarId);

      const rank = data.Rank ?? null;
      if (rank !== null && (rank < 0 || rank > avatarRow.maxRank)) {
        errors.push(`${where}: Rank must be 0-${avatarRow.maxRank}`);
      }

      const enhancedId = data.EnhancedID ?? null;
      if (enhancedId !== null && enhancedId !== 0) {
        const enhanced = (avatarRow.enhancedIds ?? []).includes(enhancedId);
        if (!enhanced) errors.push(`${where}: avatar has no EnhancedID ${enhancedId}`);
      }

      let equipment = null;
      if (data.EquipmentID !== undefined && data.EquipmentID !== null) {
        const equipmentId = Number(data.EquipmentID);
        const equipmentRank = Number(data.EquipmentRank ?? 1);
        if (equipmentId === 0) equipment = { itemId: 0, rank: 0 };
        else if (!equipmentExcel.has(equipmentId)) errors.push(`${where}: unknown EquipmentID ${equipmentId}`);
        else if (equipmentRank < 1 || equipmentRank > 5) errors.push(`${where}: EquipmentRank must be 1-5`);
        else equipment = { itemId: equipmentId, rank: equipmentRank };
      }

      let relics = null;
      if (data.Relics !== undefined && data.Relics !== null) relics = planRelic(data.Relics, where, errors);

      let exRankIds = null;
      if (data.ExRankIDs !== undefined && data.ExRankIDs !== null) {
        exRankIds = new Set();
        for (const exRankId of data.ExRankIDs) {
          const row = exRankExcel.get(Number(exRankId));
          if (!row || row.avatarID !== avatarId) errors.push(`${where}: avatar has no ExRankID ${exRankId}`);
          else if (exRankIds.has(exRankId)) errors.push(`${where}: ExRankID ${exRankId} listed twice`);
          else exRankIds.add(Number(exRankId));
        }
      }

      plans.push({ avatarId, rank, enhancedId, equipment, relics, exRankIds });
    });

    return plans;
  };

  const apply = (plans) => {
    const errors = [];
    const equipmentPool = new Map();
    const relicPool = new Map();
    const changedAvatars = new Set();
    const touchedAvatars = new Set();
    let created = 0;
    let updated = 0;
    let deleted = 0;

    const poolEquipment = (equipment) => {
      if (!equipment.fromSRTools || equipment.protected) return;
      const queue = equipmentPool.get(equipment.itemId) ?? [];
      queue.push(equipment);
      equipmentPool.set(equipment.itemId, queue);
    };
    const poolRelic = (relic) => {
      if (!relic.fromSRTools || relic.protected) return;
      const queue = relicPool.get(relic.itemId) ?? [];
      queue.push(relic);
      relicPool.set(relic.itemId, queue);
    };
    const removeEquipment = (equipment) => {
      state.inventory.equipments.delete(equipment.uid);
      deleted++;
    };
    const removeRelic = (relic) => {
      state.inventory.relics.delete(relic.uid);
      deleted++;
    };

    for (const equipment of state.inventory.equipments.values()) if (equipment.equipAvatarID === 0) poolEquipment(equipment);
    for (const relic of state.inventory.relics.values()) if (relic.equipAvatarID === 0) poolRelic(relic);

    const avatars = plans.map((plan) => {
      const avatar = state.avatars.get(plan.avatarId) ?? null;
      if (!avatar) {
        errors.push(`Avatar ${plan.avatarId} is not owned`);
        return null;
      }
      if (plan.equipment) {
        const current = avatar.equipmentUid ? state.inventory.equipments.get(avatar.equipmentUid) : null;
        if (!current) {
          avatar.equipmentUid = 0;
        } else if (current.itemId === plan.equipment.itemId && current.rank === plan.equipment.rank) {
        } else if (current.itemId === plan.equipment.itemId && current.fromSRTools) {
          current.rank = plan.equipment.rank;
          touchedAvatars.add(avatar);
          updated++;
        } else {
          current.equipAvatarID = 0;
          avatar.equipmentUid = 0;
          changedAvatars.add(avatar);
          poolEquipment(current);
        }
      }
      if (plan.relics) {
        for (const [slot, uid] of [...avatar.relicEquipped.entries()]) {
          if (!uid) continue;
          const current = state.inventory.relics.get(uid) ?? null;
          const wanted = plan.relics.get(slot) ?? null;
          const same = current && wanted && current.itemId === wanted.ItemID && current.level === wanted.Level
            && current.mainAffixID === wanted.MainAffixID
            && JSON.stringify(current.subAffixes) === JSON.stringify(wanted.SubAffixes ?? []);
          if (same) continue;
          if (current && wanted && current.itemId === wanted.ItemID && current.fromSRTools) {
            current.level = wanted.Level;
            current.mainAffixID = wanted.MainAffixID;
            current.subAffixes = wanted.SubAffixes ?? [];
            touchedAvatars.add(avatar);
            updated++;
            continue;
          }
          avatar.relicEquipped.set(slot, 0);
          changedAvatars.add(avatar);
          if (!current) continue;
          current.equipAvatarID = 0;
          poolRelic(current);
        }
      }
      return avatar;
    });

    plans.forEach((plan, index) => {
      const avatar = avatars[index];
      if (!avatar) return;

      if (plan.equipment && plan.equipment.itemId !== 0) {
        if (!avatar.equipmentUid) {
          const queue = equipmentPool.get(plan.equipment.itemId);
          let equipment = queue?.length ? queue.shift() : null;
          if (equipment) {
            equipment.rank = plan.equipment.rank;
            updated++;
          } else {
            equipment = { uid: state.inventory.nextId++, itemId: plan.equipment.itemId, rank: plan.equipment.rank, equipAvatarID: 0, fromSRTools: true, protected: false };
            state.inventory.equipments.set(equipment.uid, equipment);
            created++;
          }
          equipment.equipAvatarID = avatar.id;
          avatar.equipmentUid = equipment.uid;
          changedAvatars.add(avatar);
        }
      }

      if (plan.relics) {
        for (const [slot, wanted] of plan.relics.entries()) {
          if (avatar.relicEquipped.get(slot)) continue;
          const queue = relicPool.get(wanted.ItemID);
          let relic = queue?.length ? queue.shift() : null;
          if (relic) {
            updated++;
          } else {
            relic = { uid: state.inventory.nextId++, itemId: wanted.ItemID, level: wanted.Level, mainAffixID: wanted.MainAffixID, subAffixes: wanted.SubAffixes ?? [], equipAvatarID: 0, fromSRTools: true, protected: false };
            state.inventory.relics.set(relic.uid, relic);
            created++;
          }
          relic.level = wanted.Level;
          relic.mainAffixID = wanted.MainAffixID;
          relic.subAffixes = wanted.SubAffixes ?? [];
          relic.equipAvatarID = avatar.id;
          avatar.relicEquipped.set(slot, relic.uid);
          changedAvatars.add(avatar);
        }
      }

      if (plan.rank !== null && plan.rank !== avatar.rank) {
        avatar.rank = plan.rank;
        changedAvatars.add(avatar);
      }
      if (plan.enhancedId !== null && plan.enhancedId !== avatar.enhancedId) {
        avatar.enhancedId = plan.enhancedId;
        changedAvatars.add(avatar);
      }
      if (plan.exRankIds) {
        const current = new Set(avatar.exRankIds);
        const same = current.size === plan.exRankIds.size && [...current].every((id) => plan.exRankIds.has(id));
        if (!same) {
          avatar.exRankIds = [...plan.exRankIds];
          changedAvatars.add(avatar);
        }
      }
    });

    for (const queue of equipmentPool.values()) queue.forEach(removeEquipment);
    for (const queue of relicPool.values()) queue.forEach(removeRelic);

    touchedAvatars.forEach((avatar) => changedAvatars.add(avatar));
    return { avatars: changedAvatars.size, created, updated, deleted, errors };
  };

  const server = createServer((req, res) => {
    const url = new URL(req.url, 'http://127.0.0.1');

    if (req.method === 'OPTIONS' && url.pathname === '/query_connection') {
      cors(res);
      res.statusCode = 204;
      return res.end();
    }

    if (req.method !== 'POST' || url.pathname !== '/query_connection') {
      return reply(res, 404, -1, 'Not found');
    }

    let raw = '';
    req.setEncoding('utf8');
    req.on('data', (chunk) => { raw += chunk; });
    req.on('end', () => {
      let body = null;
      try {
        body = JSON.parse(raw);
      } catch {
        return reply(res, 400, RETCODE.BAD_BODY, 'Invalid request body');
      }

      if (!body || !body.Username || body.Username.trim() === '' || body.Password == null) {
        return reply(res, 400, RETCODE.BAD_BODY, 'Invalid request body');
      }
      if (!state.online || body.Username !== state.username || body.Password !== state.password) {
        return reply(res, 401, RETCODE.AUTH, 'Wrong username / password, or the player is not online');
      }

      const errors = [];
      const plans = buildPlans(body, errors);
      if (errors.length > 0) {
        return reply(res, 400, RETCODE.INVALID, 'Invalid avatar data, nothing was changed', { avatars: 0, created: 0, updated: 0, deleted: 0, errors });
      }

      const result = apply(plans);
      const info = { avatars: result.avatars, created: result.created, updated: result.updated, deleted: result.deleted, errors: result.errors };
      return reply(res, 200, 0, result.errors.length === 0 ? 'OK' : 'Partly applied', info);
    });
  });

  return { server, state, snapshot: () => stats(state).avatars };
}
