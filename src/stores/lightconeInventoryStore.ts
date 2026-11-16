import { create } from "zustand";
import { persist } from "zustand/middleware";
import { z } from "zod";
import { createValidatedJSONStorage } from "./persistStorage";
import type { LightconeStore } from "@/types";

export type LightconeInventoryItem = LightconeStore & {
    instanceId: string;
};

const inventorySchema = z.object({
    lightcones: z.array(z.object({
        instanceId: z.string(),
        item_id: z.number(),
        level: z.number(),
        rank: z.number(),
        promotion: z.number(),
    })),
});

interface LightconeInventoryState {
    lightcones: LightconeInventoryItem[];
    addLightcone: (lightcone: LightconeStore) => string;
}

const useLightconeInventoryStore = create<LightconeInventoryState>()(
    persist<LightconeInventoryState, [], [], Pick<LightconeInventoryState, "lightcones">>(
        (set) => ({
            lightcones: [],
            addLightcone: (lightcone) => {
                const instanceId = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
                set((state) => ({
                    lightcones: [...state.lightcones, { ...lightcone, instanceId }],
                }));
                return instanceId;
            },
        }),
        {
            name: "lightcone-inventory-storage",
            storage: createValidatedJSONStorage(() => localStorage, inventorySchema),
            partialize: (state) => ({ lightcones: state.lightcones }),
        }
    )
);

export default useLightconeInventoryStore;
