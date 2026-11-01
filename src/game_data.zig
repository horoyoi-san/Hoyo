//! Game-domain data: disk sets/slots/stars, stat definitions and the
//! wire-format PlayerEquip payload, plus small pure helpers built on top
//! of them (e.g. getDiskId).

const std = @import("std");

pub const Agent = enum(u16) {
    Alice = 1401,
    Anby = 1011,
    Anton = 1111,
    Aria = 1501,
    @"Astra Yao" = 1311,
    Banyue = 1471,
    Ben = 1121,
    Billy = 1081,
    Burnice = 1171,
    Caesar = 1071,
    Cissia = 1521,
    Claret = 1611,
    Corin = 1061,
    Dialyn = 1481,
    Ellen = 1191,
    Evelyn = 1321,
    Grace = 1181,
    Harumasa = 1201,
    Hugo = 1291,
    Jane = 1261,
    @"Ju Fufu" = 1391,
    Koleda = 1101,
    Lighter = 1161,
    Lucia = 1451,
    Lucy = 1151,
    Lycaon = 1141,
    Manato = 1441,
    Miyabi = 1091,
    @"Nangong Yu" = 1511,
    Nekomata = 1021,
    Nicole = 1031,
    Norma = 1571,
    @"Orphie & Magus" = 1301,
    @"Pan Yinhu" = 1421,
    Phoenix = 1641,
    Piper = 1281,
    Promeia = 1541,
    Pulchra = 1351,
    Pyrois = 1551,
    Qingyi = 1251,
    Remielle = 1581,
    Rina = 1211,
    Robin = 1661,
    Roxy = 1621,
    Seed = 1461,
    Seth = 1271,
    Severian = 1631,
    Sigrid = 1591,
    @"Soldier 0 - Anby" = 1381,
    @"Soldier 11" = 1041,
    Soukaku = 1131,
    @"Starlight - Billy" = 1531,
    Sunbringer = 1601,
    Sunna = 1491,
    Trigger = 1361,
    Velina = 1561,
    Vivian = 1331,
    Yanagi = 1221,
    @"Ye Shunguang" = 1431,
    Yidhari = 1051,
    Yixuan = 1371,
    Yuzuha = 1411,
    Zhao = 1341,
    @"Zhu Yuan" = 1241,
};

pub const Weapon = enum(u16) {
    @"[Cinder] Cobalt" = 12015,
    @"[Identity] Base" = 12013,
    @"[Identity] Inflection" = 12014,
    @"[Lunar] Decrescent" = 12002,
    @"[Lunar] Noviluna" = 12003,
    @"[Lunar] Pleniluna" = 12001,
    @"[Lunar] Semiluna" = 12016,
    @"[Magnetic Storm] Alpha" = 12010,
    @"[Magnetic Storm] Bravo" = 12011,
    @"[Magnetic Storm] Charlie" = 12012,
    @"[Reverb] Mark I" = 12004,
    @"[Reverb] Mark II" = 12005,
    @"[Reverb] Mark III" = 12006,
    @"[Vortex] Arrow" = 12008,
    @"[Vortex] Hatchet" = 12009,
    @"[Vortex] Revolver" = 12007,
    @"Angel in the Shell" = 14150,
    @"Bashful Demon" = 13113,
    @"Bellicose Blaze" = 14130,
    @"Big Cylinder" = 13112,
    @"Blazing Laurel" = 14116,
    @"Bloodmarrow Coffer" = 13021,
    @"Boisterous Echoes" = 13018,
    @"Box Cutter" = 13135,
    @"Bunny Band" = 13010,
    @"Candlelit Scheme" = 13022,
    @"Cannon Rotor" = 14001,
    @"Catty Luck" = 13017,
    @"Cauldron of Clarity" = 13019,
    @"Chief Sidekick" = 14157,
    @"Cloudcleave Radiance" = 14143,
    @"Cordis Germina" = 14146,
    @"Crimson Moon Casket" = 14162,
    @"Crimson Thirst" = 14161,
    @"Deep Sea Visitor" = 14119,
    @"Demara Battery Mark II" = 13101,
    @"Dreamlit Hearth" = 14145,
    @"Drill Rig - Red Axis" = 13111,
    @"Electro-Lip Gloss" = 13009,
    @"Elegant Vanity" = 14131,
    @"Flamemaker Shaker" = 14117,
    @"Flight of Fancy" = 14133,
    @"Frostfall Sickle" = 14154,
    @"Fusion Compiler" = 14118,
    @"Gilded Blossom" = 13013,
    @"Grill O'Wisp" = 13144,
    @"Hailstorm Shrine" = 14109,
    @"Half-Sugar Bunny" = 14134,
    @"Heartstring Nocturne" = 14132,
    @"Hellfire Gears" = 14110,
    Housekeeper = 13106,
    @"Ice-Jade Teapot" = 14125,
    @"Incarcerating Grip" = 14163,
    @"Joyau Dore" = 14156,
    @"Kaboom the Cannon" = 13115,
    @"Knight's Extolment" = 14159,
    @"Kraken's Cradle" = 14105,
    @"Marcato Desire" = 13015,
    Metanukimorphosis = 14141,
    @"Myriad Eclipse" = 14129,
    @"Neon Fantasies" = 14151,
    @"Ode of Resurrected Wings" = 14158,
    @"Original Transmorpher" = 13007,
    @"Peacekeeper - Specialized" = 13127,
    @"Plume of Rebirth" = 14164,
    @"Practiced Perfection" = 14140,
    @"Precious Fossilized Core" = 13006,
    @"Puzzle Sphere" = 13012,
    @"Qingming Birdcage" = 14137,
    @"Radiowave Journey" = 13014,
    @"Rainforest Gourmet" = 13003,
    @"Reel Projector" = 13016,
    @"Riot Suppressor Mark VI" = 14124,
    @"Roaring Fur-nace" = 14139,
    @"Roaring Ride" = 13128,
    @"Robin S-Rank" = 14166,
    @"Serpentine Seeker" = 14152,
    @"Severed Innocence" = 14138,
    @"Sharpened Stinger" = 14126,
    @"Six Shooter" = 14003,
    @"Slice of Time" = 13002,
    @"Sol Exuvia" = 14155,
    @"Sunbringer S-Rank" = 14160,
    @"Spectral Gaze" = 14136,
    @"Spring Embrace" = 13011,
    @"Starlight Engine" = 13004,
    @"Starlight Engine Replica" = 13108,
    @"Starlight Rider Faceplate" = 14153,
    @"Steam Oven" = 13005,
    @"Steel Cushion" = 14102,
    @"Street Superstar" = 13001,
    @"The Brimstone" = 14104,
    @"The Restrained" = 14114,
    @"The Simmering Pot" = 13020,
    @"The Vault" = 13103,
    Thoughtbop = 14149,
    Timeweaver = 14122,
    @"Tremor Trigram Vessel" = 13142,
    @"Tusks of Fury" = 14107,
    @"Unfettered Game Ball" = 14002,
    @"Weeping Cradle" = 14121,
    @"Weeping Gemini" = 13008,
    @"Wrathful Vajra" = 14147,
    @"Yesterday Calls" = 14148,
    @"Zanshin Herb Case" = 14120,

    /// Weapon rank.
    pub fn getStar(self: Weapon) u3 {
        // Example 14120
        //          ^ -- signifies the rank: S = 4; A = 3; B = 2;
        return @intCast(@divTrunc(@intFromEnum(self), 1000) - 10);
    }

    // Upgrade level
    pub fn rankForLevel(level: u32) u3 {
        return @intCast((level - 1) / 10);
    }
};

pub const WeaponRefinement = enum(u3) {
    W1 = 1,
    W2 = 2,
    W3 = 3,
    W4 = 4,
    W5 = 5,
};

pub const Mindscape = enum(u3) {
    M0 = 0,
    M1 = 1,
    M2 = 2,
    M3 = 3,
    M4 = 4,
    M5 = 5,
    M6 = 6,
};

/// Limits of an avatar's level and the "ascension" rank derived from it.
pub const Avatar = struct {
    pub const level_min: u32 = 1;
    pub const level_max: u32 = 60;
    pub const rank_min: u32 = 1;
    pub const rank_max: u32 = 6;

    /// Rank 1 spans levels 1-10, rank 2 spans 11-20, and so on up to
    /// rank 6 which spans levels 51-60.
    pub fn rankForLevel(level: u32) u32 {
        return (level - 1) / 10 + 1;
    }
};

/// The skills of an avatar, in the same order the server stores them.
pub const Skill = enum(u8) {
    pub const count: usize = 7;

    common_attack = 0,
    special_attack = 1,
    evade = 2,
    cooperate_skill = 3,
    unique_skill = 4,
    core_skill = 5,
    assist_skill = 6,

    pub fn allValues() []const Skill {
        return &.{ .common_attack, .evade, .assist_skill, .special_attack, .cooperate_skill, .core_skill, .unique_skill };
    }

    /// The highest level this skill can be raised to.
    pub fn maxLevel(skill: Skill) u32 {
        return switch (skill) {
            .core_skill => 7,
            else => 12,
        };
    }

    pub fn name(skill: Skill) []const u8 {
        return switch (skill) {
            .common_attack => "Basic Attack",
            .special_attack => "Special Attack",
            .evade => "Dodge",
            .cooperate_skill => "Chain Attack",
            .unique_skill => "Unique Skill(?)",
            .core_skill => "Core Skill",
            .assist_skill => "Assist Skill",
        };
    }
};

pub const DiskSet = enum(u16) {
    @"Def/Robin Set" = 34300,
    @"ER/Sunbringer" = 34400,
    @"Astral Voice" = 32800,
    @"Branch & Blade Song" = 32700,
    @"Bunny in Wonderland" = 33700,
    @"Chaos Jazz" = 31800,
    @"Chaotic Metal" = 32300,
    @"Dawns Bloom" = 33300,
    @"Fanged Metal" = 32600,
    @"Feathered Fate" = 34100,
    @"Freedom Blues" = 31300,
    @"Hormone Punk" = 31400,
    @"Inferno Metal" = 32200,
    @"King of the Summit" = 33200,
    @"Moonlight Lullaby" = 33400,
    @"Notes from the Chained" = 33800,
    @"Phaethons Melody" = 33000,
    @"Polar Metal" = 32500,
    @"Proto Punk" = 31900,
    @"Puffer Electro" = 31100,
    @"Shadow Harmony" = 32900,
    @"Shining Aria" = 33600,
    @"Shockstar Disco" = 31200,
    @"Soul Rock" = 31500,
    @"Swing Jazz" = 31600,
    @"The Sky Ablaze" = 34000,
    @"Thorned Rose" = 34200,
    @"Thunder Metal" = 32400,
    @"White Water Ballad" = 33500,
    @"Woodpecker Electro" = 31000,
    @"Wuthering Salon" = 33900,
    @"Yunkui Tales" = 33100,
};

pub const DiskSlot = enum(u8) {
    @"Slot-1" = 1,
    @"Slot-2" = 2,
    @"Slot-3" = 3,
    @"Slot-4" = 4,
    @"Slot-5" = 5,
    @"Slot-6" = 6,
};

pub const DiskStar = enum(u8) {
    @"B-Rank" = 2,
    @"A-Rank" = 3,
    @"S-Rank" = 4,

    /// Disk level associated with each star rank when a disk is first created.
    pub fn initialLevel(self: DiskStar) u4 {
        return switch (self) {
            .@"B-Rank" => 9,
            .@"A-Rank" => 12,
            .@"S-Rank" => 15,
        };
    }
};

pub const StatKind = enum(u16) {
    HP = 11103,
    HP_Percent = 11102,
    ATK = 12103,
    ATK_Percent = 12102,
    DEF = 13103,
    DEF_Percent = 13102,
    PEN = 23203,
    PEN_Percent = 23103,
    AM = 31402,
    AP = 31203,
    Crit_DMG = 21103,
    Crit_Rate = 20103,
    ER = 30502,
    Impact = 12202,
    Electro = 31803,
    Ether = 31903,
    Fire = 31603,
    Ice = 31703,
    Physical = 31503,
    Wind = 32303,
    _,

    pub const Details = struct {
        stat_tag: StatKind,
        name: []const u8,
        main_value: ?u12,
        sub_value: ?u12,
        main_slot: ?[]const DiskSlot,
    };

    pub fn getDetails(self: StatKind) !Details {
        return switch (self) {
            .HP => .{
                .stat_tag = self,
                .name = "HP",
                .main_value = 550,
                .sub_value = 112,
                .main_slot = std.mem.bytesAsSlice(DiskSlot, &[_]u8{1}),
            },
            .HP_Percent => .{
                .stat_tag = self,
                .name = "%HP",
                .main_value = 750,
                .sub_value = 300,
                .main_slot = std.mem.bytesAsSlice(DiskSlot, &[_]u8{ 4, 5, 6 }),
            },
            .ATK => .{
                .stat_tag = self,
                .name = "ATK",
                .main_value = 79,
                .sub_value = 19,
                .main_slot = std.mem.bytesAsSlice(DiskSlot, &[_]u8{2}),
            },
            .ATK_Percent => .{
                .stat_tag = self,
                .name = "%ATK",
                .main_value = 750,
                .sub_value = 300,
                .main_slot = std.mem.bytesAsSlice(DiskSlot, &[_]u8{ 4, 5, 6 }),
            },
            .DEF => .{
                .stat_tag = self,
                .name = "DEF",
                .main_value = 46,
                .sub_value = 15,
                .main_slot = std.mem.bytesAsSlice(DiskSlot, &[_]u8{3}),
            },
            .DEF_Percent => .{
                .stat_tag = self,
                .name = "%DEF",
                .main_value = 1200,
                .sub_value = 480,
                .main_slot = std.mem.bytesAsSlice(DiskSlot, &[_]u8{ 4, 5, 6 }),
            },
            .PEN => .{
                .stat_tag = self,
                .name = "PEN",
                .main_value = null,
                .sub_value = 9,
                .main_slot = null,
            },
            .PEN_Percent => .{
                .stat_tag = self,
                .name = "%PEN",
                .main_value = 600,
                .sub_value = null,
                .main_slot = std.mem.bytesAsSlice(DiskSlot, &[_]u8{5}),
            },
            .AM => .{
                .stat_tag = self,
                .name = "AM",
                .main_value = 750,
                .sub_value = null,
                .main_slot = std.mem.bytesAsSlice(DiskSlot, &[_]u8{6}),
            },
            .AP => .{
                .stat_tag = self,
                .name = "AP",
                .main_value = 23,
                .sub_value = 9,
                .main_slot = std.mem.bytesAsSlice(DiskSlot, &[_]u8{4}),
            },
            .Crit_DMG => .{
                .stat_tag = self,
                .name = "Crit DMG",
                .main_value = 1200,
                .sub_value = 480,
                .main_slot = std.mem.bytesAsSlice(DiskSlot, &[_]u8{4}),
            },
            .Crit_Rate => .{
                .stat_tag = self,
                .name = "Crit Rate",
                .main_value = 600,
                .sub_value = 240,
                .main_slot = std.mem.bytesAsSlice(DiskSlot, &[_]u8{4}),
            },
            .ER => .{
                .stat_tag = self,
                .name = "ER",
                .main_value = 1500,
                .sub_value = null,
                .main_slot = std.mem.bytesAsSlice(DiskSlot, &[_]u8{6}),
            },
            .Impact => .{
                .stat_tag = self,
                .name = "Impact",
                .main_value = 450,
                .sub_value = null,
                .main_slot = std.mem.bytesAsSlice(DiskSlot, &[_]u8{6}),
            },
            .Electro => .{
                .stat_tag = self,
                .name = "Electro",
                .main_value = 750,
                .sub_value = null,
                .main_slot = std.mem.bytesAsSlice(DiskSlot, &[_]u8{5}),
            },
            .Ether => .{
                .stat_tag = self,
                .name = "Ether",
                .main_value = 750,
                .sub_value = null,
                .main_slot = std.mem.bytesAsSlice(DiskSlot, &[_]u8{5}),
            },
            .Fire => .{
                .stat_tag = self,
                .name = "Fire",
                .main_value = 750,
                .sub_value = null,
                .main_slot = std.mem.bytesAsSlice(DiskSlot, &[_]u8{5}),
            },
            .Ice => .{
                .stat_tag = self,
                .name = "Ice",
                .main_value = 750,
                .sub_value = null,
                .main_slot = std.mem.bytesAsSlice(DiskSlot, &[_]u8{5}),
            },
            .Physical => .{
                .stat_tag = self,
                .name = "Physical",
                .main_value = 750,
                .sub_value = null,
                .main_slot = std.mem.bytesAsSlice(DiskSlot, &[_]u8{5}),
            },
            .Wind => .{
                .stat_tag = self,
                .name = "Wind",
                .main_value = 750,
                .sub_value = null,
                .main_slot = std.mem.bytesAsSlice(DiskSlot, &[_]u8{5}),
            },
            _ => error.InvalidEnumValue,
        };
    }

    pub fn getById(id: u32) ?StatKind {
        const stat_kind: StatKind = @enumFromInt(id);
        return switch (stat_kind) {
            else => stat_kind,
            _ => null,
        };
    }

    pub fn getByName(name: []const u8) ?StatKind {
        return string_map.get(name);
    }

    const string_map = blk: {
        const fields = @typeInfo(StatKind).@"enum".fields;
        const KV = struct { []const u8, StatKind };
        var kvs: [fields.len]KV = undefined;

        for (fields, 0..) |f, i| {
            const tag = @as(StatKind, @enumFromInt(f.value));
            const tag_details = tag.getDetails() catch continue;
            kvs[i] = .{ tag_details.name, tag };
        }
        break :blk std.StaticStringMap(StatKind).initComptime(kvs);
    };
};

// Maximum number of different Stats one Disk can have
pub const max_mainstats_per_slot = blk: {
    var max: usize = 0;
    for (@typeInfo(DiskSlot).@"enum".fields) |f| {
        const slot: DiskSlot = @enumFromInt(f.value);
        max = @max(max, mainStatsForSlot(slot).len);
    }
    break :blk max;
};

pub fn mainStatsForSlot(slot: DiskSlot) []const StatKind {
    return switch (slot) {
        .@"Slot-2" => &.{.ATK},
        .@"Slot-3" => &.{.DEF},
        .@"Slot-1" => &.{.HP},
        .@"Slot-4" => &.{ .ATK_Percent, .DEF_Percent, .HP_Percent, .Crit_Rate, .Crit_DMG, .AP },
        .@"Slot-5" => &.{ .ATK_Percent, .DEF_Percent, .HP_Percent, .PEN_Percent, .Physical, .Fire, .Ice, .Electro, .Ether, .Wind },
        .@"Slot-6" => &.{ .ATK_Percent, .DEF_Percent, .HP_Percent, .Impact, .AM, .ER },
    };
}

pub const substat_pool = [_]StatKind{
    .HP,        .HP_Percent,
    .ATK,       .ATK_Percent,
    .DEF,       .DEF_Percent,
    .PEN,       .AP,
    .Crit_Rate, .Crit_DMG,
};

pub fn availableSubstats(
    mainstat: ?StatKind,
    current_values: [4]?StatKind,
    current_idx: usize,
    buf: []StatKind,
) []StatKind {
    var count: usize = 0;
    for (substat_pool) |stat| {
        if (mainstat != null and stat == mainstat.?) continue;

        var used_elsewhere = false;
        for (current_values, 0..) |sel, i| {
            if (i == current_idx) continue;
            if (sel != null and sel.? == stat) {
                used_elsewhere = true;
                break;
            }
        }
        if (used_elsewhere) continue;

        buf[count] = stat;
        count += 1;
    }
    return buf[0..count];
}

/// Derives the wire item id for a disk from its set, star rank and slot.
pub fn getDiskId(set: DiskSet, star: DiskStar, slot: DiskSlot) u16 {
    const set_int = @intFromEnum(set);
    const star_int = @intFromEnum(star);
    const slot_int = @intFromEnum(slot);

    const disk_id: u16 = set_int + (10 * star_int) + slot_int;
    return disk_id;
}

test "getDiskId" {
    const set = DiskSet.@"Phaethons Melody";
    const star = DiskStar.@"S-Rank";
    const slot = DiskSlot.@"Slot-6";

    const id = getDiskId(set, star, slot);

    try std.testing.expectEqual(33046, id);
}

test "StatKind" {
    {
        const atk = StatKind.ATK_Percent;
        const atk_values = try atk.getDetails();

        try std.testing.expectEqual("%ATK", atk_values.name);
        try std.testing.expectEqualSlices(DiskSlot, &[_]DiskSlot{ .@"Slot-4", .@"Slot-5", .@"Slot-6" }, atk_values.main_slot.?);
        try std.testing.expectEqual(750, atk_values.main_value.?);
    }

    {
        const atk = try StatKind.getByName("%ATK").?.getDetails();
        try std.testing.expectEqual("%ATK", atk.name);
    }

    {
        const atk = try StatKind.getById(12102).?.getDetails();
        try std.testing.expectEqual("%ATK", atk.name);
    }
}

test "Avatar.rankForLevel" {
    try std.testing.expectEqual(@as(u32, 1), Avatar.rankForLevel(1));
    try std.testing.expectEqual(@as(u32, 1), Avatar.rankForLevel(10));
    try std.testing.expectEqual(@as(u32, 2), Avatar.rankForLevel(11));
    try std.testing.expectEqual(@as(u32, 2), Avatar.rankForLevel(20));
    try std.testing.expectEqual(@as(u32, 3), Avatar.rankForLevel(21));
    try std.testing.expectEqual(@as(u32, 6), Avatar.rankForLevel(51));
    try std.testing.expectEqual(@as(u32, 6), Avatar.rankForLevel(60));
}

test "Mindscape.toTabBits" {
    try std.testing.expectEqual(@as(u6, 0), Mindscape.M0.toTabBits());
    try std.testing.expectEqual(@as(u6, 1), Mindscape.M1.toTabBits());
    try std.testing.expectEqual(@as(u6, 2), Mindscape.M2.toTabBits());
    try std.testing.expectEqual(@as(u6, 16), Mindscape.M5.toTabBits());
    try std.testing.expectEqual(@as(u6, 32), Mindscape.M6.toTabBits());
}

test "Skill" {
    try std.testing.expectEqual(@as(usize, 7), Skill.count);
    try std.testing.expectEqual(@as(u32, 12), Skill.common_attack.maxLevel());
    try std.testing.expectEqual(@as(u32, 7), Skill.core_skill.maxLevel());
    try std.testing.expectEqual("Core Skill", Skill.core_skill.name());
    try std.testing.expectEqual("Assist Skill", Skill.assist_skill.name());
}
