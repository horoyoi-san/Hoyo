
import useConnectStore from "@/stores/connectStore";
import useDetailDataStore from "@/stores/detailDataStore";
import { ASConfigStore, AvatarJson, AvatarStore, BattleConfigJson, CEConfigStore, FreeSRJson, LightconeJson, MOCConfigStore, PEAKConfigStore, PFConfigStore, PSConnectType, RelicJson } from "@/types";


export function converterToFreeSRJson(
    avatars: Record<string, AvatarStore>,
    battle_type: string,
    moc_config: MOCConfigStore,
    pf_config: PFConfigStore,
    as_config: ASConfigStore,
    ce_config: CEConfigStore,
    peak_config: PEAKConfigStore,
): FreeSRJson {
    const { skillConfig } = useDetailDataStore.getState()
    const { connectionType } = useConnectStore.getState()
    const lightcones: LightconeJson[] = []
    const relics: RelicJson[] = []
    let battleJson: BattleConfigJson
    if (battle_type === "MOC") {
        battleJson = {
            battle_type: battle_type,
            blessings: moc_config.blessings,
            custom_stats: [],
            cycle_count: moc_config.cycle_count,
            stage_id: moc_config.stage_id,
            path_resonance_id: 0,
            monsters: moc_config.monsters,
        }
    } else if (battle_type === "PF") {
        battleJson = {
            battle_type: battle_type,
            blessings: pf_config.blessings,
            custom_stats: [],
            cycle_count: pf_config.cycle_count,
            stage_id: pf_config.stage_id,
            path_resonance_id: 0,
            monsters: pf_config.monsters,
        }
    } else if (battle_type === "AS") {
        battleJson = {
            battle_type: battle_type,
            blessings: as_config.blessings,
            custom_stats: [],
            cycle_count: as_config.cycle_count,
            stage_id: as_config.stage_id,
            path_resonance_id: 0,
            monsters: as_config.monsters,
        }
    } else if (battle_type === "CE") {
        battleJson = {
            battle_type: connectionType === PSConnectType.FireflyGo ? battle_type : "DEFAULT",
            blessings: ce_config.blessings,
            custom_stats: [],
            cycle_count: ce_config.cycle_count,
            stage_id: ce_config.stage_id,
            path_resonance_id: 0,
            monsters: ce_config.monsters,
        }
    } else if (battle_type === "PEAK") {
        battleJson = {
            battle_type: connectionType === PSConnectType.FireflyGo ? battle_type : "DEFAULT",
            blessings: peak_config.blessings,
            custom_stats: [],
            cycle_count: peak_config.cycle_count,
            stage_id: peak_config.stage_id,
            path_resonance_id: 0,
            monsters: peak_config.monsters,
        }
    } else {
        battleJson = {
            battle_type: battle_type,
            blessings: [],
            custom_stats: [],
            cycle_count: 0,
            stage_id: 0,
            path_resonance_id: 0,
            monsters: [],
        }
    }

    const avatarsJson: { [key: string]: AvatarJson } = {}
    let internalUidLightcone = 0
    let internalUidRelic = 0

    Object.entries(avatars ?? {}).forEach(([avatarId, avatar]) => {
        if (!avatar) return

        const skillsByAnchorType: Record<string, number> = {}
        for (const [skillId, level] of Object.entries(avatar?.data?.skills || {})) {
            if (skillConfig?.[skillId]) {
                skillsByAnchorType[skillConfig[skillId].IndexSlot] = level > skillConfig[skillId].MaxLevel ? skillConfig[skillId].MaxLevel : level
            }
        }
        avatarsJson[avatarId] = {
            owner_uid: Number(avatar.owner_uid || 0),
            avatar_id: Number(avatar.avatar_id || 0),
            data: {
                rank: Number(avatar.data?.rank || 0),
                skills: avatar.data?.skills ?? {},
                skills_by_anchor_type: Object.keys(skillsByAnchorType).length > 0 ? skillsByAnchorType : undefined,
                ex_rank_id_list: avatar.data?.ex_rank_id_list?.length ? avatar.data.ex_rank_id_list : undefined,
            },
            level: Number(avatar.level || 0),
            promotion: Number(avatar.promotion || 0),
            techniques: avatar.techniques ?? [],
            sp_value: Number(avatar.sp_value || 0),
            sp_max: Number(avatar.sp_max || 0),
            enhanced_id: avatar.enhanced ? Number(avatar.enhanced || 0) : undefined,
        }
        const currentProfile = avatar.profileList?.[avatar.profileSelect] ?? avatar.profileList?.[0]
        if (!currentProfile) return

        if (currentProfile.lightcone && currentProfile.lightcone.item_id !== 0) {
            const newLightcone: LightconeJson = {
                level: Number(currentProfile.lightcone.level || 0),
                item_id: Number(currentProfile.lightcone.item_id || 0),
                rank: Number(currentProfile.lightcone.rank || 0),
                promotion: Number(currentProfile.lightcone.promotion || 0),
                internal_uid: internalUidLightcone,
                equip_avatar: Number(avatar.avatar_id || 0),
            }
            internalUidLightcone++
            lightcones.push(newLightcone)
        }

        if (currentProfile.relics) {
            ["1", "2", "3", "4", "5", "6"].forEach(slot => {
                const relic = currentProfile.relics[slot]
                if (relic && relic.relic_id !== 0) {
                    const newRelic: RelicJson = {
                        level: Number(relic.level || 0),
                        relic_id: Number(relic.relic_id || 0),
                        relic_set_id: Number(relic.relic_set_id || 0),
                        main_affix_id: Number(relic.main_affix_id || 0),
                        sub_affixes: relic.sub_affixes ?? [],
                        internal_uid: internalUidRelic,
                        equip_avatar: Number(avatar.avatar_id || 0),
                    }
                    internalUidRelic++
                    relics.push(newRelic)
                }
            })
        }

    })

    return {
        lightcones,
        relics,
        avatars: avatarsJson,
        battle_config: battleJson,
    }
}
