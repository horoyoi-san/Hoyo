import { CollapseAvatarData, CollapseConnectionRequest, CollapseRelicData, FreeSRJson, LightconeJson, RelicJson } from "@/types"

const EQUIPMENT_MAX_RANK = 5
const RELIC_MAX_LEVEL = 15
const RELIC_SLOT_MIN = 1
const RELIC_SLOT_MAX = 6
const SUB_AFFIX_MAX_COUNT = 4
const SUB_AFFIX_MAX_CNT = 6

const toInt = (value: unknown, fallback = 0): number => {
    const parsed = Number(value)
    return Number.isFinite(parsed) ? Math.trunc(parsed) : fallback
}

const clamp = (value: number, min: number, max: number): number => Math.min(Math.max(value, min), max)
const relicSlot = (itemId: number): number => itemId % 10

const groupLightcones = (lightcones: LightconeJson[] | undefined): Map<number, LightconeJson> => {
    const byAvatar = new Map<number, LightconeJson>()

    for (const lightcone of lightcones ?? []) {
        const owner = toInt(lightcone?.equip_avatar)
        if (owner === 0 || toInt(lightcone?.item_id) === 0) continue
        if (!byAvatar.has(owner)) byAvatar.set(owner, lightcone)
    }

    return byAvatar
}

const groupRelics = (relics: RelicJson[] | undefined): Map<number, Map<number, RelicJson>> => {
    const byAvatar = new Map<number, Map<number, RelicJson>>()

    for (const relic of relics ?? []) {
        const owner = toInt(relic?.equip_avatar)
        const itemId = toInt(relic?.relic_id)
        if (owner === 0 || itemId === 0) continue

        const slot = relicSlot(itemId)

        if (slot < RELIC_SLOT_MIN || slot > RELIC_SLOT_MAX) continue

        const bySlot = byAvatar.get(owner) ?? new Map<number, RelicJson>()
        if (!bySlot.has(slot)) bySlot.set(slot, relic)
        byAvatar.set(owner, bySlot)
    }

    return byAvatar
}

const toCollapseRelic = (relic: RelicJson): CollapseRelicData => ({
    ItemID: toInt(relic.relic_id),
    Level: clamp(toInt(relic.level), 0, RELIC_MAX_LEVEL),
    MainAffixID: toInt(relic.main_affix_id),
    SubAffixes: (relic.sub_affixes ?? []).slice(0, SUB_AFFIX_MAX_COUNT).map((sub) => ({
        AffixID: toInt(sub?.sub_affix_id),
        Cnt: clamp(toInt(sub?.count, 1), 1, SUB_AFFIX_MAX_CNT),
        Step: Math.max(0, toInt(sub?.step)),
    })),
})

export function converterToCollapseConnection(
    data: FreeSRJson,
    username: string,
    password: string,
    avatarIds?: readonly (string | number)[]
): CollapseConnectionRequest {
    const avatarsByKey = data?.avatars ?? {}
    const keys = avatarIds?.length
        ? [...new Set(avatarIds.map((id) => String(id)))]
        : Object.keys(avatarsByKey)

    const lightconeByAvatar = groupLightcones(data?.lightcones)
    const relicsByAvatar = groupRelics(data?.relics)
    const avatars: CollapseAvatarData[] = []

    for (const key of keys) {
        const avatar = avatarsByKey[key]
        if (!avatar) continue

        const avatarId = toInt(avatar.avatar_id, toInt(key))
        if (avatarId === 0) continue

        const lightcone = lightconeByAvatar.get(avatarId)
        const bySlot = relicsByAvatar.get(avatarId)

        avatars.push({
            AvatarID: avatarId,
            Rank: toInt(avatar.data?.rank),
            EnhancedID: toInt(avatar.enhanced_id ?? 0),
            EquipmentID: lightcone ? toInt(lightcone.item_id) : 0,
            EquipmentRank: clamp(toInt(lightcone?.rank, 1), 1, EQUIPMENT_MAX_RANK),
            Relics: bySlot
                ? [...bySlot.entries()]
                    .sort(([left], [right]) => left - right)
                    .map(([, relic]) => toCollapseRelic(relic))
                : [],
            ExRankIDs: [...new Set((avatar.data?.ex_rank_id_list ?? []).map((id) => toInt(id)))],
        })
    }

    return { Username: username, Password: password, Avatars: avatars }
}
