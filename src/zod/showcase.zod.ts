import * as z from "zod";

export const relicShowcaseTypeSchema = z.object({
    img: z.string(),
    mainAffix: z.object({
        property: z.string(),
        level: z.number(),
        valueAffix: z.string(),
        detail: z.object({
            name: z.string(),
            icon: z.string(),
            unit: z.string(),
            baseStat: z.string()
        })
    }),
    subAffix: z.array(z.object({
        property: z.string(),
        valueAffix: z.string(),
        detail: z.object({
            name: z.string(),
            icon: z.string(),
            unit: z.string(),
            baseStat: z.string()
        }),
        step: z.number(),
        count: z.number()
    }))
});
