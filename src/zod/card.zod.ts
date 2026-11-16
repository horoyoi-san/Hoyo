import * as z from "zod";
import { lightconeStoreSchema, relicStoreSchema } from "./mics.zod";

export const characterInfoCardTypeSchema = z.object({
    key: z.number(),
    avatar_id: z.number(),
    rank: z.number(),
    level: z.number(),
    lightcone: z.object({
        level: z.number(),
        rank: z.number(),
        item_id: z.number()
    }),
    relics: z.array(z.object({
        level: z.number(),
        relic_id: z.number(),
        relic_set_id: z.number()
    }))
});

export const avatarProfileCardTypeSchema = z.object({
    key: z.number(),
    profile_name: z.string(),
    lightcone: lightconeStoreSchema.optional().nullable(),
    relics: z.record(z.string(), relicStoreSchema)
});
