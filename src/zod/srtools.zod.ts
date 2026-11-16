import * as z from "zod";

export const subAffixSchema = z.object({
    sub_affix_id: z.number(),
    count: z.number(),
    step: z.number()
});

export const relicJsonSchema = z.object({
    level: z.number(),
    relic_id: z.number(),
    relic_set_id: z.number().nullish().transform((v) => v ?? 0),
    main_affix_id: z.number(),
    sub_affixes: z.array(subAffixSchema).nullish().transform((v) => v ?? []),
    internal_uid: z.number().nullish().transform((v) => v ?? 0),
    equip_avatar: z.number().nullish().transform((v) => v ?? 0)
});

export const lightconeJsonSchema = z.object({
    level: z.number(),
    item_id: z.number(),
    equip_avatar: z.number().nullish().transform((v) => v ?? 0),
    rank: z.number(),
    promotion: z.number(),
    internal_uid: z.number().nullish().transform((v) => v ?? 0)
});

export const avatarDataSchema = z.object({
    rank: z.number(),
    skills: z.record(z.string(), z.number()),
    skills_by_anchor_type: z.record(z.string(), z.number()).nullish(),
    ex_rank_id_list: z.array(z.number()).optional()
});

export const avatarJsonSchema = z.object({
    owner_uid: z.number().nullish(),
    avatar_id: z.number(),
    data: z.preprocess((v) => v ?? { rank: 0, skills: {} }, avatarDataSchema),
    level: z.number(),
    promotion: z.number(),
    techniques: z.array(z.number()).nullish().transform((v) => v ?? []),
    sp_value: z.number(),
    sp_max: z.number(),
    enhanced_id: z.number().nullish()
});

export const monsterJsonSchema = z.object({
    monster_id: z.number(),
    level: z.number(),
    amount: z.number().nullish()
});

export const dynamicKeyJsonSchema = z.object({
    key: z.string(),
    value: z.number()
});

export const battleBuffJsonSchema = z.object({
    level: z.number(),
    id: z.number(),
    dynamic_key: dynamicKeyJsonSchema.nullish()
});

export const battleConfigJsonSchema = z.object({
    battle_type: z.string(),
    blessings: z.array(battleBuffJsonSchema).nullish().transform((v) => v ?? []),
    custom_stats: z.array(subAffixSchema).nullish().transform((v) => v ?? []),
    cycle_count: z.number(),
    stage_id: z.number(),
    path_resonance_id: z.number().nullish().transform((v) => v ?? 0),
    monsters: z.array(z.array(monsterJsonSchema)).nullish().transform((v) => v ?? [])
});

const emptyBattleConfig = {
    battle_type: "",
    blessings: [],
    custom_stats: [],
    cycle_count: 0,
    stage_id: 0,
    path_resonance_id: 0,
    monsters: []
};

const loadoutJsonSchema = z.object({
    name: z.string(),
    avatar_id: z.number(),
    relic_list: z.array(z.string())
});

export const freeSrJsonSchema = z.object({
    key: z.string().nullish(),
    lightcones: z.array(lightconeJsonSchema),
    relics: z.array(relicJsonSchema),
    avatars: z.record(z.string(), avatarJsonSchema),
    battle_config: z.preprocess((v) => v ?? { ...emptyBattleConfig }, battleConfigJsonSchema),
    loadout: z.array(loadoutJsonSchema).nullish()
});

const extraDataSchema = z.any();

export const psResponseSchema = z.object({
    status: z.number(),
    message: z.string(),
    extra_data: extraDataSchema.nullish()
});
