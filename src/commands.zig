//! High-level server operations: takes domain values (game_data), builds
//! the corresponding protocol messages and drives them over net.zig.

const std = @import("std");
const remielle = @import("remielle");

const net = @import("net.zig");
const game_data = @import("game_data.zig");

const DiskSet = game_data.DiskSet;
const DiskSlot = game_data.DiskSlot;
const DiskStar = game_data.DiskStar;
const StatKind = game_data.StatKind;
const Weapon = game_data.Weapon;
const WeaponRefinement = game_data.WeaponRefinement;

const Event = remielle.control.Event;
const Operation = remielle.control.Operation;
const ModAvatarMeta = Operation.ModAvatarMeta;
const CreateWeapon = Operation.CreateWeapon;

/// The uid of the player whose avatars are modified.
const player_uid = @import("config").base_player_uid;

/// Builds a disk from the given set/star/slot, sends the create-equip
/// request to the server and waits for acknowledgement.
///
/// On failure, `err_diag` (if provided) carries a human-readable reason.
pub fn createDisk(io: std.Io, disk: DiskSet, star: DiskStar, slot: DiskSlot, stats: struct {
    main: struct { stat_kind: StatKind },
    sub_1: struct { stat_kind: StatKind, sub_count: u4 = 0 },
    sub_2: struct { stat_kind: StatKind, sub_count: u4 = 0 },
    sub_3: struct { stat_kind: StatKind, sub_count: u4 = 0 },
    sub_4: struct { stat_kind: StatKind, sub_count: u4 = 0 },
}, err_diag: *net.ErrorDiag) !void {
    std.log.debug("{any}", .{stats});

    var random_impl: std.Random.IoSource = .{ .io = io };
    const random = random_impl.interface();

    var creation_message: Operation.ExtendedMessageBuffer(Operation.CreateEquip, 1) = .init(.init(
        random.int(u32),
        .{
            .player_uid = player_uid,
            .count = 0, // Initial value must be zero. Will be incremented by appendAssumeCapacity.
        },
    ));

    var properties: [5]Operation.CreateEquip.Entry.Property = undefined;

    const main_stat_base_val = (try stats.main.stat_kind.getDetails()).main_value orelse 0;

    const main_stat: u12 = switch (star) {
        .@"B-Rank" => main_stat_base_val / 3 * 1,
        .@"A-Rank" => main_stat_base_val / 3 * 2,
        .@"S-Rank" => main_stat_base_val,
    };

    for (&properties, 0..) |*property, i| {
        property.* = switch (i + 1) {
            1 => .{
                .key = @intFromEnum(stats.main.stat_kind),
                .base_value = main_stat,
                .add_value = 0,
            },
            2 => .{
                .key = @intFromEnum(stats.sub_1.stat_kind),
                .base_value = (try stats.sub_1.stat_kind.getDetails()).sub_value orelse 0,
                .add_value = stats.sub_1.sub_count + 1,
            },
            3 => .{
                .key = @intFromEnum(stats.sub_2.stat_kind),
                .base_value = (try stats.sub_2.stat_kind.getDetails()).sub_value orelse 0,
                .add_value = stats.sub_2.sub_count + 1,
            },
            4 => .{
                .key = @intFromEnum(stats.sub_3.stat_kind),
                .base_value = (try stats.sub_3.stat_kind.getDetails()).sub_value orelse 0,
                .add_value = stats.sub_3.sub_count + 1,
            },
            5 => .{
                .key = @intFromEnum(stats.sub_4.stat_kind),
                .base_value = (try stats.sub_4.stat_kind.getDetails()).sub_value orelse 0,
                .add_value = stats.sub_4.sub_count + 1,
            },
            else => unreachable,
        };
    }

    creation_message.appendAssumeCapacity(.{
        .id = game_data.getDiskId(disk, star, slot),
        .properties = properties,
        .meta = .{
            .level = star.initialLevel(),
            .star = 5, // TODO: Check what star actually does
            .reserved = 0,
        },
    });

    try net.send(io, creation_message.payload());
    _ = try net.receive(Event.Ack, io, err_diag);
}

/// Sends a single ModAvatarMeta control operation for one field of one
/// avatar and waits for the server's acknowledgement.
///
/// On failure, `err_diag` (if provided) carries a human-readable reason.
pub fn modAvatarMetaField(io: std.Io, avatar_id: u32, field: ModAvatarMeta.Field, value: u64, err_diag: *net.ErrorDiag) !void {
    var random_impl: std.Random.IoSource = .{ .io = io };
    const random = random_impl.interface();

    const message: Operation.Message(ModAvatarMeta) = .init(random.int(u32), .{
        .player_uid = player_uid,
        .avatar_id = avatar_id,
        .field = field,
        .value = value,
    });

    try net.send(io, @ptrCast(&message));
    _ = try net.receive(Event.Ack, io, err_diag);
}

/// Sets the avatar's level and, with it, the "ascension" rank derived
/// from that level (rank 1 spans levels 1-10, rank 2 spans 11-20, ...).
pub fn modAvatarLevel(io: std.Io, avatar_id: u32, level: u32, err_diag: *net.ErrorDiag) !void {
    try modAvatarMetaField(io, avatar_id, .level, level, err_diag);
    try modAvatarMetaField(io, avatar_id, .rank, game_data.Avatar.rankForLevel(level), err_diag);
}

/// Sets the level of one of the avatar's skills.
pub fn modAvatarSkillLevel(io: std.Io, avatar_id: u32, skill: game_data.Skill, level: u32, err_diag: *net.ErrorDiag) !void {
    const encoded: ModAvatarMeta.Skill = .{ .skill = @intFromEnum(skill), .level = level };
    try modAvatarMetaField(io, avatar_id, .skill_level, @bitCast(encoded), err_diag);
}

/// Sets the avatar's mindscape from the selected one (M0 clears all tabs).
pub fn modAvatarMindscape(io: std.Io, avatar_id: u32, mindscape: game_data.Mindscape, err_diag: *net.ErrorDiag) !void {
    try modAvatarMetaField(io, avatar_id, .talents, @intFromEnum(mindscape), err_diag);
}

// Creates a weapon by sending the create-weapon message to the server
pub fn createWeapon(io: std.Io, weapon: Weapon, level: u6, refinement: WeaponRefinement, err_diag: *net.ErrorDiag) !void {
    var random_impl: std.Random.IoSource = .{ .io = io };
    const random = random_impl.interface();

    var creation_message: Operation.ExtendedMessageBuffer(Operation.CreateWeapon, 1) = .init(.init(
        random.int(u32),
        .{
            .player_uid = player_uid,
            .count = 0, // Initial value must be zero. Will be incremented by appendAssumeCapacity.
        },
    ));

    std.log.debug("Rank: {}", .{Weapon.rankForLevel(level)});

    creation_message.appendAssumeCapacity(.{
        .id = @intFromEnum(weapon),
        .meta = .{
            .level = level,
            .star = Weapon.rankForLevel(level),
            .refine = @intFromEnum(refinement),
            .reserved = 0,
        },
    });

    try net.send(io, @ptrCast(creation_message.payload()));
    _ = try net.receive(Event.Ack, io, err_diag);
}
