import * as z from "zod";

export const extraDataSchema = z.object({
    theory_craft: z.object({
        hp: z.record(z.string(), z.array(z.number())),
        cycle_count: z.number(),
        mode: z.boolean(),
        stage_id: z.number()
    }),
    setting: z.object({
        censorship: z.boolean(),
        cm: z.boolean(),
        first_person: z.boolean(),
        hide_ui: z.boolean(),
        invasion_percent: z.number().optional()
    }),
    challenge: z.object({
        skip_node: z.number(),
        challenge_peak_group_id: z.number(),
        challenge_peak_group_id_list: z.array(z.number())
    }),
    multi_path: z.object({
        main: z.number(),
        march_7: z.number(),
        multi_path_main: z.array(z.number()),
        multi_path_march_7: z.array(z.number())
    }),
    lua: z.string().optional()
});
