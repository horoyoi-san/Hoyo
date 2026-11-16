import * as z from "zod";
import type { ChangelogItemType } from "@/types";

export const changelogItemSchema: z.ZodType<ChangelogItemType> = z.object({
    version: z.string(),
    date: z.string(),
    type: z.string(),
    items: z.array(z.string()),
});

export const localePersistedSchema = z.object({
    locale: z.string(),
    theme: z.string(),
    currentVersion: z.string(),
    changelog: z.array(changelogItemSchema),
});

export const connectPersistedSchema = z.object({
    connectionType: z.string(),
    privateType: z.string(),
    serverUrl: z.string(),
    username: z.string(),
});
