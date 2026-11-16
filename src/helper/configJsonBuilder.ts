import {
    ASConfigStore,
    AvatarDetail,
    AvatarStore,
    CEConfigStore,
    ConfigJson,
    ConfigJsonAvatar,
    ConfigJsonWarning,
    MOCConfigStore,
    PEAKConfigStore,
    PFConfigStore,
} from "@/types"
import { converterToFreeSRJson } from "./converterToFreeSRJson"

const FALLBACK_LIGHTCONE = { id: 23021, rank: 1, level: 80, promotion: 6 }

const ELEMENT_BUFF_ID: Record<string, number> = {
    Physical: 1000111,
    Fire: 1000112,
    Ice: 1000113,
    Thunder: 1000114,
    Wind: 1000115,
    Quantum: 1000116,
    Imaginary: 1000117,
}

const FALLBACK_MONSTER_WAVE = [[2012010, 3003020, 2013020], [2012010, 200401007, 2013020]]
const FALLBACK_STAGE_ID = 30107121
const FALLBACK_MONSTER_LEVEL = 95
const RELIC_SLOT_COUNT = 6

export type BuildConfigJsonParams = {
    avatarIds: number[]
    attackerId: number | null
    useStepOnRelic: boolean
    avatars: Record<string, AvatarStore>
    mapAvatar: Record<string, AvatarDetail>
    avatarName: (avatarId: number) => string
    battleType: string
    mocConfig: MOCConfigStore
    pfConfig: PFConfigStore
    asConfig: ASConfigStore
    ceConfig: CEConfigStore
    peakConfig: PEAKConfigStore
}

export type BuildConfigJsonResult = {
    config: ConfigJson
    warnings: ConfigJsonWarning[]
}

const relicSlot = (relic: string): number => parseInt(relic.split(",")[0], 10) % 10

export function buildConfigJson(params: BuildConfigJsonParams): BuildConfigJsonResult {
    const {
        avatarIds,
        attackerId,
        useStepOnRelic,
        avatars,
        mapAvatar,
        avatarName,
        battleType,
    } = params

    const warnings: ConfigJsonWarning[] = []


    const freeSR = converterToFreeSRJson(
        avatars,
        battleType,
        params.mocConfig,
        params.pfConfig,
        params.asConfig,
        params.ceConfig,
        params.peakConfig,
    )

    const avatarConfig: ConfigJsonAvatar[] = []

    for (const avatarId of avatarIds) {
        const source = freeSR.avatars[String(avatarId)]
        const name = avatarName(avatarId)

        if (!source) {
            warnings.push({ key: "configJsonWarnNoBuild", values: { name } })
            continue
        }

        const lightconeSource = freeSR.lightcones.find((item) => item.equip_avatar === avatarId)
        let lightcone = { ...FALLBACK_LIGHTCONE }
        if (lightconeSource) {
            lightcone = {
                id: lightconeSource.item_id,
                rank: lightconeSource.rank,
                level: lightconeSource.level,
                promotion: lightconeSource.promotion,
            }
        } else {
            warnings.push({ key: "configJsonWarnNoLightcone", values: { name } })
        }

        const relics = freeSR.relics
            .filter((item) => item.equip_avatar === avatarId)
            .map((item) => {
                const subAffixes = item.sub_affixes ?? []
                const head = `${item.relic_id},${item.level},${item.main_affix_id},${subAffixes.length}`
                if (subAffixes.length === 0) return head

                const subAffixText = subAffixes
                    .map((sub) => {
                        const count = sub.count === 0 ? 1 : sub.count
                        return useStepOnRelic
                            ? `${sub.sub_affix_id}:${count}:${sub.step}`
                            : `${sub.sub_affix_id}:${count}`
                    })
                    .join(",")

                return `${head},${subAffixText}`
            })
            .sort((a, b) => relicSlot(a) - relicSlot(b))

        if (relics.length !== RELIC_SLOT_COUNT) {
            warnings.push({
                key: "configJsonWarnRelicCount",
                values: { name, count: relics.length },
            })
        }

        const buffIdList = [...(source.techniques ?? [])]
        if (avatarId === attackerId) {
            const element = mapAvatar[String(avatarId)]?.DamageType
            const elementBuffId = element ? ELEMENT_BUFF_ID[element] : undefined
            if (elementBuffId) {
                buffIdList.push(elementBuffId)
            } else {
                warnings.push({ key: "configJsonWarnUnknownElement", values: { name } })
            }
        }

        avatarConfig.push({
            name,
            id: source.avatar_id,
            hp: 100,
            sp: source.sp_max > 0 ? Math.round((source.sp_value / source.sp_max) * 100) : 0,
            level: source.level,
            promotion: source.promotion,
            rank: source.data.rank ?? 0,
            lightcone,
            relics,
            use_technique: (source.techniques ?? []).length > 0,
            buff_id_list: buffIdList,
        })
    }

    const battle = freeSR.battle_config

    let stageId = battle.stage_id
    if (!stageId) {
        warnings.push({ key: "configJsonWarnNoStage" })
        stageId = FALLBACK_STAGE_ID
    }

    const monsters = battle.monsters ?? []
    let monsterWave = monsters
        .map((wave) => wave.map((monster) => monster.monster_id))
        .filter((wave) => wave.length > 0)
    if (monsterWave.length === 0) {
        warnings.push({ key: "configJsonWarnNoMonster" })
        monsterWave = FALLBACK_MONSTER_WAVE
    }

    const levels = monsters.flat().map((monster) => monster.level)
    const monsterLevel = levels.length > 0 ? Math.max(...levels) : FALLBACK_MONSTER_LEVEL

    const cycleCount =
        battleType === "MOC" ? battle.cycle_count : battleType === "PF" ? 4 : 30

    return {
        config: {
            avatar_config: avatarConfig,
            battle_config: {
                battle_id: 1,
                stage_id: stageId,
                cycle_count: cycleCount,
                monster_wave: monsterWave,
                monster_level: monsterLevel,
                blessings: (battle.blessings ?? []).map((blessing) => blessing.id),
            },
        },
        warnings,
    }
}
