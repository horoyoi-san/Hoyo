import { create } from "zustand";
import { persist } from "zustand/middleware";
import { z } from "zod";
import type { RelicStore } from "@/types";
import { createValidatedJSONStorage } from "./persistStorage";

export type RelicInventoryItem = RelicStore & {
    instanceId: string;
    slot: RelicInventorySlot;
};

export const RELIC_INVENTORY_SLOTS = ["1", "2", "3", "4", "5", "6"] as const;
export type RelicInventorySlot = typeof RELIC_INVENTORY_SLOTS[number];
export const isRelicInventorySlot = (slot: string): slot is RelicInventorySlot =>
    RELIC_INVENTORY_SLOTS.some((validSlot) => validSlot === slot);

const inventorySchema = z.object({
    relics: z.array(z.object({
        instanceId: z.string(),
        slot: z.enum(RELIC_INVENTORY_SLOTS),
        level: z.number(),
        relic_id: z.number(),
        relic_set_id: z.number(),
        main_affix_id: z.number(),
        sub_affixes: z.array(z.object({
            sub_affix_id: z.number(),
            count: z.number(),
            step: z.number(),
        })),
    })),
});

interface RelicInventoryState {
    relics: RelicInventoryItem[];
    addRelic: (slot: RelicInventorySlot, relic: RelicStore) => string;
    removeRelic: (instanceId: string) => void;
}

const useRelicInventoryStore = create<RelicInventoryState>()(
    persist<RelicInventoryState, [], [], Pick<RelicInventoryState, "relics">>(
        (set) => ({
            relics: [],
            addRelic: (slot, relic) => {
                const instanceId = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
                set((state) => ({
                    relics: [...state.relics, { ...relic, slot, instanceId }],
                }));
                return instanceId;
            },
            removeRelic: (instanceId) => set((state) => ({
                relics: state.relics.filter((relic) => relic.instanceId !== instanceId),
            })),
        }),
        {
            name: "relic-inventory-storage",
            storage: createValidatedJSONStorage(() => localStorage, inventorySchema),
            partialize: (state) => ({ relics: state.relics }),
        }
    )
);

export default useRelicInventoryStore;
