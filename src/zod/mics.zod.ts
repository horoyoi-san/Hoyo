import * as z from "zod";

export const avatarDataStoreSchema = z.object({
    rank: z.number(),
    skills: z.record(z.string(), z.number()),
    ex_rank_id_list: z.array(z.number()).optional()
});

export const lightconeStoreSchema = z.object({
    level: z.number(),
    item_id: z.number(),
    rank: z.number(),
    promotion: z.number()
});

export const subAffixStoreSchema = z.object({
    sub_affix_id: z.number(),
    count: z.number(),
    step: z.number()
});

export const relicStoreSchema = z.object({
    level: z.number(),
    relic_id: z.number(),
    relic_set_id: z.number(),
    main_affix_id: z.number(),
    sub_affixes: z.array(subAffixStoreSchema)
});

export const avatarProfileStoreSchema = z.object({
    profile_name: z.string(),
    lightcone: lightconeStoreSchema.nullable(),
    relics: z.record(z.string(), relicStoreSchema)
});

export const avatarStoreSchema = z.object({
    owner_uid: z.number().optional(),
    avatar_id: z.number(),
    data: avatarDataStoreSchema,
    level: z.number(),
    promotion: z.number(),
    techniques: z.array(z.number()),
    sp_value: z.number(),
    sp_max: z.number(),
    can_change_sp: z.boolean(),
    enhanced: z.string(),
    profileSelect: z.number(),
    profileList: z.array(avatarProfileStoreSchema)
});

export const monsterStoreSchema = z.object({
    monster_id: z.number(),
    level: z.number(),
    amount: z.number()
});

export const dynamicKeyStoreSchema = z.object({
    key: z.string(),
    value: z.number()
});

export const battleBuffStoreSchema = z.object({
    level: z.number(),
    id: z.number(),
    dynamic_key: dynamicKeyStoreSchema.optional()
});

export const mocConfigStoreSchema = z.object({
    event_id: z.number(),
    challenge_id: z.number(),
    floor_side: z.string(),
    use_turbulence_buff: z.boolean(),
    use_cycle_count: z.boolean(),
    blessings: z.array(battleBuffStoreSchema),
    cycle_count: z.number(),
    stage_id: z.number(),
    monsters: z.array(z.array(monsterStoreSchema))
});

export const pfConfigStoreSchema = z.object({
    event_id: z.number(),
    challenge_id: z.number(),
    buff_id: z.number(),
    floor_side: z.string(),
    blessings: z.array(battleBuffStoreSchema),
    cycle_count: z.number(),
    stage_id: z.number(),
    monsters: z.array(z.array(monsterStoreSchema))
});

export const asConfigStoreSchema = z.object({
    event_id: z.number(),
    challenge_id: z.number(),
    buff_id: z.number(),
    floor_side: z.string(),
    blessings: z.array(battleBuffStoreSchema),
    cycle_count: z.number(),
    stage_id: z.number(),
    monsters: z.array(z.array(monsterStoreSchema))
});

export const peakConfigStoreSchema = z.object({
    event_id: z.number(),
    challenge_id: z.number(),
    buff_id: z.number(),
    boss_mode: z.string(),
    blessings: z.array(battleBuffStoreSchema),
    cycle_count: z.number(),
    stage_id: z.number(),
    monsters: z.array(z.array(monsterStoreSchema))
});

export const ceConfigStoreSchema = z.object({
    blessings: z.array(battleBuffStoreSchema),
    cycle_count: z.number(),
    stage_id: z.number(),
    monsters: z.array(z.array(monsterStoreSchema))
});

export const micsSchema = z.object({
    avatars: z.record(z.string(), avatarStoreSchema),
    battle_type: z.string(),
    moc_config: mocConfigStoreSchema,
    pf_config: pfConfigStoreSchema,
    as_config: asConfigStoreSchema,
    ce_config: ceConfigStoreSchema,
    peak_config: peakConfigStoreSchema
}).superRefine((data, ctx) => {
    for (const [avatarId, avatar] of Object.entries(data.avatars)) {
        if (avatar.profileList.length === 0) {
            ctx.addIssue({
                code: "custom",
                path: ["avatars", avatarId, "profileList"],
                message: "profileList must contain at least one profile"
            });
        }

        if (avatar.profileSelect < 0 || avatar.profileSelect >= avatar.profileList.length) {
            ctx.addIssue({
                code: "custom",
                path: ["avatars", avatarId, "profileSelect"],
                message: "profileSelect must point to an existing profile"
            });
        }
    }
});
