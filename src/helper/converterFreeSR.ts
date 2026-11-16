import { FreeSRJson, LightconeJson, RelicJson } from "@/types";

export interface FreeSRProfileItem {
    id: string;
    name: string;
    avatar_id: number;
    isDefault: boolean;
    lightcone: LightconeJson | null;
    relics: RelicJson[];
}

export function parseFreeSRProfiles(data: FreeSRJson): Record<number, FreeSRProfileItem[]> {
    const characterProfiles: Record<number, FreeSRProfileItem[]> = {};

    const relicByInternalUid = new Map<number, RelicJson>();
    const relicByRelicId = new Map<number, RelicJson>();
    (data.relics || []).forEach((r) => {
        if (r.internal_uid !== undefined && r.internal_uid !== null) {
            relicByInternalUid.set(Number(r.internal_uid), r);
        }
        if (r.relic_id !== undefined && r.relic_id !== null) {
            if (!relicByRelicId.has(Number(r.relic_id))) {
                relicByRelicId.set(Number(r.relic_id), r);
            }
        }
    });

    Object.values(data.avatars || {}).forEach((char) => {
        const avatarId = char.avatar_id;
        const charLc = (data.lightcones || []).find((lc) => lc.equip_avatar === avatarId) || null;
        const defaultRelics = (data.relics || []).filter((r) => r.equip_avatar === avatarId);

        const profiles: FreeSRProfileItem[] = [
            {
                id: "equipped",
                name: "Equipped",
                avatar_id: avatarId,
                isDefault: true,
                lightcone: charLc,
                relics: defaultRelics,
            },
        ];

        if (Array.isArray(data.loadout)) {
            const charLoadouts = data.loadout.filter((l) => Number(l.avatar_id) === avatarId);
            charLoadouts.forEach((loadout, idx) => {
                const buildName = loadout.name?.trim() || `Loadout ${idx + 1}`;
                const buildRelics: RelicJson[] = [];

                (loadout.relic_list || []).forEach((relicRef) => {
                    const num = Number(relicRef);
                    let relic: RelicJson | undefined;
                    if (!isNaN(num)) {
                        relic = relicByInternalUid.get(num) || relicByRelicId.get(num);
                    }
                    if (relic) {
                        buildRelics.push({
                            ...relic,
                            equip_avatar: avatarId,
                        });
                    }
                });

                profiles.push({
                    id: `loadout_${idx}`,
                    name: buildName,
                    avatar_id: avatarId,
                    isDefault: false,
                    lightcone: charLc,
                    relics: buildRelics.length > 0 ? buildRelics : defaultRelics,
                });
            });
        }

        characterProfiles[avatarId] = profiles;
    });

    return characterProfiles;
}
