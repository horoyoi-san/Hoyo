import { describe, it, expect } from "bun:test";
import fs from "fs";
import zlib from "zlib";
import {
    calcPromotion,
    calcSubAffixRolls,
    parseHoyolabData,
    parseFribbelsData,
    converterOneHoyolabDataToAvatarStore,
    converterOneFribbelsDataToAvatarStore,
    converterFribbelsProfileToAvatarStore,
    parseFreeSRProfiles,
    converterFreeSRProfileToAvatarStore,
} from "../src/helper";

const readData = (name) => JSON.parse(zlib.brotliDecompressSync(fs.readFileSync(`data/${name}.json.br`)).toString("utf8"));
const metaData = readData("metadata_core");
const relicData = JSON.parse(zlib.brotliDecompressSync(fs.readFileSync("data/relic.json.br")).toString("utf8"));
// Each avatar is its index entry plus its detail, as the client merges them once the detail is loaded.
const avatarIndex = readData("avatar_index");
const avatarData = Object.fromEntries(Object.entries(avatarIndex).map(([id, avatar]) => [id, { ...avatar, ...readData(`avatar_detail/${id}`) }]));

describe("Importer Calculations and Formulas", () => {
    it("calculates promotions correctly using existing calcPromotion", () => {
        expect(calcPromotion(80)).toBe(6);
        expect(calcPromotion(75)).toBe(6);
        expect(calcPromotion(70)).toBe(6);
        expect(calcPromotion(65)).toBe(5);
        expect(calcPromotion(60)).toBe(5);
        expect(calcPromotion(55)).toBe(4);
        expect(calcPromotion(45)).toBe(3);
        expect(calcPromotion(35)).toBe(2);
        expect(calcPromotion(25)).toBe(1);
        expect(calcPromotion(15)).toBe(0);
        expect(calcPromotion(1)).toBe(0);
    });

    it("calculates 5-star Crit DMG substat rolls correctly", () => {
        const affix = metaData.SubAffix["5"]["9"]; // CriticalDamageBase

        // 1 mid roll (5.8%)
        const roll1 = calcSubAffixRolls(affix, "5.8%");
        expect(roll1.count).toBe(1);
        expect(roll1.step).toBe(1);

        // 2 rolls (11.6%)
        const roll2 = calcSubAffixRolls(affix, "11.6%");
        expect(roll2.count).toBe(2);
        expect(roll2.step).toBe(2);
    });

    it("calculates 5-star Speed substat rolls correctly", () => {
        const affix = metaData.SubAffix["5"]["7"]; // SpeedDelta

        // 1 low roll (2 SPD)
        const roll1 = calcSubAffixRolls(affix, 2.0);
        expect(roll1.count).toBe(1);
        expect(roll1.step).toBe(0);

        // 2 rolls (4.3 SPD)
        const roll2 = calcSubAffixRolls(affix, 4.3);
        expect(roll2.count).toBe(2);
        expect(roll2.step).toBe(1);
    });
});

describe("HoYoLAB Data Parser", () => {
    const mockHoyolabPayload = {
        data: {
            avatar_list: [
                {
                    id: 1001,
                    level: 80,
                    rank: 6,
                    promotion: 6,
                    skills: [
                        { point_id: 1001001, level: 6, remake: "Basic ATK" },
                        { point_id: 1001002, level: 10, remake: "Skill" }
                    ],
                    equip: {
                        id: 21001,
                        level: 80,
                        rank: 5,
                        promotion: 6
                    },
                    relics: [
                        {
                            id: 61011,
                            level: 15,
                            main_property: { property_type: 26, value: "705" },
                            properties: [
                                { property_type: 52, value: "2.9%" },
                                { property_type: 53, value: "11.6%" }
                            ]
                        }
                    ],
                    ornaments: []
                }
            ]
        }
    };

    it("parses HoYoLAB payload into avatars, lightcones and relics", () => {
        const parsed = parseHoyolabData(mockHoyolabPayload, avatarData, relicData, metaData.MainAffix, metaData.SubAffix);

        expect(parsed.avatars["1001"]).toBeDefined();
        expect(parsed.avatars["1001"].avatar_id).toBe(1001);
        expect(parsed.avatars["1001"].level).toBe(80);
        expect(parsed.avatars["1001"].data.rank).toBe(6);
        expect(parsed.avatars["1001"].data.skills["1001001"]).toBe(6);
        expect(parsed.avatars["1001"].data.skills["1001002"]).toBe(10);

        expect(parsed.lightcones.length).toBe(1);
        expect(parsed.lightcones[0].item_id).toBe(21001);
        expect(parsed.lightcones[0].equip_avatar).toBe(1001);
        expect(parsed.lightcones[0].level).toBe(80);
        expect(parsed.lightcones[0].rank).toBe(5);

        expect(parsed.relics.length).toBe(1);
        expect(parsed.relics[0].relic_id).toBe(61011);
        expect(parsed.relics[0].relic_set_id).toBe(101);
        expect(parsed.relics[0].equip_avatar).toBe(1001);
        expect(parsed.relics[0].level).toBe(15);
        expect(parsed.relics[0].sub_affixes.length).toBe(2);
    });

    it("converts parsed HoYoLAB data to avatar profile store", () => {
        const parsed = parseHoyolabData(mockHoyolabPayload, avatarData, relicData, metaData.MainAffix, metaData.SubAffix);
        const profile = converterOneHoyolabDataToAvatarStore(parsed, 1, 1001);

        expect(profile).not.toBeNull();
        expect(profile?.profile_name).toBe("HoYoLAB Profile 1");
        expect(profile?.lightcone?.item_id).toBe(21001);
        expect(profile?.relics["1"]?.relic_id).toBe(61011);
    });

    it("returns null on invalid or empty payload without throwing", () => {
        expect(parseHoyolabData("not-a-json", avatarData, relicData, metaData.MainAffix, metaData.SubAffix)).toBeNull();
        expect(parseHoyolabData({}, avatarData, relicData, metaData.MainAffix, metaData.SubAffix)).toBeNull();
        expect(parseHoyolabData({ data: { avatar_list: [] } }, avatarData, relicData, metaData.MainAffix, metaData.SubAffix)).toBeNull();
    });
});

describe("Fribbels Optimizer Data Parser", () => {
    const mockFribbelsPayload = {
        characters: [
            {
                id: "1001",
                form: {
                    characterLevel: 80,
                    characterEidolon: 6,
                    lightCone: "21001",
                    lightConeLevel: 80,
                    lightConeSuperimposition: 5
                }
            }
        ],
        relics: [
            {
                set: "Passerby of Wandering Cloud",
                part: "Head",
                grade: 5,
                enhance: 15,
                equippedBy: "1001",
                main: { stat: "HP" },
                substats: [
                    { stat: "CRIT DMG", value: 11.6 },
                    { stat: "CRIT Rate", value: 2.9 }
                ]
            }
        ]
    };

    it("parses Fribbels payload into avatars, lightcones and relics", () => {
        const parsed = parseFribbelsData(mockFribbelsPayload, avatarData, relicData, metaData.MainAffix, metaData.SubAffix);

        expect(parsed.avatars["1001"]).toBeDefined();
        expect(parsed.avatars["1001"].avatar_id).toBe(1001);
        expect(parsed.avatars["1001"].level).toBe(80);
        expect(parsed.avatars["1001"].data.rank).toBe(6);

        expect(parsed.lightcones.length).toBe(1);
        expect(parsed.lightcones[0].item_id).toBe(21001);
        expect(parsed.lightcones[0].equip_avatar).toBe(1001);
        expect(parsed.lightcones[0].rank).toBe(5);

        expect(parsed.relics.length).toBe(1);
        expect(parsed.relics[0].relic_id).toBe(61011);
        expect(parsed.relics[0].relic_set_id).toBe(101);
        expect(parsed.relics[0].equip_avatar).toBe(1001);
        expect(parsed.relics[0].level).toBe(15);
        expect(parsed.relics[0].sub_affixes.length).toBe(2);
    });

    it("converts parsed Fribbels data to avatar profile store", () => {
        const parsed = parseFribbelsData(mockFribbelsPayload, avatarData, relicData, metaData.MainAffix, metaData.SubAffix);
        const profile = converterOneFribbelsDataToAvatarStore(parsed, 1, 1001);

        expect(profile).not.toBeNull();
        expect(profile?.profile_name).toBe("Fribbels Profile 1");
        expect(profile?.lightcone?.item_id).toBe(21001);
        expect(profile?.relics["1"]?.relic_id).toBe(61011);
    });

    it("parses multiple builds/profiles per character and converts them accurately", () => {
        const multiBuildPayload = {
            characters: [
                {
                    id: "1001",
                    form: {
                        characterLevel: 80,
                        characterEidolon: 6,
                        lightCone: "21001",
                        lightConeLevel: 80,
                        lightConeSuperimposition: 5
                    },
                    equipped: {
                        Head: "18328"
                    },
                    builds: [
                        {
                            name: "ashblade wind vw hya",
                            lightCone: "21002",
                            lightConeLevel: 70,
                            lightConeSuperimposition: 2,
                            equipped: {
                                Head: "19145"
                            }
                        }
                    ]
                }
            ],
            relics: [
                {
                    id: "18328",
                    set: "Passerby of Wandering Cloud",
                    part: "Head",
                    grade: 5,
                    enhance: 15,
                    main: { stat: "HP" },
                    substats: [
                        { stat: "CRIT DMG", value: 11.6 }
                    ]
                },
                {
                    id: "19145",
                    set: "Musketeer of Wild Wheat",
                    part: "Head",
                    grade: 5,
                    enhance: 12,
                    main: { stat: "HP" },
                    substats: [
                        { stat: "CRIT Rate", value: 5.8 }
                    ]
                }
            ]
        };

        const parsed = parseFribbelsData(multiBuildPayload, avatarData, relicData, metaData.MainAffix, metaData.SubAffix);
        expect(parsed).not.toBeNull();
        expect(parsed.characterProfiles[1001]).toBeDefined();
        expect(parsed.characterProfiles[1001].length).toBe(2);

        // Check Equipped / Default profile
        const defaultProf = parsed.characterProfiles[1001][0];
        expect(defaultProf.id).toBe("equipped");
        expect(defaultProf.isDefault).toBe(true);
        expect(defaultProf.lightcone?.item_id).toBe(21001);
        expect(defaultProf.relics.length).toBe(1);
        expect(defaultProf.relics[0].relic_id).toBe(61011); // Passerby Head

        // Check Extra Build profile
        const extraProf = parsed.characterProfiles[1001][1];
        expect(extraProf.id).toBe("build_1001_0");
        expect(extraProf.name).toBe("ashblade wind vw hya");
        expect(extraProf.isDefault).toBe(false);
        expect(extraProf.lightcone?.item_id).toBe(21002);
        expect(extraProf.lightcone?.level).toBe(70);
        expect(extraProf.lightcone?.rank).toBe(2);
        expect(extraProf.relics.length).toBe(1);
        expect(extraProf.relics[0].relic_id).toBe(61021); // Musketeer Head

        // Test converting profiles to AvatarProfileStore
        const storeProfile0 = converterFribbelsProfileToAvatarStore(defaultProf);
        expect(storeProfile0?.profile_name).toBe("Fribbels (Equipped)");
        expect(storeProfile0?.lightcone?.item_id).toBe(21001);
        expect(storeProfile0?.relics["1"]?.relic_id).toBe(61011);

        const storeProfile1 = converterFribbelsProfileToAvatarStore(extraProf);
        expect(storeProfile1?.profile_name).toBe("ashblade wind vw hya");
        expect(storeProfile1?.lightcone?.item_id).toBe(21002);
        expect(storeProfile1?.relics["1"]?.relic_id).toBe(61021);
    });

    it("returns null on invalid or empty payload without throwing", () => {
        expect(parseFribbelsData("not-a-json", avatarData, relicData, metaData.MainAffix, metaData.SubAffix)).toBeNull();
        expect(parseFribbelsData({}, avatarData, relicData, metaData.MainAffix, metaData.SubAffix)).toBeNull();
        expect(parseFribbelsData({ characters: [], relics: [] }, avatarData, relicData, metaData.MainAffix, metaData.SubAffix)).toBeNull();
    });
});

describe("FreeSR Protocol Loadout Parser", () => {
    const mockFreeSRPayload = {
        key: "test",
        avatars: {
            "1001": {
                avatar_id: 1001,
                level: 80,
                promotion: 6,
                data: {
                    rank: 6,
                    skills: { "1001001": 6 },
                    ex_rank_id_list: [100101, 100102]
                },
                techniques: [],
                sp_value: 0,
                sp_max: 100
            }
        },
        lightcones: [
            {
                item_id: 21001,
                equip_avatar: 1001,
                level: 80,
                rank: 5,
                promotion: 6,
                internal_uid: 0
            }
        ],
        relics: [
            {
                level: 15,
                relic_id: 61011,
                relic_set_id: 101,
                main_affix_id: 1,
                sub_affixes: [{ sub_affix_id: 1, count: 2, step: 1 }],
                internal_uid: 10,
                equip_avatar: 1001
            },
            {
                level: 15,
                relic_id: 61021,
                relic_set_id: 102,
                main_affix_id: 1,
                sub_affixes: [{ sub_affix_id: 2, count: 3, step: 2 }],
                internal_uid: 20,
                equip_avatar: 0
            }
        ],
        battle_config: {
            battle_type: "DEFAULT",
            blessings: [],
            custom_stats: [],
            cycle_count: 0,
            stage_id: 0,
            path_resonance_id: 0,
            monsters: []
        },
        loadout: [
            {
                name: "Quantum Pure Fiction",
                avatar_id: 1001,
                relic_list: ["20"] // Refers to internal_uid 20
            }
        ]
    };

    it("parses FreeSR loadouts into profiles and maps relics correctly", () => {
        const profilesMap = parseFreeSRProfiles(mockFreeSRPayload);
        expect(profilesMap[1001]).toBeDefined();
        expect(profilesMap[1001].length).toBe(2);

        // Equipped profile
        const equippedProf = profilesMap[1001][0];
        expect(equippedProf.id).toBe("equipped");
        expect(equippedProf.isDefault).toBe(true);
        expect(equippedProf.lightcone?.item_id).toBe(21001);
        expect(equippedProf.relics.length).toBe(1);
        expect(equippedProf.relics[0].relic_id).toBe(61011);

        // Loadout profile
        const loadoutProf = profilesMap[1001][1];
        expect(loadoutProf.id).toBe("loadout_0");
        expect(loadoutProf.name).toBe("Quantum Pure Fiction");
        expect(loadoutProf.isDefault).toBe(false);
        expect(loadoutProf.lightcone?.item_id).toBe(21001);
        expect(loadoutProf.relics.length).toBe(1);
        expect(loadoutProf.relics[0].relic_id).toBe(61021);

        // Profile store conversions
        const storeEquipped = converterFreeSRProfileToAvatarStore(equippedProf);
        expect(storeEquipped?.profile_name).toBe("FreeSR (Equipped)");
        expect(storeEquipped?.relics["1"]?.relic_id).toBe(61011);

        const storeLoadout = converterFreeSRProfileToAvatarStore(loadoutProf);
        expect(storeLoadout?.profile_name).toBe("Quantum Pure Fiction");
        expect(storeLoadout?.relics["1"]?.relic_id).toBe(61021);
    });

    it("handles FreeSR payload without loadouts by creating standard equipped profile", () => {
        const payloadNoLoadout = {
            ...mockFreeSRPayload,
            loadout: null
        };
        const profilesMap = parseFreeSRProfiles(payloadNoLoadout);
        expect(profilesMap[1001]).toBeDefined();
        expect(profilesMap[1001].length).toBe(1);
        expect(profilesMap[1001][0].id).toBe("equipped");
    });
});


