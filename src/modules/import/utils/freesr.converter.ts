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

  // Convert relics (freesr format uses an array of relic objects)
  if (Array.isArray(data.relics)) {
    data.relics.forEach((r: any, idx: number) => {
      const uid = r.uid || r.id || r.instance_id || `freesr_${idx}`;
      const relic_id = r.relic_id || r.item_id || r.id || r.relicId || null;
      const relic_set_id = r.relic_set_id || r.set_id || r.SetID || null;
      const level = r.level ?? r.Level ?? 0;
      const main_affix_id = r.main_affix_id || r.mainAffixId || r.main || 0;

      const sub_affixes: any[] = [];
      const subs = r.sub_affixes || r.subAffixes || r.sub || r.affixes || [];

      if (Array.isArray(subs)) {
        subs.forEach((s: any) => {
          const id =
            s.id ||
            s.sub_affix_id ||
            s.SubAffixID ||
            s.SubAffixId ||
            s.subAffixId ||
            null;

          const count = s.count ?? s.times ?? (s.value ? 1 : 0);
          const step = s.step ?? s.level ?? 0;

          if (id != null) {
            sub_affixes.push({
              sub_affix_id: Number(id),
              count: Number(count || 0),
              step: Number(step || 0),
            });
          }
        });
      }

      let type = r.type || r.Type || "UNKNOWN";

      if ((!type || type === "UNKNOWN") && relic_id) {
        const lookup = relicConfig[String(relic_id)];

        if (lookup?.Type) {
          type = lookup.Type;
        }
      }

      output.relics[String(uid)] = {
        id: String(uid),
        relic_id: Number(relic_id || 0),
        relic_set_id: Number(relic_set_id || 0),
        type,
        level: Number(level || 0),
        main_affix_id: Number(main_affix_id || 0),
        sub_affixes,
        equipped_by: r.equipped_by
          ? Array.isArray(r.equipped_by)
            ? r.equipped_by.map(Number)
            : [Number(r.equipped_by)]
          : [],
      };
    });
  }

  // Convert avatars / characters
  if (data.avatars && typeof data.avatars === "object") {
    Object.entries(data.avatars).forEach(([key, val]) => {
      const a: any = val || {};
      const id = Number(key);

      const level = a.level ?? a.Level ?? 1;
      const promotion = a.promotion ?? a.Promotion ?? 0;
      const rank = a.rank ?? a.Rank ?? 0;

      const lightcone = a.lightcone || a.weapon || {};

      const lc = {
        id: Number(lightcone.id || lightcone.ID || null) || null,
        promotion: Number(lightcone.promotion ?? lightcone.Promotion ?? 0),
        rank: Number(lightcone.rank ?? lightcone.Rank ?? 0),
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

      output.characters[String(id)] = {
        id,
        level: Number(level || 1),
        promotion: Number(promotion || 0),
        rank: Number(rank || 0),
        lightcone: lc,
        relics: relicSlots,
        sp: 0,
        use_technique: false,
      };
    });
  }

  return output;
};

export default convertFreesrToUserStore;

// Convert Freesr data into `config.json`-like structure used by Himeko scripts
export const convertFreesrToConfig = (data: any) => {
  const config: any = {
    avatar_config: [],
    battle_config: data.battle_config || {
      cycle_count: 30,
    },
  };

  const allRelics = Array.isArray(data.relics)
    ? data.relics
    : [];

  const allLightcones =
    data.lightcones ||
    data.light_cones ||
    data.equipment ||
    data.weapons ||
    [];

  const buildRelicString = (r: any) => {
    const relicId = Number(r.relic_id || r.item_id || 0);

    const rarity = Number(
      r.rarity ??
      r.Rarity ??
      15
    );

    const mainAffix = Number(
      r.main_affix_id ??
      r.mainAffixId ??
      r.main ??
      1
    );

    const level = Number(
      r.level ??
      r.Level ??
      0
    );

    const subs =
      r.sub_affixes ||
      r.subAffixes ||
      [];

    const subParts: string[] = [];

    subs.forEach((s: any) => {
      subParts.push(
        `${s.sub_affix_id ?? s.id}:${s.count ?? 0}:${s.step ?? 0}`
      );
    });

    return `${relicId},${rarity},${mainAffix},${level}${
      subParts.length ? "," + subParts.join(",") : ""
    }`;
  };

  Object.entries(data.avatars || {}).forEach(
    ([avatarId, avatarData]: any) => {
      const avatar = avatarData || {};

      const id =
        Number(avatar.avatar_id) ||
        Number(avatarId);

      // หา LC จาก equip_avatar
      const lc =
        allLightcones.find(
          (x: any) =>
            Number(x.equip_avatar) === id
        ) || null;

      // หา relic ทั้ง 6 ชิ้นจาก equip_avatar
      const relics = allRelics
        .filter(
          (r: any) =>
            Number(r.equip_avatar) === id
        )
        .map(buildRelicString);

      config.avatar_config.push({
        name:
          avatar.name ||
          avatar.display_name ||
          `Avatar ${id}`,

        id,

        hp: avatar.hp ?? 100,

        sp: avatar.sp ?? 50,

        level:
          Number(
            avatar.level ??
            80
          ),

        promotion:
          Number(
            avatar.promotion ??
            6
          ),

        rank:
          Number(
            avatar.rank ??
            0
          ),

        lightcone: {
          id: lc
            ? Number(
                lc.item_id ??
                lc.id
              )
            : null,

          rank: lc
            ? Number(
                lc.rank ?? 1
              )
            : 1,

          level: lc
            ? Number(
                lc.level ?? 80
              )
            : 80,

          promotion: lc
            ? Number(
                lc.promotion ?? 6
              )
            : 6,
        },

        relics,

        use_technique:
          Boolean(
            avatar.use_technique
          ),

        buff_id_list:
          avatar.buff_id_list ||
          [],
      });
    }
  );

  return config;
};