import { CharacterConfigStore, RelicConfigStore } from "@/src/store/types";
import {
  HOYOLAB_TO_AFFIX_ID,
  HOYOLAB_TO_BODY,
  HOYOLAB_TO_FOOT,
  HOYOLAB_TO_LINK,
  HOYOLAB_TO_SPHERE,
  HOYOLAB_TO_SUB_AFFIX_ID,
  MAIN_AFFIX_MAP,
  SLOT_MAP,
  STAT_TYPE_TO_ID,
  TYPE_TO_GROUP,
} from "./constants";
import { ResponseMihomo } from "../types/response-mihomo.type";
import { ResponseHoyolab } from "../types/response-hoyolab.type";
import { AllRelicsData } from "../../relic/types/all-relics.type";

// MIHOMO
export const mihomoToStoreParser = (mihomoData: ResponseMihomo) => {
  const newRelics: Record<string, RelicConfigStore> = {};
  const newCharacters: Record<number, CharacterConfigStore> = {};

  const characters = mihomoData.characters;

  characters.forEach((char) => {
    const charId = Number(char.id);
    const relicSlots: CharacterConfigStore["relics"] = {
      HEAD: null,
      HAND: null,
      BODY: null,
      FOOT: null,
      NECK: null,
      OBJECT: null,
    };

    char.relics?.forEach((r) => {
      const slotKey = SLOT_MAP[r.type] as keyof CharacterConfigStore["relics"];
      if (!slotKey) return;

      const relicUid = `mihomo-${crypto.randomUUID()}-${r.id}`;
      relicSlots[slotKey] = relicUid;
      const groupID = TYPE_TO_GROUP[r.type];
      const affixName = r.main_affix.type;

      const mainAffixId = MAIN_AFFIX_MAP[groupID]?.[affixName] || 1;

      newRelics[relicUid] = {
        id: relicUid,
        relic_id: Number(r.id),
        relic_set_id: Number(r.set_id),
        type: slotKey,
        level: 15,
        main_affix_id: mainAffixId,
        equipped_by: [charId],

        sub_affixes: r.sub_affix.map((sub) => ({
          sub_affix_id: STAT_TYPE_TO_ID[sub.type] || 0,
          count: sub.count ?? 1,
          step: sub.step ?? 1,
        })),
      };
    });

    newCharacters[charId] = {
      id: charId,
      level: char.level,
      promotion: 6,
      rank: char.rank,
      lightcone: {
        id: char.light_cone?.id ? Number(char.light_cone.id) : null,
        level: char.light_cone?.level || 1,
        promotion: char.light_cone?.promotion || 0,
        rank: char.light_cone?.rank || 1,
      },
      relics: relicSlots,
      sp: 50,
      use_technique: false,
    };
  });

  return { newRelics, newCharacters };
};

// CONFIG.JSON
export const decodeRelicString = (relicStr: string): RelicConfigStore => {
  const parts = relicStr.split(",");

  const relic_id = Number(parts[0]);
  const level = Number(parts[1]);
  const main_affix_id = Number(parts[2]);

  const sub_affixes = parts.slice(4).map((subStr) => {
    const [id, count, step] = subStr.split(":").map(Number);
    return {
      sub_affix_id: id,
      count: count,
      step: step,
    };
  });

  const slotDigit = relic_id % 10;
  const SLOT_ID_MAP: Record<number, string> = {
    1: "HEAD",
    2: "HAND",
    3: "BODY",
    4: "FOOT",
    5: "NECK",
    6: "OBJECT",
  };

  return {
    level,
    main_affix_id,
    relic_id,
    relic_set_id: Math.floor(relic_id / 10) % 1000,
    sub_affixes,
    type: SLOT_ID_MAP[slotDigit] || "HEAD",
  };
};

export const importConfigJsonParser = (jsonData: any) => {
  const newRelics: Record<string, RelicConfigStore> = {};
  const newCharacters: Record<number, CharacterConfigStore> = {};

  jsonData.avatar_config.forEach((char: any) => {
    const charId = char.id;
    const relicSlots: any = {
      HEAD: null,
      HAND: null,
      BODY: null,
      FOOT: null,
      NECK: null,
      OBJECT: null,
    };

    char.relics.forEach((relicStr: string) => {
      const decoded = decodeRelicString(relicStr);
      const relicUid = `exported-${crypto.randomUUID()}-${decoded.relic_id}`;

      relicSlots[decoded.type] = relicUid;
      newRelics[relicUid] = {
        id: relicUid,
        equipped_by: [charId],
        ...decoded,
      };
    });

    newCharacters[charId] = {
      id: charId,
      level: char.level,
      promotion: char.promotion,
      rank: char.rank,
      sp: char.sp,
      lightcone: {
        id: char.lightcone.id,
        level: char.lightcone.level,
        rank: char.lightcone.rank,
        promotion: char.lightcone.promotion,
      },
      relics: relicSlots,
      use_technique: char.use_technique,
    };
  });

  return { newRelics, newCharacters };
};

// HOYOLAB
export const hoyolabToStoreParser = (
  data: ResponseHoyolab,
  relicsData: AllRelicsData,
) => {
  const newRelics: Record<string, RelicConfigStore> = {};
  const newCharacters: Record<number, CharacterConfigStore> = {};

  data.data.avatar_list.forEach((char) => {
    const charId = char.id;
    const characterRelics: CharacterConfigStore["relics"] = {
      HEAD: null,
      HAND: null,
      BODY: null,
      FOOT: null,
      NECK: null,
      OBJECT: null,
    };

    const allRelics = [...(char.relics || []), ...(char.ornaments || [])];

    allRelics.forEach((relic) => {
      const relicData = relicsData[relic.id];

      let mainAffix = 0;
      const mainProperty = relic.main_property.property_type;

      switch (relic.pos) {
        case 3:
          mainAffix = HOYOLAB_TO_BODY[mainProperty];
          break;
        case 4:
          mainAffix = HOYOLAB_TO_FOOT[mainProperty];
          break;
        case 5:
          mainAffix = HOYOLAB_TO_SPHERE[mainProperty];
          break;
        case 6:
          mainAffix = HOYOLAB_TO_LINK[mainProperty];
          break;
        default:
          mainAffix = HOYOLAB_TO_AFFIX_ID[mainProperty];
          break;
      }

      const relicUid = crypto.randomUUID();
      const slot = SLOT_MAP[relic.pos] as keyof CharacterConfigStore["relics"];

      characterRelics[slot] = relicUid;

      const subAffixesItem = relic.properties.map((sub) => {
        return {
          sub_affix_id: HOYOLAB_TO_SUB_AFFIX_ID[sub.property_type],
          count: sub.times || 1,
          step: sub.times || 1,
        };
      });

      newRelics[relicUid] = {
        id: relicUid,
        relic_id: relic.id,
        relic_set_id: Math.floor(relic.id / 10) % 1000,
        level: 15,
        main_affix_id: mainAffix,
        sub_affixes: subAffixesItem,
        type: relicData.type,
        equipped_by: [charId],
      };
    });

    newCharacters[charId] = {
      id: charId,
      level: char.level,
      rank: char.rank,
      promotion: 6,
      lightcone: char.equip
        ? {
            id: char.equip.id,
            level: char.equip.level,
            rank: char.equip.rank,
            promotion: 6,
          }
        : { id: null, level: 80, rank: 1, promotion: 6 },
      relics: characterRelics,
      sp: 50,
      use_technique: false,
    };
  });

  return { newRelics, newCharacters };
};
