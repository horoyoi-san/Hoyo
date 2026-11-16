import { AvatarDetail, AvatarJson, LightconeJson, MainAffixData, RelicJson, RelicSetDetail, SubAffix, SubAffixData } from "@/types";
import { fribbelsPartMap, fribbelsStatMap } from "@/constant/constant";
import { calcPromotion, calcSubAffixRolls } from "./calcData";
import { ParsedImportData } from "./converterHoyolab";

interface FribbelsForm {
    characterLevel?: number | string;
    characterEidolon?: number | string;
    lightCone?: number | string;
    lightConeLevel?: number | string;
    lightConeSuperimposition?: number | string;
}

interface FribbelsBuild {
    name?: string;
    buildName?: string;
    lightCone?: number | string;
    lightConeId?: number | string;
    lightConeLevel?: number | string;
    lightConeSuperimposition?: number | string;
    superimposition?: number | string;
    equipped?: Record<string, string | number> | (string | number)[];
}

interface FribbelsCharacter {
    id?: number | string;
    avatarId?: number | string;
    characterLevel?: number | string;
    level?: number | string;
    characterEidolon?: number | string;
    eidolon?: number | string;
    rank?: number | string;
    lightCone?: number | string;
    equipment?: { tid?: number | string };
    lightConeLevel?: number | string;
    lightConeSuperimposition?: number | string;
    form?: FribbelsForm;
    equipped?: Record<string, string | number> | (string | number)[];
    builds?: FribbelsBuild[];
}

interface FribbelsSubstat {
    stat: string;
    value: number | string;
}

interface FribbelsRelic {
    id?: string | number;
    set?: string;
    part?: string;
    slot?: string;
    grade?: number | string;
    rarity?: number | string;
    enhance?: number | string;
    level?: number | string;
    equippedBy?: number | string;
    equipAvatar?: number | string;
    avatarId?: number | string;
    main?: { stat: string };
    mainStat?: string;
    substats?: FribbelsSubstat[];
    subStats?: FribbelsSubstat[];
}

export interface FribbelsProfileItem {
    id: string;
    name: string;
    avatar_id: number;
    isDefault: boolean;
    lightcone: LightconeJson | null;
    relics: RelicJson[];
}

export interface ParsedFribbelsData extends ParsedImportData {
    characterProfiles: Record<number, FribbelsProfileItem[]>;
}

function resolveRelics(
    equipped: Record<string, string | number> | (string | number)[] | undefined,
    avatarId: number,
    relicByFribbelsId: Map<string, RelicJson>,
    allRelics: RelicJson[]
): RelicJson[] {
    const resolved: RelicJson[] = [];
    if (equipped) {
        const ids = Array.isArray(equipped) ? equipped : Object.values(equipped);
        for (const id of ids) {
            if (id === undefined || id === null || id === "") continue;
            const relic = relicByFribbelsId.get(String(id));
            if (relic) {
                resolved.push({
                    ...relic,
                    equip_avatar: avatarId,
                });
            }
        }
    }
    if (resolved.length === 0) {
        return allRelics
            .filter((r) => r.equip_avatar === avatarId)
            .map((r) => ({ ...r, equip_avatar: avatarId }));
    }
    return resolved;
}

export function parseFribbelsData(
    raw: unknown,
    mapAvatar: Record<string, AvatarDetail>,
    mapRelicSet: Record<string, RelicSetDetail>,
    mainAffix: Record<string, Record<string, MainAffixData>>,
    subAffix: Record<string, Record<string, SubAffixData>>
): ParsedFribbelsData | null {
    let parsed: unknown = raw;
    if (typeof raw === "string") {
        try {
            parsed = JSON.parse(raw);
        } catch {
            return null;
        }
    }

    if (!parsed || typeof parsed !== "object") {
        return null;
    }

    const obj = parsed as Record<string, unknown>;
    const rawCharacters = Array.isArray(obj.characters) ? (obj.characters as FribbelsCharacter[]) : [];
    const rawRelics = Array.isArray(obj.relics) ? (obj.relics as FribbelsRelic[]) : [];

    if (rawCharacters.length === 0 && rawRelics.length === 0) {
        return null;
    }

    const avatars: Record<string, AvatarJson> = {};
    const lightcones: LightconeJson[] = [];
    const relics: RelicJson[] = [];
    const relicByFribbelsId = new Map<string, RelicJson>();

    const setList = Object.values(mapRelicSet);
    const setByName = new Map<string, RelicSetDetail>();
    for (const set of setList) {
        if (set.Name) {
            for (const n of Object.values(set.Name)) {
                if (n) {
                    setByName.set(n.toLowerCase().trim(), set);
                }
            }
        }
    }

    for (const r of rawRelics) {
        if (!r) continue;
        const setNameRaw = (r.set || "").toLowerCase().trim();
        const relicSet = setByName.get(setNameRaw);
        if (!relicSet) continue;

        const rawPart = r.part || r.slot;
        const partType = fribbelsPartMap[rawPart || ""] || (rawPart ? String(rawPart).toUpperCase() : "");
        const partData = relicSet.Parts?.[partType];
        if (!partData?.Data) continue;

        const grade = Number(r.grade || r.rarity || 5);
        const relicItem = Object.values(partData.Data).find(
            (d) => d.Rarity === `CombatPowerRelicRarity${grade}` || d.Rarity.endsWith(grade.toString())
        );
        if (!relicItem) continue;

        const rawMainStat = r.main?.stat || r.mainStat;
        if (!rawMainStat) continue;

        const mainStatProp = fribbelsStatMap[rawMainStat];
        if (!mainStatProp) continue;

        let mainAffixId: number | undefined;
        const groupData = mainAffix[relicItem.MainAffixGroup.toString()];
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
        const subGroupData = subAffix[relicItem.SubAffixGroup.toString()] || subAffix[grade.toString()];
        const rawSubstats = r.substats || r.subStats || [];

        for (const sub of rawSubstats) {
            const subStatProp = fribbelsStatMap[sub.stat];
            if (!subStatProp || !subGroupData) continue;

            const found = Object.entries(subGroupData).find(([, affix]) => affix.Property === subStatProp);
            if (!found) continue;

            const subAffixId = Number(found[0]);
            const subData = found[1];
            const valNum = Number(sub.value);
            if (isNaN(valNum)) continue;

            const isRatio = subStatProp.includes("Ratio") || subStatProp.includes("Base") || String(sub.stat).includes("%");
            const { count, step } = calcSubAffixRolls(subData, valNum, isRatio);

            subAffixes.push({
                sub_affix_id: subAffixId,
                count,
                step,
            });
        }

        const equippedByRaw = r.equippedBy ?? r.equipAvatar;
        const equipAvatar = equippedByRaw !== undefined && equippedByRaw !== null ? Number(equippedByRaw) : 0;

        const parsedRelic: RelicJson = {
            level: Number(r.enhance ?? r.level ?? 0),
            relic_id: relicItem.ID,
            relic_set_id: relicSet.ID,
            main_affix_id: mainAffixId,
            sub_affixes: subAffixes,
            internal_uid: 0,
            equip_avatar: isNaN(equipAvatar) ? 0 : equipAvatar,
        };

        relics.push(parsedRelic);
        if (r.id !== undefined && r.id !== null) {
            relicByFribbelsId.set(String(r.id), parsedRelic);
        }
    }

    // 2. Parse characters and resolve each character's profiles/builds
    // Sort so primary avatar entries (e.g. "1205") precede duplicate b-entries (e.g. "1205b1")
    const sortedCharacters = [...rawCharacters].sort((a, b) => {
        const aId = String(a.id ?? a.avatarId ?? "");
        const bId = String(b.id ?? b.avatarId ?? "");
        const aHasB = aId.includes("b");
        const bHasB = bId.includes("b");
        if (!aHasB && bHasB) return -1;
        if (aHasB && !bHasB) return 1;
        return 0;
    });

    const characterProfiles: Record<number, FribbelsProfileItem[]> = {};

    for (const char of sortedCharacters) {
        const charIdRaw = char.id ?? char.avatarId;
        if (charIdRaw === undefined || charIdRaw === null) continue;
        const rawIdStr = String(charIdRaw).trim();
        const match = rawIdStr.match(/^(\d+)(?:b(\d+))?$/);
        if (!match) continue;
        const avatarId = parseInt(match[1], 10);
        if (isNaN(avatarId)) continue;
        const bSuffix = match[2];

        const isFirstEntry = !avatars[avatarId.toString()];
        if (isFirstEntry) {
            const avatarMeta = mapAvatar[avatarId.toString()];
            const level = Number(char.form?.characterLevel ?? char.characterLevel ?? char.level ?? 80);
            const promotion = calcPromotion(level);
            const rank = Number(char.form?.characterEidolon ?? char.characterEidolon ?? char.eidolon ?? char.rank ?? 0);

            const skills: Record<string, number> = {};
            if (avatarMeta?.SkillTrees) {
                Object.values(avatarMeta.SkillTrees).forEach((treeGroup) => {
                    const first = Object.values(treeGroup)[0];
                    if (first) {
                        skills[first.PointID.toString()] = first.MaxLevel;
                    }
                });
            }

            avatars[avatarId.toString()] = {
                avatar_id: avatarId,
                level,
                promotion,
                data: {
                    rank,
                    skills,
                },
                sp_max: avatarMeta?.SPNeed ? Number(avatarMeta.SPNeed) : 100,
                sp_value: 0,
                techniques: [],
            };

            characterProfiles[avatarId] = [];
        }

        const rawLcId = char.form?.lightCone ?? char.lightCone ?? char.equipment?.tid;
        let currentLc: LightconeJson | null = null;
        if (rawLcId) {
            const lcId = Number(rawLcId);
            if (!isNaN(lcId) && lcId > 0) {
                const lcLevel = Number(char.form?.lightConeLevel ?? char.lightConeLevel ?? 80);
                const lcSuperimposition = Number(char.form?.lightConeSuperimposition ?? char.lightConeSuperimposition ?? 1);
                currentLc = {
                    item_id: lcId,
                    level: lcLevel,
                    rank: lcSuperimposition,
                    promotion: calcPromotion(lcLevel),
                    equip_avatar: avatarId,
                    internal_uid: 0,
                };
                if (isFirstEntry) {
                    lightcones.push(currentLc);
                }
            }
        }

        const currentRelics = resolveRelics(char.equipped, avatarId, relicByFribbelsId, relics);

        if (isFirstEntry) {
            characterProfiles[avatarId].push({
                id: "equipped",
                name: "Equipped",
                avatar_id: avatarId,
                isDefault: true,
                lightcone: currentLc,
                relics: currentRelics,
            });
        } else {
            characterProfiles[avatarId].push({
                id: `entry_${rawIdStr}`,
                name: `Build ${bSuffix ? Number(bSuffix) + 1 : characterProfiles[avatarId].length + 1}`,
                avatar_id: avatarId,
                isDefault: false,
                lightcone: currentLc || characterProfiles[avatarId][0]?.lightcone || null,
                relics: currentRelics,
            });
        }

        if (Array.isArray(char.builds)) {
            char.builds.forEach((build, idx) => {
                if (!build || typeof build !== "object") return;
                const buildName = build.name?.trim() || build.buildName?.trim() || `Build ${characterProfiles[avatarId].length + 1}`;
                const rawBuildLcId = build.lightCone ?? build.lightConeId ?? rawLcId;
                let buildLc: LightconeJson | null = null;
                if (rawBuildLcId) {
                    const lcId = Number(rawBuildLcId);
                    if (!isNaN(lcId) && lcId > 0) {
                        const lcLevel = Number(build.lightConeLevel ?? char.form?.lightConeLevel ?? char.lightConeLevel ?? 80);
                        const lcSuperimposition = Number(build.lightConeSuperimposition ?? build.superimposition ?? char.form?.lightConeSuperimposition ?? char.lightConeSuperimposition ?? 1);
                        buildLc = {
                            item_id: lcId,
                            level: lcLevel,
                            rank: lcSuperimposition,
                            promotion: calcPromotion(lcLevel),
                            equip_avatar: avatarId,
                            internal_uid: 0,
                        };
                    }
                }

                const buildRelics = resolveRelics(build.equipped, avatarId, relicByFribbelsId, relics);
                characterProfiles[avatarId].push({
                    id: `build_${rawIdStr}_${idx}`,
                    name: buildName,
                    avatar_id: avatarId,
                    isDefault: false,
                    lightcone: buildLc || currentLc || characterProfiles[avatarId][0]?.lightcone || null,
                    relics: buildRelics,
                });
            });
        }
    }

    return {
        avatars,
        relics,
        lightcones,
        characterProfiles,
    };
}
