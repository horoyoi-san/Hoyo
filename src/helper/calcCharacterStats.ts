import { AvatarDetail, AvatarProfileStore, AvatarStore, LightConeDetail, MainAffixData, RelicSetDetail, SubAffixData } from "@/types";
import { calcBaseStatRaw, calcBonusStatRaw, calcMainAffixBonusRaw, calcPromotion, calcSubAffixBonusRaw } from "./calcData";
import { mappingStats } from "@/constant/constant";

export interface CalculatedStat {
    value: number;
    base: number;
    name: string;
    icon: string;
    unit: string;
    round: number;
}

export function calcCharacterTotalStats({
    avatarSelected,
    avatarData,
    avatarProfile,
    mapAvatar,
    mapLightCone,
    mainAffix,
    subAffix,
    mapRelicSet,
    transI18n,
}: {
    avatarSelected: AvatarDetail | null;
    avatarData?: AvatarStore;
    avatarProfile?: AvatarProfileStore;
    mapAvatar: Record<string, AvatarDetail>;
    mapLightCone: Record<string, LightConeDetail>;
    mainAffix: Record<string, Record<string, MainAffixData>>;
    subAffix: Record<string, Record<string, SubAffixData>>;
    mapRelicSet: Record<string, RelicSetDetail>;
    transI18n: (key: string) => string;
}): Record<string, CalculatedStat> | null {
    if (!avatarSelected || !avatarData) return null;
    const charPromotion = calcPromotion(avatarData.level);

    const avatarSkillTree = avatarData.enhanced && avatarSelected.Enhanced?.[avatarData.enhanced]
        ? avatarSelected.Enhanced[avatarData.enhanced].SkillTrees || {}
        : avatarSelected.SkillTrees || {};

    const relicCount: Record<string, number> = {};
    if (avatarProfile?.relics) {
        for (const relic of Object.values(avatarProfile.relics)) {
            if (relic && relic.relic_set_id) {
                relicCount[relic.relic_set_id] = (relicCount[relic.relic_set_id] || 0) + 1;
            }
        }
    }
    const relicEffects: { key: string; count: number }[] = [];
    Object.entries(relicCount).forEach(([key, value]) => {
        if (value >= 2) {
            relicEffects.push({ key, count: value });
        }
    });

    const statsData: Record<string, CalculatedStat> = {
        HP: {
            value: calcBaseStatRaw(
                mapAvatar?.[avatarSelected.ID.toString()]?.Stats?.[charPromotion]?.HPBase,
                mapAvatar?.[avatarSelected.ID.toString()]?.Stats?.[charPromotion]?.HPAdd,
                avatarData.level
            ),
            base: calcBaseStatRaw(
                mapAvatar?.[avatarSelected.ID.toString()]?.Stats?.[charPromotion]?.HPBase,
                mapAvatar?.[avatarSelected.ID.toString()]?.Stats?.[charPromotion]?.HPAdd,
                avatarData.level
            ),
            name: transI18n("hp"),
            icon: "spriteoutput/ui/avatar/icon/iconmaxhp.webp",
            unit: "",
            round: 0,
        },
        ATK: {
            value: calcBaseStatRaw(
                mapAvatar?.[avatarSelected.ID.toString()]?.Stats?.[charPromotion]?.AttackBase,
                mapAvatar?.[avatarSelected.ID.toString()]?.Stats?.[charPromotion]?.AttackAdd,
                avatarData.level
            ),
            base: calcBaseStatRaw(
                mapAvatar?.[avatarSelected.ID.toString()]?.Stats?.[charPromotion]?.AttackBase,
                mapAvatar?.[avatarSelected.ID.toString()]?.Stats?.[charPromotion]?.AttackAdd,
                avatarData.level
            ),
            name: transI18n("atk"),
            icon: "spriteoutput/ui/avatar/icon/iconattack.webp",
            unit: "",
            round: 0,
        },
        DEF: {
            value: calcBaseStatRaw(
                mapAvatar?.[avatarSelected.ID.toString()]?.Stats?.[charPromotion]?.DefenceBase,
                mapAvatar?.[avatarSelected.ID.toString()]?.Stats?.[charPromotion]?.DefenceAdd,
                avatarData.level
            ),
            base: calcBaseStatRaw(
                mapAvatar?.[avatarSelected.ID.toString()]?.Stats?.[charPromotion]?.DefenceBase,
                mapAvatar?.[avatarSelected.ID.toString()]?.Stats?.[charPromotion]?.DefenceAdd,
                avatarData.level
            ),
            name: transI18n("def"),
            icon: "spriteoutput/ui/avatar/icon/icondefence.webp",
            unit: "",
            round: 0,
        },
        SPD: {
            value: mapAvatar?.[avatarSelected.ID.toString()]?.Stats?.[charPromotion]?.SpeedBase || 0,
            base: mapAvatar?.[avatarSelected.ID.toString()]?.Stats?.[charPromotion]?.SpeedBase || 0,
            name: transI18n("speed"),
            icon: "spriteoutput/ui/avatar/icon/iconspeed.webp",
            unit: "",
            round: 1,
        },
        CRITRate: {
            value: mapAvatar?.[avatarSelected.ID.toString()]?.Stats?.[charPromotion]?.CriticalChance || 0,
            base: mapAvatar?.[avatarSelected.ID.toString()]?.Stats?.[charPromotion]?.CriticalChance || 0,
            name: transI18n("critRate"),
            icon: "spriteoutput/ui/avatar/icon/iconcriticalchance.webp",
            unit: "%",
            round: 1,
        },
        CRITDmg: {
            value: mapAvatar?.[avatarSelected.ID.toString()]?.Stats?.[charPromotion]?.CriticalDamage || 0,
            base: mapAvatar?.[avatarSelected.ID.toString()]?.Stats?.[charPromotion]?.CriticalDamage || 0,
            name: transI18n("critDmg"),
            icon: "spriteoutput/ui/avatar/icon/iconcriticaldamage.webp",
            unit: "%",
            round: 1,
        },
        BreakEffect: {
            value: 0,
            base: 0,
            name: transI18n("breakEffect"),
            icon: "spriteoutput/ui/avatar/icon/iconbreakup.webp",
            unit: "%",
            round: 1,
        },
        EffectRES: {
            value: 0,
            base: 0,
            name: transI18n("effectRes"),
            icon: "spriteoutput/ui/avatar/icon/iconstatusresistance.webp",
            unit: "%",
            round: 1,
        },
        EnergyRate: {
            value: 0,
            base: 0,
            name: transI18n("energyRegenerationRate"),
            icon: "spriteoutput/ui/avatar/icon/iconenergyrecovery.webp",
            unit: "%",
            round: 1,
        },
        EffectHitRate: {
            value: 0,
            base: 0,
            name: transI18n("effectHitRate"),
            icon: "spriteoutput/ui/avatar/icon/iconstatusprobability.webp",
            unit: "%",
            round: 1,
        },
        HealBoost: {
            value: 0,
            base: 0,
            name: transI18n("outgoingHealingBoost"),
            icon: "spriteoutput/ui/avatar/icon/iconhealratio.webp",
            unit: "%",
            round: 1,
        },
        PhysicalAdd: {
            value: 0,
            base: 0,
            name: transI18n("physicalDmgBoost"),
            icon: "spriteoutput/ui/avatar/icon/iconphysicaladdedratio.webp",
            unit: "%",
            round: 1,
        },
        FireAdd: {
            value: 0,
            base: 0,
            name: transI18n("fireDmgBoost"),
            icon: "spriteoutput/ui/avatar/icon/iconfireaddedratio.webp",
            unit: "%",
            round: 1,
        },
        IceAdd: {
            value: 0,
            base: 0,
            name: transI18n("iceDmgBoost"),
            icon: "spriteoutput/ui/avatar/icon/iconiceaddedratio.webp",
            unit: "%",
            round: 1,
        },
        ThunderAdd: {
            value: 0,
            base: 0,
            name: transI18n("thunderDmgBoost"),
            icon: "spriteoutput/ui/avatar/icon/iconthunderaddedratio.webp",
            unit: "%",
            round: 1,
        },
        WindAdd: {
            value: 0,
            base: 0,
            name: transI18n("windDmgBoost"),
            icon: "spriteoutput/ui/avatar/icon/iconwindaddedratio.webp",
            unit: "%",
            round: 1,
        },
        QuantumAdd: {
            value: 0,
            base: 0,
            name: transI18n("quantumDmgBoost"),
            icon: "spriteoutput/ui/avatar/icon/iconquantumaddedratio.webp",
            unit: "%",
            round: 1,
        },
        ImaginaryAdd: {
            value: 0,
            base: 0,
            name: transI18n("imaginaryDmgBoost"),
            icon: "spriteoutput/ui/avatar/icon/iconimaginaryaddedratio.webp",
            unit: "%",
            round: 1,
        },
        ElationAdd: {
            value: 0,
            base: 0,
            name: transI18n("elation"),
            icon: "spriteoutput/ui/avatar/icon/iconjoy.webp",
            unit: "%",
            round: 1,
        },
    };

    if (avatarProfile?.lightcone && mapLightCone[avatarProfile.lightcone.item_id]) {
        const lightconePromotion = calcPromotion(avatarProfile.lightcone.level);
        const lcData = mapLightCone[avatarProfile.lightcone.item_id];
        const lcStats = lcData?.Stats?.[lightconePromotion];
        if (lcStats) {
            statsData.HP.value += calcBaseStatRaw(lcStats.BaseHP, lcStats.BaseHPAdd, avatarProfile.lightcone.level);
            statsData.HP.base += calcBaseStatRaw(lcStats.BaseHP, lcStats.BaseHPAdd, avatarProfile.lightcone.level);
            statsData.ATK.value += calcBaseStatRaw(lcStats.BaseAttack, lcStats.BaseAttackAdd, avatarProfile.lightcone.level);
            statsData.ATK.base += calcBaseStatRaw(lcStats.BaseAttack, lcStats.BaseAttackAdd, avatarProfile.lightcone.level);
            statsData.DEF.value += calcBaseStatRaw(lcStats.BaseDefence, lcStats.BaseDefenceAdd, avatarProfile.lightcone.level);
            statsData.DEF.base += calcBaseStatRaw(lcStats.BaseDefence, lcStats.BaseDefenceAdd, avatarProfile.lightcone.level);
        }

        const bonusData = lcData?.Skills?.Level?.[avatarProfile.lightcone.rank]?.Bonus;
        if (bonusData && bonusData.length > 0) {
            bonusData.forEach((bonus) => {
                if (bonus.PropertyType === "BaseSpeed") {
                    statsData.SPD.value += bonus.Value;
                    statsData.SPD.base += bonus.Value;
                } else {
                    const statsBase = mappingStats?.[bonus.PropertyType]?.baseStat;
                    if (statsBase && statsData[statsBase]) {
                        statsData[statsBase].value += calcBonusStatRaw(bonus.PropertyType, statsData[statsBase].base, bonus.Value);
                    }
                }
            });
        }
    }

    if (avatarSkillTree) {
        Object.values(avatarSkillTree).forEach((value) => {
            if (
                value?.["1"]?.PointID &&
                typeof avatarData?.data?.skills?.[value["1"].PointID] === "number" &&
                avatarData.data.skills[value["1"].PointID] !== 0 &&
                value["1"].StatusAddList?.length
            ) {
                value["1"].StatusAddList.forEach((status) => {
                    const statsBase = mappingStats?.[status.PropertyType]?.baseStat;
                    if (statsBase && statsData[statsBase]) {
                        statsData[statsBase].value += calcBonusStatRaw(status.PropertyType, statsData[statsBase].base, status.Value);
                    }
                });
            }
        });
    }

    if (avatarProfile?.relics && mainAffix && subAffix) {
        Object.entries(avatarProfile.relics).forEach(([key, value]) => {
            const mainAffixMap = mainAffix["5" + key];
            const subAffixMap = subAffix["5"];
            if (!mainAffixMap || !subAffixMap) return;
            const mainStats = mappingStats?.[mainAffixMap?.[value.main_affix_id]?.Property]?.baseStat;
            if (mainStats && statsData[mainStats]) {
                statsData[mainStats].value += calcMainAffixBonusRaw(mainAffixMap[value.main_affix_id], value.level, statsData[mainStats].base);
            }
            value?.sub_affixes?.forEach((subValue) => {
                const subStats = mappingStats?.[subAffixMap?.[subValue.sub_affix_id]?.Property]?.baseStat;
                if (subStats && statsData[subStats]) {
                    statsData[subStats].value += calcSubAffixBonusRaw(subAffixMap[subValue.sub_affix_id], subValue.step, subValue.count, statsData[subStats].base);
                }
            });
        });
    }

    if (relicEffects.length > 0) {
        relicEffects.forEach((relic) => {
            const dataBonus = mapRelicSet?.[relic.key]?.Skills;
            if (!dataBonus) return;
            Object.entries(dataBonus).forEach(([key, value]) => {
                if (relic.count < Number(key)) return;
                value.Bonus.forEach((bonus) => {
                    const statsBase = mappingStats?.[bonus.PropertyType]?.baseStat;
                    if (statsBase && statsData[statsBase]) {
                        statsData[statsBase].value += calcBonusStatRaw(bonus.PropertyType, statsData[statsBase].base, bonus.Value);
                    }
                });
            });
        });
    }

    return statsData;
}
