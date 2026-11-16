import * as z from "zod";

const privacySettingInfoSchema = z.object({
    displayCollection: z.boolean().optional(),
    displayRecord: z.boolean().optional(),
    displayRecordTeam: z.boolean().optional(),
    displayOnlineStatus: z.boolean().optional(),
    displayDiary: z.boolean().optional()
});

const recordInfoSchema = z.object({
    achievementCount: z.number().optional(),
    bookCount: z.number().optional(),
    avatarCount: z.number().optional(),
    equipmentCount: z.number().optional(),
    musicCount: z.number().optional(),
    relicCount: z.number().optional(),
    challengeInfo: z.unknown().optional(),
    maxRogueChallengeScore: z.number().optional()
});

const subAffixSchema = z.object({
    affixId: z.number(),
    cnt: z.number(),
    step: z.number().optional()
});

const flatPropSchema = z.object({
    type: z.string(),
    value: z.number()
});

const relicFlatSchema = z.object({
    props: z.array(flatPropSchema).optional(),
    setName: z.union([z.string(), z.number()]).optional(),
    setID: z.number().optional()
});

const relicSchema = z.object({
    mainAffixId: z.number(),
    subAffixList: z.array(subAffixSchema).optional(),
    tid: z.number(),
    type: z.number(),
    level: z.number(),
    _flat: relicFlatSchema.optional()
});

const skillTreeSchema = z.object({
    pointId: z.number(),
    level: z.number()
});

const equipmentFlatSchema = z.object({
    props: z.array(flatPropSchema).optional(),
    name: z.union([z.string(), z.number()]).optional()
});

const equipmentSchema = z.object({
    rank: z.number().optional(),
    tid: z.number(),
    promotion: z.number().optional(),
    level: z.number(),
    _flat: equipmentFlatSchema.optional()
});

export const avatarEnkaDetailSchema = z.object({
    relicList: z.array(relicSchema).optional(),
    level: z.number(),
    promotion: z.number().optional(),
    rank: z.number().optional(),
    skillTreeList: z.array(skillTreeSchema).optional(),
    equipment: equipmentSchema.optional(),
    avatarId: z.number(),
    _assist: z.boolean().optional(),
    pos: z.number().optional()
});

const detailInfoSchema = z.object({
    worldLevel: z.number().optional(),
    privacySettingInfo: privacySettingInfoSchema.optional(),
    headIcon: z.number().optional(),
    signature: z.string().optional(),
    avatarDetailList: z.array(avatarEnkaDetailSchema).optional(),
    platform: z.string().optional(),
    recordInfo: recordInfoSchema.optional(),
    uid: z.number(),
    level: z.number(),
    nickname: z.string(),
    isDisplayAvatar: z.boolean().optional(),
    friendCount: z.number().optional(),
    personalCardId: z.number().optional()
});

export const enkaResponseSchema = z.object({
    detailInfo: detailInfoSchema,
    ttl: z.number(),
    uid: z.string()
});
