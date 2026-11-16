import { AvatarDetail, AvatarJson, LightconeJson, MainAffixData, RelicJson, RelicSetDetail, SubAffix, SubAffixData } from "@/types";
import { hoyolabPropertyTypeMap, mappingRelicSlot } from "@/constant/constant";
import { calcPromotion, calcSubAffixRolls } from "./calcData";

export interface ParsedImportData {
    avatars: Record<string, AvatarJson>;
    relics: RelicJson[];
    lightcones: LightconeJson[];
}

interface HoyolabSkill {
    point_id?: number | string;
    level?: number | string;
    remake?: string;
}

interface HoyolabEquip {
    id?: number | string;
    level?: number | string;
    rank?: number | string;
    promotion?: number | string;
}

interface HoyolabRelicProperty {
    property_type: number;
    value: string | number;
}

interface HoyolabRelic {
    id?: number | string;
    level?: number | string;
    main_property?: HoyolabRelicProperty;
    properties?: HoyolabRelicProperty[];
}

interface HoyolabAvatar {
    id: number | string;
    level?: number | string;
    promotion?: number | string;
    rank?: number | string;
    skills?: HoyolabSkill[];
    equip?: HoyolabEquip;
    relics?: HoyolabRelic[];
    ornaments?: HoyolabRelic[];
}

export function findRelicPartInfo(relicId: number, mapRelicSet: Record<string, RelicSetDetail>) {
    const relicIdStr = relicId.toString();
    const setId = parseInt(relicIdStr.slice(1, -1), 10);
    const set = mapRelicSet[setId.toString()];
    if (set && set.Parts) {
        for (const [partType, part] of Object.entries(set.Parts)) {
            if (part?.Data?.[relicIdStr]) {
                const data = part.Data[relicIdStr];
                const rarity = parseInt(data.Rarity.replace("CombatPowerRelicRarity", ""), 10) || 5;
                return {
                    setId,
                    type: partType,
                    rarity,
                    mainAffixGroup: data.MainAffixGroup,
                    subAffixGroup: data.SubAffixGroup,
                };
            }
        }
    }

    const slotChar = relicIdStr.slice(-1);
    const partType = mappingRelicSlot[slotChar] || "HEAD";
    const rarity = parseInt(relicIdStr[0], 10) === 6 ? 5 : parseInt(relicIdStr[0], 10) === 5 ? 4 : 5;
    const slotNum = parseInt(slotChar, 10) || 1;
    return {
        setId,
        type: partType,
        rarity,
        mainAffixGroup: rarity * 10 + slotNum,
        subAffixGroup: rarity,
    };
}

export function parseHoyolabData(
    raw: unknown,
    mapAvatar: Record<string, AvatarDetail>,
    mapRelicSet: Record<string, RelicSetDetail>,
    mainAffix: Record<string, Record<string, MainAffixData>>,
    subAffix: Record<string, Record<string, SubAffixData>>
): ParsedImportData | null {
    let parsed: unknown = raw;
    if (typeof raw === "string") {
        try {
            parsed = JSON.parse(raw);
        } catch {
            return null;
        }
    }

    let avatarList: HoyolabAvatar[] = [];
    if (Array.isArray(parsed)) {
        avatarList = parsed as HoyolabAvatar[];
    } else if (parsed && typeof parsed === "object") {
        const obj = parsed as Record<string, unknown>;
        const dataObj = obj.data as Record<string, unknown> | undefined;
        if (Array.isArray(dataObj?.avatar_list)) {
            avatarList = dataObj.avatar_list as HoyolabAvatar[];
        } else if (Array.isArray(obj.avatar_list)) {
            avatarList = obj.avatar_list as HoyolabAvatar[];
        }
    }

    if (!avatarList || avatarList.length === 0) {
        return null;
    }

    const avatars: Record<string, AvatarJson> = {};
    const relics: RelicJson[] = [];
    const lightcones: LightconeJson[] = [];

    for (const s of avatarList) {
        if (!s || !s.id) continue;
        const avatarId = Number(s.id);
        const avatarMeta = mapAvatar[avatarId.toString()];
        const level = Number(s.level) || 80;
        const promotion = s.promotion !== undefined ? Number(s.promotion) : calcPromotion(level);

        const skills: Record<string, number> = {};
        if (Array.isArray(s.skills)) {
            for (const sk of s.skills) {
                let lvl = Number(sk.level) || 1;
                if (sk.remake === "Basic ATK") {
                    lvl = Math.min(lvl, 6);
                } else if (["Ultimate", "Talent", "Skill"].includes(sk.remake || "")) {
                    lvl = Math.min(lvl, 10);
                } else {
                    lvl = 1;
                }
                if (sk.point_id) {
                    skills[sk.point_id.toString()] = lvl;
                }
            }
        }

        if (avatarMeta?.SkillTrees) {
            Object.values(avatarMeta.SkillTrees).forEach((treeGroup) => {
                const first = Object.values(treeGroup)[0];
                if (first && !skills[first.PointID.toString()]) {
                    skills[first.PointID.toString()] = 1;
                }
            });
        }

        avatars[avatarId.toString()] = {
            avatar_id: avatarId,
            level,
            promotion,
            data: {
                rank: Number(s.rank) || 0,
                skills,
            },
            sp_max: avatarMeta?.SPNeed ? Number(avatarMeta.SPNeed) : 100,
            sp_value: 0,
            techniques: [],
        };

        if (s.equip && s.equip.id) {
            const lcLevel = Number(s.equip.level) || 80;
            lightcones.push({
                item_id: Number(s.equip.id),
                level: lcLevel,
                rank: Number(s.equip.rank) || 1,
                promotion: s.equip.promotion !== undefined ? Number(s.equip.promotion) : calcPromotion(lcLevel),
                equip_avatar: avatarId,
                internal_uid: 0,
            });
        }

        const rawRelics = [...(s.relics || []), ...(s.ornaments || [])];
        for (const rawRelic of rawRelics) {
            if (!rawRelic || !rawRelic.id) continue;
            const relicId = Number(rawRelic.id);
            const relicPartInfo = findRelicPartInfo(relicId, mapRelicSet);
            const mainPropType = rawRelic.main_property?.property_type;
            if (mainPropType === undefined) continue;

            const mainStatProp = hoyolabPropertyTypeMap[mainPropType];
            if (!mainStatProp) continue;

            let mainAffixId: number | undefined;
            const groupData = mainAffix[relicPartInfo.mainAffixGroup.toString()];
            if (groupData) {
                const found = Object.entries(groupData).find(([, affix]) => affix.Property === mainStatProp);
                if (found) mainAffixId = Number(found[0]);
            }
            if (!mainAffixId) {
                for (const grp of Object.values(mainAffix)) {
                    const found = Object.entries(grp).find(([, affix]) => affix.Property === mainStatProp);
                    if (found) {
                        mainAffixId = Number(found[0]);
                        break;
                    }
                }
            }
            if (!mainAffixId) continue;

            const subAffixes: SubAffix[] = [];
            const subGroupData = subAffix[relicPartInfo.subAffixGroup.toString()] || subAffix[relicPartInfo.rarity.toString()];
            const rawProps = rawRelic.properties || [];
            for (const prop of rawProps) {
                const subPropType = prop.property_type;
                const subStatProp = hoyolabPropertyTypeMap[subPropType];
                if (!subStatProp || !subGroupData) continue;

                const found = Object.entries(subGroupData).find(([, affix]) => affix.Property === subStatProp);
                if (!found) continue;

                const subAffixId = Number(found[0]);
                const subData = found[1];
                const rawValStr = String(prop.value || "0");
                const isRatio = rawValStr.includes("%") || subStatProp.includes("Ratio") || subStatProp.includes("Base");
                const { count, step } = calcSubAffixRolls(subData, rawValStr, isRatio);

                subAffixes.push({
                    sub_affix_id: subAffixId,
                    count,
                    step,
                });
            }

            relics.push({
                level: Number(rawRelic.level) || 0,
                relic_id: relicId,
                relic_set_id: relicPartInfo.setId,
                main_affix_id: mainAffixId,
                sub_affixes: subAffixes,
                internal_uid: 0,
                equip_avatar: avatarId,
            });
        }
    }

    return {
        avatars,
        relics,
        lightcones,
    };
}
