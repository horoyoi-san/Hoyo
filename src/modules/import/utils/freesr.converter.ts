import relicConfigRaw from "@/cache/data/RelicConfig.json";

const relicConfig = relicConfigRaw as Record<
  string,
  {
    Type?: string;
    [key: string]: any;
  }
>;

type FreesrData = any;

// Best-effort converter from freesr exported JSON -> UserStore import shape
export const convertFreesrToUserStore = (data: FreesrData) => {
  const output: any = {
    version: 1,
    relics: {},
    characters: {},
  };

  if (!data) return output;

  // Unwrap data root if it is wrapped under a `.data` key
  const source = data.data || data;

  // Support relics list aliases and handle both array & object structure
  const rawRelics = source.relics || source.relic_list || source.relicList || source.relics_list || [];
  const relicsArray = Array.isArray(rawRelics)
    ? rawRelics
    : rawRelics && typeof rawRelics === "object"
    ? Object.values(rawRelics)
    : [];

  // Convert relics
  relicsArray.forEach((r: any, idx: number) => {
    const uid = r.uid || r.id || r.instance_id || r.instanceId || `freesr_${idx}`;
    const relic_id = r.relic_id || r.item_id || r.id || r.relicId || null;
    let relic_set_id = r.relic_set_id || r.set_id || r.SetID || r.setId || r.relicSetId || null;
    if (!relic_set_id && relic_id) {
      relic_set_id = Math.floor(Number(relic_id) / 10) % 1000;
    }
    const level = r.level ?? r.Level ?? 0;
    const main_affix_id = r.main_affix_id || r.mainAffixId || r.main || r.main_affix || r.mainAffix || 0;

    const sub_affixes: any[] = [];
    const subs = r.sub_affixes || r.subAffixes || r.sub || r.affixes || r.sub_affix_list || r.subAffixList || [];

    const processSubAffix = (s: any) => {
      if (!s) return;
      const id =
        s.id ||
        s.sub_affix_id ||
        s.SubAffixID ||
        s.SubAffixId ||
        s.subAffixId ||
        s.affixId ||
        s.affix_id ||
        null;

      const count = s.count ?? s.times ?? s.cnt ?? (s.value ? 1 : 0);
      const step = s.step ?? s.level ?? s.lvl ?? 0;

      if (id != null) {
        sub_affixes.push({
          sub_affix_id: Number(id),
          count: Number(count || 0),
          step: Number(step || 0),
        });
      }
    };

    if (Array.isArray(subs)) {
      subs.forEach(processSubAffix);
    } else if (subs && typeof subs === "object") {
      Object.values(subs).forEach(processSubAffix);
    }

    let type = r.type || r.Type || "UNKNOWN";

    if ((!type || type === "UNKNOWN" || type === "") && relic_id) {
      const lookup = relicConfig[String(relic_id)];

      if (lookup?.Type) {
        type = lookup.Type;
      } else {
        const slotDigit = Number(relic_id) % 10;
        const SLOT_ID_MAP: Record<number, string> = {
          1: "HEAD",
          2: "HAND",
          3: "BODY",
          4: "FOOT",
          5: "NECK",
          6: "OBJECT",
        };
        type = SLOT_ID_MAP[slotDigit] || "UNKNOWN";
      }
    }

    const rawEquip = r.equipped_by || r.equip_avatar || r.EquipAvatar || r.equipAvatar || r.avatarId || r.avatar_id || null;
    let equipped_by: number[] = [];
    if (rawEquip) {
      const arr = Array.isArray(rawEquip) ? rawEquip : [rawEquip];
      equipped_by = arr.map(Number).filter((id) => !isNaN(id) && id > 0);
    }

    output.relics[String(uid)] = {
      id: String(uid),
      relic_id: Number(relic_id || 0),
      relic_set_id: Number(relic_set_id || 0),
      type,
      level: Number(level || 0),
      main_affix_id: Number(main_affix_id || 0),
      sub_affixes,
      equipped_by,
    };
  });

  // Convert avatars / characters
  const rawLightcones = source.lightcones || source.light_cones || source.lightConeList || source.equipment || source.weapons || [];
  const allLightcones = Array.isArray(rawLightcones)
    ? rawLightcones
    : rawLightcones && typeof rawLightcones === "object"
    ? Object.values(rawLightcones)
    : [];

  const avatarsSource = source.avatars || source.avatar_list || source.avatarList || source.characters || {};

  if (avatarsSource && typeof avatarsSource === "object") {
    Object.entries(avatarsSource).forEach(([key, val]) => {
      const a: any = val || {};
      const id = Number(a.avatar_id || a.id || a.avatarId || key);
      if (isNaN(id) || id <= 0) return;

      const level = a.level ?? a.Level ?? 1;

      let promotion = a.promotion ?? a.Promotion ?? null;
      if (promotion == null) {
        if (level >= 75) promotion = 6;
        else if (level >= 70) promotion = 5;
        else if (level >= 60) promotion = 4;
        else if (level >= 50) promotion = 3;
        else if (level >= 40) promotion = 2;
        else if (level >= 30) promotion = 1;
        else promotion = 0;
      }

      const rank = a.rank ?? a.Rank ?? a.eidolon ?? a.eidolons ?? 0;

      const rootLc = allLightcones.find((x: any) => Number(x.equip_avatar || x.EquipAvatar || x.equipAvatar) === id);
      const lightcone = rootLc || a.lightcone || a.light_cone || a.weapon || {};

      const lc = {
        id: Number(lightcone.item_id || lightcone.id || lightcone.ID || null) || null,
        promotion: Number(lightcone.promotion ?? lightcone.Promotion ?? 0),
        rank: Number(lightcone.rank ?? lightcone.Rank ?? lightcone.superimposition ?? lightcone.tier ?? 0),
        level: Number(lightcone.level ?? lightcone.Level ?? 0),
      };

      const relicSlots: any = {
        HEAD: null,
        HAND: null,
        BODY: null,
        FOOT: null,
        NECK: null,
        OBJECT: null,
      };

      Object.entries(output.relics).forEach(([uid, relic]) => {
        const r: any = relic;

        if (
          Array.isArray(r.equipped_by) &&
          r.equipped_by.includes(id)
        ) {
          const t = (r.type || "").toUpperCase();

          if (
            ["HEAD", "HAND", "BODY", "FOOT", "NECK", "OBJECT"].includes(t)
          ) {
            relicSlots[t] = uid;
          }
        }
      });

      // Handle character relics mapping property if present
      if (a.relics && typeof a.relics === "object" && !Array.isArray(a.relics)) {
        Object.entries(a.relics).forEach(([slot, val]) => {
          const slotUpper = slot.toUpperCase();
          if (["HEAD", "HAND", "BODY", "FOOT", "NECK", "OBJECT"].includes(slotUpper) && val) {
            const foundRelicEntry = Object.entries(output.relics).find(([uid, r]: any) => {
              return uid === String(val) || String(r.relic_id) === String(val);
            });
            if (foundRelicEntry) {
              relicSlots[slotUpper] = foundRelicEntry[0]; // standard UID key
              const r: any = foundRelicEntry[1];
              if (!r.equipped_by.includes(id)) {
                r.equipped_by.push(id);
              }
            }
          }
        });
      }

      let skills = a.skills || a.data?.skills || {};
      if (Array.isArray(skills)) {
        const skillsObj: Record<string, number> = {};
        skills.forEach((s: any) => {
          const sId = s.skill_id || s.id || s.skillId;
          if (sId != null) {
            skillsObj[String(sId)] = Number(s.level ?? s.Level ?? s.lvl ?? 1);
          }
        });
        skills = skillsObj;
      }

      output.characters[String(id)] = {
        id,
        level: Number(level || 1),
        promotion: Number(promotion || 0),
        rank: Number(rank || 0),
        lightcone: lc,
        relics: relicSlots,
        sp: Number(a.sp ?? a.energy ?? 50),
        use_technique: Boolean(a.use_technique),
        skills,
      };
    });
  }

  return output;
};

export default convertFreesrToUserStore;

// Convert Freesr data into `config.json`-like structure used by Himeko scripts
export const convertFreesrToConfig = (data: any) => {
  if (!data) return { avatar_config: [], battle_config: { cycle_count: 30 } };

  // Unwrap data root if it is wrapped under a `.data` key
  const source = data.data || data;

  const config: any = {
    avatar_config: [],
    battle_config: source.battle_config || {
      cycle_count: 30,
    },
  };

  const rawRelics = source.relics || source.relic_list || source.relicList || source.relics_list || [];
  const allRelics = Array.isArray(rawRelics)
    ? rawRelics
    : rawRelics && typeof rawRelics === "object"
    ? Object.values(rawRelics)
    : [];

  const rawLightcones = source.lightcones || source.light_cones || source.lightConeList || source.equipment || source.weapons || [];
  const allLightcones = Array.isArray(rawLightcones)
    ? rawLightcones
    : rawLightcones && typeof rawLightcones === "object"
    ? Object.values(rawLightcones)
    : [];

  const buildRelicString = (r: any) => {
    const relicId = Number(r.relic_id || r.item_id || r.id || r.relicId || 0);

    const rarity = Number(
      r.rarity ??
      r.Rarity ??
      15
    );

    const mainAffix = Number(
      r.main_affix_id ??
      r.mainAffixId ??
      r.main ??
      r.main_affix ??
      r.mainAffix ??
      1
    );

    const level = Number(
      r.level ??
      r.Level ??
      0
    );

    const sub_affixes: any[] = [];
    const subs = r.sub_affixes || r.subAffixes || r.sub || r.affixes || r.sub_affix_list || r.subAffixList || [];

    const processSubAffix = (s: any) => {
      if (!s) return;
      const id =
        s.id ||
        s.sub_affix_id ||
        s.SubAffixID ||
        s.SubAffixId ||
        s.subAffixId ||
        s.affixId ||
        s.affix_id ||
        null;

      const count = s.count ?? s.times ?? s.cnt ?? (s.value ? 1 : 0);
      const step = s.step ?? s.level ?? s.lvl ?? 0;

      if (id != null) {
        sub_affixes.push(`${id}:${count}:${step}`);
      }
    };

    if (Array.isArray(subs)) {
      subs.forEach(processSubAffix);
    } else if (subs && typeof subs === "object") {
      Object.values(subs).forEach(processSubAffix);
    }

    return `${relicId},${rarity},${mainAffix},${level}${
      sub_affixes.length ? "," + sub_affixes.join(",") : ""
    }`;
  };

  const avatarsSource = source.avatars || source.avatar_list || source.avatarList || source.characters || {};

  if (avatarsSource && typeof avatarsSource === "object") {
    Object.entries(avatarsSource).forEach(
      ([avatarId, avatarData]: any) => {
        const avatar = avatarData || {};

        const id = Number(avatar.avatar_id || avatar.id || avatar.avatarId || avatarId);
        if (isNaN(id) || id <= 0) return;

        // หา LC จาก equip_avatar หรือ direct property
        const lcObj =
          allLightcones.find(
            (x: any) =>
              Number(x.equip_avatar || x.EquipAvatar || x.equipAvatar) === id
          ) || avatar.lightcone || avatar.light_cone || avatar.weapon || null;

        // หา relic ทั้ง 6 ชิ้นจาก equip_avatar
        const relics = allRelics
          .filter((r: any) => {
            const rawEquip = r.equipped_by || r.equip_avatar || r.EquipAvatar || r.equipAvatar || r.avatarId || r.avatar_id || null;
            if (!rawEquip) return false;
            const arr = Array.isArray(rawEquip) ? rawEquip : [rawEquip];
            return arr.map(Number).includes(id);
          })
          .map(buildRelicString);

        // Also check if avatar has relics mapping directly
        if (avatar.relics && typeof avatar.relics === "object" && !Array.isArray(avatar.relics)) {
          Object.values(avatar.relics).forEach((val: any) => {
            if (!val) return;
            const foundRelic = allRelics.find((r: any) => {
              const uid = r.uid || r.id || r.instance_id || r.instanceId;
              return uid === String(val) || String(r.relic_id) === String(val);
            });
            if (foundRelic) {
              const strVal = buildRelicString(foundRelic);
              if (!relics.includes(strVal)) {
                relics.push(strVal);
              }
            }
          });
        }

        const level = Number(avatar.level ?? 80);

        let promotion = avatar.promotion ?? avatar.Promotion ?? null;
        if (promotion == null) {
          if (level >= 75) promotion = 6;
          else if (level >= 70) promotion = 5;
          else if (level >= 60) promotion = 4;
          else if (level >= 50) promotion = 3;
          else if (level >= 40) promotion = 2;
          else if (level >= 30) promotion = 1;
          else promotion = 0;
        }

        const rank = Number(avatar.rank ?? avatar.Rank ?? avatar.eidolon ?? avatar.eidolons ?? 0);

        const lc = {
          id: lcObj
            ? Number(
                lcObj.item_id ??
                lcObj.id ??
                lcObj.ID
              )
            : null,

          rank: lcObj
            ? Number(
                lcObj.rank ??
                lcObj.Rank ??
                lcObj.superimposition ??
                lcObj.tier ??
                1
              )
            : 1,

          level: lcObj
            ? Number(
                lcObj.level ??
                lcObj.Level ??
                80
              )
            : 80,

          promotion: lcObj
            ? Number(
                lcObj.promotion ??
                lcObj.Promotion ??
                6
              )
            : 6,
        };

        let skills = avatar.skills || avatar.data?.skills || {};
        if (Array.isArray(skills)) {
          const skillsObj: Record<string, number> = {};
          skills.forEach((s: any) => {
            const sId = s.skill_id || s.id || s.skillId;
            if (sId != null) {
              skillsObj[String(sId)] = Number(s.level ?? s.Level ?? s.lvl ?? 1);
            }
          });
          skills = skillsObj;
        }

        config.avatar_config.push({
          name:
            avatar.name ||
            avatar.display_name ||
            `Avatar ${id}`,

          id,

          hp: avatar.hp ?? 100,

          sp: avatar.sp ?? avatar.energy ?? 50,

          level,

          promotion: Number(promotion),

          rank,

          lightcone: lc,

          relics,

          use_technique:
            Boolean(
              avatar.use_technique
            ),

          skills,

          buff_id_list:
            avatar.buff_id_list ||
            [],
        });
      }
    );
  }

  return config;
};