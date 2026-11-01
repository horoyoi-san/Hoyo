//! dvui screens: the top-level tab bar plus each tab's content.

const std = @import("std");
const dvui = @import("dvui");

const net = @import("net.zig");
const commands = @import("commands.zig");
const game_data = @import("game_data.zig");

const DiskSet = game_data.DiskSet;
const DiskSlot = game_data.DiskSlot;
const DiskStar = game_data.DiskStar;
const StatKind = game_data.StatKind;
const Agent = game_data.Agent;
const Mindscape = game_data.Mindscape;
const Weapon = game_data.Weapon;
const WeaponRefinement = game_data.WeaponRefinement;

pub fn toastErr(src: std.builtin.SourceLocation, msg: []const u8, timeout: ?i32) void {
    const inner = struct {
        fn toastDisplay(id: dvui.Id) anyerror!void {
            const message = dvui.dataGetSlice(null, id, "_message", []u8) orelse {
                std.log.err("toastDisplay lost data for toast {x}\n", .{id});
                dvui.toastRemove(id);
                return;
            };

            var animator = dvui.animate(@src(), .{ .kind = .alpha, .duration = 500_000 }, .{ .id_extra = id.asUsize(), .gravity_x = 0.5 });
            defer animator.deinit();
            var label_wd: dvui.WidgetData = undefined;

            dvui.labelNoFmt(@src(), message, .{}, .{
                .background = true,
                .color_fill = .{ .color = dvui.Color.lighten(.red, -25) },
                .corners = .all(1000),
                .padding = .{ .x = 16, .y = 8, .w = 16, .h = 8 },
                .data_out = &label_wd,
            });
            if (label_wd.accesskit_node()) |ak_node| {
                dvui.AccessKit.nodeSetLive(ak_node, dvui.AccessKit.Live.polite);
            }
            if (dvui.timerDone(id)) {
                animator.startEnd();
            }

            if (animator.end()) {
                dvui.toastRemove(id);

                // this informs our parent that we don't need any space next frame
                animator.data().min_size = .{};
            }
        }
    };
    var message_buffer: [1024]u8 = undefined;
    dvui.toast(src, .{ .message = std.fmt.bufPrint(&message_buffer, "ERROR: {s}", .{msg}) catch unreachable, .timeout = timeout, .displayFn = inner.toastDisplay });
}

pub fn toastSuccess(src: std.builtin.SourceLocation, msg: []const u8, timeout: ?i32) void {
    const inner = struct {
        fn toastDisplay(id: dvui.Id) anyerror!void {
            const message = dvui.dataGetSlice(null, id, "_message", []u8) orelse {
                std.log.err("toastDisplay lost data for toast {x}\n", .{id});
                dvui.toastRemove(id);
                return;
            };

            var animator = dvui.animate(@src(), .{ .kind = .alpha, .duration = 500_000 }, .{ .id_extra = id.asUsize(), .gravity_x = 0.5 });
            defer animator.deinit();
            var label_wd: dvui.WidgetData = undefined;

            dvui.labelNoFmt(@src(), message, .{}, .{
                .background = true,
                .color_fill = .{ .color = dvui.Color.lighten(.green, -25) },
                .corners = .all(1000),
                .padding = .{ .x = 16, .y = 8, .w = 16, .h = 8 },
                .data_out = &label_wd,
            });
            if (label_wd.accesskit_node()) |ak_node| {
                dvui.AccessKit.nodeSetLive(ak_node, dvui.AccessKit.Live.polite);
            }
            if (dvui.timerDone(id)) {
                animator.startEnd();
            }

            if (animator.end()) {
                dvui.toastRemove(id);

                // this informs our parent that we don't need any space next frame
                animator.data().min_size = .{};
            }
        }
    };

    var message_buffer: [1024]u8 = undefined;
    dvui.toast(src, .{ .message = std.fmt.bufPrint(&message_buffer, "SUCCESS: {s}", .{msg}) catch unreachable, .timeout = timeout, .displayFn = inner.toastDisplay });
}

pub fn tabMenu() !void {
    var hbox = dvui.box(@src(), .{ .dir = .horizontal }, .{
        .expand = .horizontal,
        .background = true,
    });

    const tab_menu = dvui.tabs(@src(), .{ .dir = .horizontal }, .{});
    tab_menu.deinit();

    const active_tab = dvui.dataGetPtrDefault(null, hbox.data().id, "active_tab", usize, 0);

    if (tab_menu.addTabLabel(active_tab.* == 0, "Disks", .{})) {
        active_tab.* = 0;
    }
    if (tab_menu.addTabLabel(active_tab.* == 1, "Character", .{})) {
        active_tab.* = 1;
    }
    if (tab_menu.addTabLabel(active_tab.* == 2, "Weapon", .{})) {
        active_tab.* = 2;
    }

    hbox.deinit();

    switch (active_tab.*) {
        0 => try tabDisks(),
        1 => try tabCharacters(),
        2 => try tabWeapons(),
        else => {},
    }
}

// Equipment creation
pub fn tabDisks() !void {
    var vbox = dvui.box(@src(), .{ .dir = .vertical }, .{ .gravity_x = 0.5 });
    defer vbox.deinit();

    _ = dvui.spacer(@src(), .{ .min_size_content = .{ .h = 20 } });

    dvui.label(@src(), "Create Disk", .{}, .{ .font = dvui.Font.theme(.heading).withSize(15), .gravity_x = 0.5 });

    const selected_disk = dvui.dataGetPtrDefault(null, vbox.data().id, "selected_disk", ?DiskSet, null);
    const selected_slot = dvui.dataGetPtrDefault(null, vbox.data().id, "selected_slot", ?DiskSlot, null);
    const selected_star = dvui.dataGetPtrDefault(null, vbox.data().id, "selected_star", ?DiskStar, null);
    const selected_mainstat = dvui.dataGetPtrDefault(null, vbox.data().id, "selected_mainstat", ?StatKind, null);

    const selected_substat_1 = dvui.dataGetPtrDefault(null, vbox.data().id, "selected_substat_1", ?StatKind, null);
    const selected_substat_2 = dvui.dataGetPtrDefault(null, vbox.data().id, "selected_substat_2", ?StatKind, null);
    const selected_substat_3 = dvui.dataGetPtrDefault(null, vbox.data().id, "selected_substat_3", ?StatKind, null);
    const selected_substat_4 = dvui.dataGetPtrDefault(null, vbox.data().id, "selected_substat_4", ?StatKind, null);

    const substat_ptrs = [4]*?StatKind{ selected_substat_1, selected_substat_2, selected_substat_3, selected_substat_4 };

    const sub_1_result = dvui.dataGetPtrDefault(null, vbox.data().id, "sub_1_result", dvui.TextEntryNumberResult(u32), .{ .value = .Empty });
    const sub_2_result = dvui.dataGetPtrDefault(null, vbox.data().id, "sub_2_result", dvui.TextEntryNumberResult(u32), .{ .value = .Empty });
    const sub_3_result = dvui.dataGetPtrDefault(null, vbox.data().id, "sub_3_result", dvui.TextEntryNumberResult(u32), .{ .value = .Empty });
    const sub_4_result = dvui.dataGetPtrDefault(null, vbox.data().id, "sub_4_result", dvui.TextEntryNumberResult(u32), .{ .value = .Empty });

    const label_min_size_w = 50;

    { // Disk
        var box_disk = dvui.box(@src(), .{ .dir = .horizontal }, .{ .gravity_x = 0.5, .expand = .horizontal });
        defer box_disk.deinit();
        dvui.label(@src(), "Disk: ", .{}, .{ .gravity_y = 0.5, .min_size_content = .{ .w = label_min_size_w } });
        if (dvui.dropdownEnum(@src(), DiskSet, .{ .choice_nullable = selected_disk }, .{ .null_selectable = true }, .{ .min_size_content = .{ .w = 210 }, .expand = .horizontal })) {
            if (selected_disk.*) |disk| {
                std.log.debug("selected: {s}", .{@tagName(disk)});
            }
        }
    }

    { // Star
        var box_star = dvui.box(@src(), .{ .dir = .horizontal }, .{ .gravity_x = 0.5, .expand = .horizontal });
        defer box_star.deinit();
        dvui.label(@src(), "Star: ", .{}, .{ .gravity_y = 0.5, .min_size_content = .{ .w = label_min_size_w } });
        if (dvui.dropdownEnum(@src(), DiskStar, .{ .choice_nullable = selected_star }, .{ .null_selectable = true }, .{ .expand = .horizontal })) {
            if (selected_star.*) |star| {
                std.log.debug("selected: {s}", .{@tagName(star)});
            }
        }
    }

    {
        var box_slot = dvui.box(@src(), .{ .dir = .horizontal }, .{ .gravity_x = 0.5, .expand = .horizontal });
        defer box_slot.deinit();
        dvui.label(@src(), "Slot: ", .{}, .{ .gravity_y = 0.5, .min_size_content = .{ .w = label_min_size_w } });
        if (dvui.dropdownEnum(@src(), DiskSlot, .{ .choice_nullable = selected_slot }, .{ .null_selectable = true }, .{ .expand = .horizontal })) {
            if (selected_slot.*) |slot| {
                std.log.debug("selected: {s}", .{@tagName(slot)});
            }

            // Slot changed => Reset Stats
            selected_mainstat.* = null;
            selected_substat_1.* = null;
            selected_substat_2.* = null;
            selected_substat_3.* = null;
            selected_substat_4.* = null;
        }
    }

    _ = dvui.spacer(@src(), .{ .min_size_content = .{ .h = 20 } });

    { // Mainstat
        var box_mainstat = dvui.box(@src(), .{ .dir = .horizontal }, .{ .gravity_x = 0.5, .expand = .horizontal });
        defer box_mainstat.deinit();
        dvui.label(@src(), "Main: ", .{}, .{ .gravity_y = 0.5, .min_size_content = .{ .w = label_min_size_w } });

        if (selected_slot.*) |slot| {
            const mainstat_options = game_data.mainStatsForSlot(slot);

            var mainstat_labels: [game_data.max_mainstats_per_slot][]const u8 = undefined;
            for (mainstat_options, 0..) |stat, i| {
                mainstat_labels[i] = (stat.getDetails() catch unreachable).name;
            }

            // Find the current selection's index in this slot's option list
            // (it may be missing if the slot was just changed).
            var mainstat_index: ?usize = null;
            if (selected_mainstat.*) |cur| {
                for (mainstat_options, 0..) |stat, i| {
                    if (stat == cur) {
                        mainstat_index = i;
                        break;
                    }
                }
            }
            if (selected_mainstat.* != null and mainstat_index == null) {
                selected_mainstat.* = null; // stale pick from a previous slot
            }

            // If only 1 Main applies (in case of D1,D2,D3) directly set it
            if (mainstat_options.len == 1) {
                dvui.labelNoFmt(@src(), mainstat_labels[0], .{}, .{
                    .gravity_y = 0.5,
                    .style = .control,
                    .corners = .default,
                    .background = false,
                    .expand = .horizontal,
                });
                selected_mainstat.* = mainstat_options[0];
            } else {
                if (dvui.dropdown(
                    @src(),
                    mainstat_labels[0..mainstat_options.len],
                    .{ .choice_nullable = &mainstat_index },
                    .{ .null_selectable = true },
                    .{ .expand = .horizontal },
                )) {
                    selected_mainstat.* = if (mainstat_index) |i| mainstat_options[i] else null;
                }
            }
        } else {
            dvui.labelNoFmt(@src(), "Select a slot first", .{}, .{
                .gravity_y = 0.5,
                .style = .control,
                .color_text = .{ .color = dvui.themeGet().color(.content, .text).opacity(0.67) },
                .corners = .default,
                .background = false,
                .expand = .horizontal,
            });
        }
    }

    { // Substat 1
        var box_substat_1 = dvui.box(@src(), .{ .dir = .horizontal }, .{ .gravity_x = 0.5, .expand = .horizontal });
        defer box_substat_1.deinit();
        dvui.label(@src(), "Sub 1: ", .{}, .{ .gravity_y = 0.5, .min_size_content = .{ .w = label_min_size_w } });
        tabDisksSubstatBox(1, selected_mainstat.*, substat_ptrs, selected_slot.*);

        sub_1_result.* = dvui.textEntryNumber(@src(), u32, .{ .placeholder = "0", .value = if (sub_1_result.value == .Valid) &sub_1_result.value.Valid else null }, .{});
    }

    { // Substat 2
        var box_substat_2 = dvui.box(@src(), .{ .dir = .horizontal }, .{ .gravity_x = 0.5, .expand = .horizontal });
        defer box_substat_2.deinit();
        dvui.label(@src(), "Sub 2: ", .{}, .{ .gravity_y = 0.5, .min_size_content = .{ .w = label_min_size_w } });
        tabDisksSubstatBox(2, selected_mainstat.*, substat_ptrs, selected_slot.*);
        sub_2_result.* = dvui.textEntryNumber(@src(), u32, .{ .placeholder = "0", .value = if (sub_2_result.value == .Valid) &sub_2_result.value.Valid else null }, .{});
    }

    { // Substat 3
        var box_substat_3 = dvui.box(@src(), .{ .dir = .horizontal }, .{ .gravity_x = 0.5, .expand = .horizontal });
        defer box_substat_3.deinit();
        dvui.label(@src(), "Sub 3: ", .{}, .{ .gravity_y = 0.5, .min_size_content = .{ .w = label_min_size_w } });
        tabDisksSubstatBox(3, selected_mainstat.*, substat_ptrs, selected_slot.*);
        sub_3_result.* = dvui.textEntryNumber(@src(), u32, .{ .placeholder = "0", .value = if (sub_3_result.value == .Valid) &sub_3_result.value.Valid else null }, .{});
    }

    { // Substat 4
        var box_substat_4 = dvui.box(@src(), .{ .dir = .horizontal }, .{ .gravity_x = 0.5, .expand = .horizontal });
        defer box_substat_4.deinit();
        dvui.label(@src(), "Sub 4: ", .{}, .{ .gravity_y = 0.5, .min_size_content = .{ .w = label_min_size_w } });
        tabDisksSubstatBox(4, selected_mainstat.*, substat_ptrs, selected_slot.*);
        sub_4_result.* = dvui.textEntryNumber(@src(), u32, .{ .placeholder = "0", .value = if (sub_4_result.value == .Valid) &sub_4_result.value.Valid else null }, .{});
    }

    // Total Additional Subs
    var sub_total_string: [1024]u8 = @splat(0);
    var sub_total: u32 = 0;
    if (sub_1_result.value == .Valid) sub_total += sub_1_result.value.Valid;
    if (sub_2_result.value == .Valid) sub_total += sub_2_result.value.Valid;
    if (sub_3_result.value == .Valid) sub_total += sub_3_result.value.Valid;
    if (sub_4_result.value == .Valid) sub_total += sub_4_result.value.Valid;

    _ = dvui.spacer(@src(), .{ .min_size_content = .{ .h = 20 } });

    // Maximal Substat rolls allowed. Otherwise show error.
    // Based on the selected star/rank
    const max_rolls: u8 = blk: {
        if (selected_star.*) |star| {
            switch (star) {
                .@"S-Rank" => break :blk 5,
                .@"A-Rank" => break :blk 4,
                .@"B-Rank" => break :blk 3,
            }
        } else {
            break :blk 0;
        }
    };

    if (sub_total > max_rolls) {
        dvui.labelNoFmt(@src(), try std.fmt.bufPrint(&sub_total_string, "Total Subs: {d} - Total Subs cant be more than {d}!", .{ sub_total, max_rolls }), .{}, .{ .color_text = .red });
    } else {
        dvui.labelNoFmt(@src(), try std.fmt.bufPrint(&sub_total_string, "Total Subs: {d}", .{sub_total}), .{}, .{});
    }

    _ = dvui.spacer(@src(), .{ .min_size_content = .{ .h = 20 } });

    if (dvui.button(@src(), "Create Disk", .{}, .{ .expand = .horizontal })) create_disk: {
        if (selected_disk.* == null or selected_slot.* == null or selected_star.* == null) {
            toastErr(
                @src(),
                "Disk, Slot and Star cant be empty!",
                3 * 1000 * 1000,
            );
            break :create_disk;
        }

        if (selected_mainstat.* == null) {
            toastErr(
                @src(),
                "Select a Mainstat!",
                3 * 1000 * 1000,
            );
            break :create_disk;
        }

        // All subs have to be selected
        if (selected_substat_1.* == null or
            selected_substat_2.* == null or
            selected_substat_3.* == null or
            selected_substat_4.* == null)
        {
            toastErr(
                @src(),
                "Choose all 4 substats!",
                3 * 1000 * 1000,
            );
            break :create_disk;
        }

        if (sub_total > max_rolls) {
            toastErr(
                @src(),
                "Total substat rolls too high for the selected star/rank!",
                3 * 1000 * 1000,
            );
            break :create_disk;
        }

        // Create Disk Button
        var err_diag: net.ErrorDiag = .{ .err = null };
        if (commands.createDisk(dvui.io, selected_disk.*.?, selected_star.*.?, selected_slot.*.?, .{
            .main = .{ .stat_kind = selected_mainstat.*.? },
            .sub_1 = .{
                .stat_kind = selected_substat_1.*.?,
                .sub_count = if (sub_1_result.*.value == .Valid) @intCast(sub_1_result.*.value.Valid) else 0,
            },
            .sub_2 = .{
                .stat_kind = selected_substat_2.*.?,
                .sub_count = if (sub_2_result.*.value == .Valid) @intCast(sub_2_result.*.value.Valid) else 0,
            },
            .sub_3 = .{
                .stat_kind = selected_substat_3.*.?,
                .sub_count = if (sub_3_result.*.value == .Valid) @intCast(sub_3_result.*.value.Valid) else 0,
            },
            .sub_4 = .{
                .stat_kind = selected_substat_4.*.?,
                .sub_count = if (sub_4_result.*.value == .Valid) @intCast(sub_4_result.*.value.Valid) else 0,
            },
        }, &err_diag)) |_| {
            toastSuccess(
                @src(),
                "Disk has been created",
                3 * 1000 * 1000,
            );
        } else |err| {
            toastErr(
                @src(),
                err_diag.message() orelse @errorName(err),
                2 * 1000 * 1000,
            );
        }
    }

    if (dvui.button(@src(), "Create Random Disk", .{}, .{ .expand = .horizontal })) create_rand_disk: {
        if (selected_disk.* == null or selected_slot.* == null or selected_star.* == null) {
            toastErr(
                @src(),
                "Disk, Slot and Star cant be empty!",
                3 * 1000 * 1000,
            );
            break :create_rand_disk;
        }

        if (selected_mainstat.* == null) {
            toastErr(
                @src(),
                "Select a Mainstat!",
                3 * 1000 * 1000,
            );
            break :create_rand_disk;
        }

        // Reset substats to null
        selected_substat_1.* = null;
        selected_substat_2.* = null;
        selected_substat_3.* = null;
        selected_substat_4.* = null;
        sub_total = 0;
        sub_1_result.value = .{ .Valid = 0 };
        sub_2_result.value = .{ .Valid = 0 };
        sub_3_result.value = .{ .Valid = 0 };
        sub_4_result.value = .{ .Valid = 0 };

        const rng_impl: std.Random.IoSource = .{ .io = dvui.io };
        const rng = rng_impl.interface();

        // Random Substat from available pool
        // Random sub count up to the allowed maximum rolls
        for (0..4) |substat_i| {
            const sub_rolls_left = max_rolls - sub_total;
            var buf: [game_data.substat_pool.len]StatKind = undefined;
            var current_subs: [4]?StatKind = undefined;
            for (substat_ptrs, 0..) |p, i| current_subs[i] = p.*;
            const options = game_data.availableSubstats(selected_mainstat.*, current_subs, substat_i, &buf);

            const index_option = rng.uintAtMost(usize, options.len - 1);
            substat_ptrs[substat_i].* = options[index_option];
            var roll: u4 = 0;
            if (substat_i < 3) {
                roll = rng.uintAtMost(u4, @intCast(sub_rolls_left));
            } else {
                roll = @intCast(sub_rolls_left);
            }
            sub_total += roll;

            switch (substat_i) {
                0 => sub_1_result.value = .{ .Valid = roll },
                1 => sub_2_result.value = .{ .Valid = roll },
                2 => sub_3_result.value = .{ .Valid = roll },
                3 => sub_4_result.value = .{ .Valid = roll },
                else => unreachable,
            }
        }

        // Create Disk Button
        var err_diag: net.ErrorDiag = .{ .err = null };
        if (commands.createDisk(dvui.io, selected_disk.*.?, selected_star.*.?, selected_slot.*.?, .{
            .main = .{ .stat_kind = selected_mainstat.*.? },
            .sub_1 = .{
                .stat_kind = selected_substat_1.*.?,
                .sub_count = if (sub_1_result.*.value == .Valid) @intCast(sub_1_result.*.value.Valid) else 0,
            },
            .sub_2 = .{
                .stat_kind = selected_substat_2.*.?,
                .sub_count = if (sub_2_result.*.value == .Valid) @intCast(sub_2_result.*.value.Valid) else 0,
            },
            .sub_3 = .{
                .stat_kind = selected_substat_3.*.?,
                .sub_count = if (sub_3_result.*.value == .Valid) @intCast(sub_3_result.*.value.Valid) else 0,
            },
            .sub_4 = .{
                .stat_kind = selected_substat_4.*.?,
                .sub_count = if (sub_4_result.*.value == .Valid) @intCast(sub_4_result.*.value.Valid) else 0,
            },
        }, &err_diag)) |_| {
            toastSuccess(
                @src(),
                "Disk has been created",
                3 * 1000 * 1000,
            );
        } else |err| {
            toastErr(
                @src(),
                err_diag.message() orelse @errorName(err),
                2 * 1000 * 1000,
            );
        }
    }

    if (dvui.button(@src(), "Reset", .{}, .{ .expand = .horizontal })) {
        selected_disk.* = null;
        selected_slot.* = null;
        selected_star.* = null;
        selected_mainstat.* = null;
        selected_substat_1.* = null;
        selected_substat_2.* = null;
        selected_substat_3.* = null;
        selected_substat_4.* = null;
    }
}

// Box with the dropdown for the substat
// Takes other selected substat and mainstat into account,
// so duplicate substats are not possible
fn tabDisksSubstatBox(
    sub_number: usize,
    mainstat: ?StatKind,
    substats: [4]*?StatKind,
    selected_slot: ?DiskSlot,
) void {
    const width = 120;

    if (selected_slot) |_| {
        var current_values: [4]?StatKind = undefined;
        for (substats, 0..) |p, i| current_values[i] = p.*;

        var buf: [game_data.substat_pool.len]StatKind = undefined;
        const options = game_data.availableSubstats(mainstat, current_values, sub_number - 1, &buf);

        var labels: [game_data.substat_pool.len][]const u8 = undefined;
        for (options, 0..) |stat, i| labels[i] = (stat.getDetails() catch unreachable).name;

        const ptr = substats[sub_number - 1];
        var index: ?usize = null;
        if (ptr.*) |cur| {
            for (options, 0..) |stat, i| {
                if (stat == cur) {
                    index = i;
                    break;
                }
            }
        }
        if (ptr.* != null and index == null) {
            ptr.* = null; // stale pick, no longer valid (mainstat/slot changed)
        }

        if (dvui.dropdown(
            @src(),
            labels[0..options.len],
            .{ .choice_nullable = &index },
            .{ .null_selectable = true },
            .{ .expand = .horizontal, .id_extra = sub_number, .min_size_content = .{ .w = width } },
        )) {
            ptr.* = if (index) |i| options[i] else null;
        }
    } else {
        dvui.labelNoFmt(@src(), "Select a slot first", .{}, .{
            .gravity_y = 0.5,
            .style = .control,
            .color_text = .{ .color = dvui.themeGet().color(.content, .text).opacity(0.67) },
            .corners = .default,
            .background = false,
            .expand = .horizontal,
            .min_size_content = .{ .w = width },
        });
    }
}

// Character modification: level (and with it the "ascension" rank),
// skill levels and mindscape of the pre-selected agent.
pub fn tabCharacters() !void {
    var vbox = dvui.box(@src(), .{}, .{ .gravity_x = 0.5, .gravity_y = 0.5 });
    defer vbox.deinit();

    const selected_agent = dvui.dataGetPtrDefault(null, vbox.data().id, "selected_agent", ?Agent, null);
    const selected_mindscape = dvui.dataGetPtrDefault(null, vbox.data().id, "selected_mindscape", ?Mindscape, null);

    const level_result = dvui.dataGetPtrDefault(null, vbox.data().id, "level_result", dvui.TextEntryNumberResult(u32), .{ .value = .Empty });

    const skill_results: [game_data.Skill.count]*dvui.TextEntryNumberResult(u32) = blk: {
        var results: [game_data.Skill.count]*dvui.TextEntryNumberResult(u32) = undefined;
        var key_buf: [32]u8 = undefined;
        for (0..game_data.Skill.count, 0..) |_, i| {
            const key = std.fmt.bufPrint(&key_buf, "skill_{d}_result", .{i}) catch unreachable;
            results[i] = dvui.dataGetPtrDefault(null, vbox.data().id, key, dvui.TextEntryNumberResult(u32), .{ .value = .Empty });
        }
        break :blk results;
    };

    const label_min_size_w = 120;

    dvui.label(@src(), "Modify Character", .{}, .{ .font = dvui.Font.theme(.heading).withSize(15), .gravity_x = 0.5 });

    _ = dvui.spacer(@src(), .{ .min_size_content = .{ .h = 20 } });

    { // Agent
        var box_agent = dvui.box(@src(), .{ .dir = .horizontal }, .{ .gravity_x = 0.5, .expand = .horizontal });
        defer box_agent.deinit();
        dvui.label(@src(), "Agent: ", .{}, .{ .gravity_y = 0.5, .min_size_content = .{ .w = label_min_size_w } });
        if (dvui.dropdownEnum(@src(), Agent, .{ .choice_nullable = selected_agent }, .{ .null_selectable = true }, .{ .expand = .horizontal, .min_size_content = .{ .w = 150 } })) {}
    }

    { // Level
        var box_level = dvui.box(@src(), .{ .dir = .horizontal }, .{ .gravity_x = 0.5, .expand = .horizontal });
        defer box_level.deinit();
        dvui.label(@src(), "Level: ", .{}, .{ .gravity_y = 0.5, .min_size_content = .{ .w = label_min_size_w } });
        level_result.* = dvui.textEntryNumber(@src(), u32, .{
            .min = game_data.Avatar.level_min,
            .max = game_data.Avatar.level_max,
            .placeholder = "1-60",
        }, .{});
    }

    { // Rank (derived from the level, sent along with it)
        var box_rank = dvui.box(@src(), .{ .dir = .horizontal }, .{ .gravity_x = 0.5, .expand = .horizontal });
        defer box_rank.deinit();
        dvui.label(@src(), "Promotion: ", .{}, .{ .gravity_y = 0.5, .min_size_content = .{ .w = label_min_size_w } });
        var rank_buf: [32]u8 = undefined;
        const rank_text: []const u8 = blk: {
            switch (level_result.*.value) {
                .Valid => |level| {
                    const rank = game_data.Avatar.rankForLevel(level);
                    const printed = try std.fmt.bufPrint(&rank_buf, "{d} (levels {d}-{d})", .{ rank, (rank - 1) * 10 + 1, rank * 10 });
                    break :blk printed;
                },
                else => break :blk "-",
            }
            unreachable;
        };
        dvui.labelNoFmt(@src(), rank_text, .{}, .{
            .gravity_y = 0.5,
            .style = .control,
            .color_text = .{ .color = dvui.themeGet().color(.content, .text).opacity(0.67) },
            .corners = .default,
            .background = false,
        });
    }

    { // Mindscape
        var box_mindscape = dvui.box(@src(), .{ .dir = .horizontal }, .{ .gravity_x = 0.5, .expand = .horizontal });
        defer box_mindscape.deinit();
        dvui.label(@src(), "Mindscape: ", .{}, .{ .gravity_y = 0.5, .min_size_content = .{ .w = label_min_size_w } });
        if (dvui.dropdownEnum(@src(), Mindscape, .{ .choice_nullable = selected_mindscape }, .{ .null_selectable = true }, .{ .expand = .horizontal })) {}
    }

    _ = dvui.spacer(@src(), .{ .min_size_content = .{ .h = 20 } });

    { // Skills
        var label_buf: [32]u8 = undefined;
        var placeholder_buf: [32]u8 = undefined;

        for (game_data.Skill.allValues(), 0..) |skill, i| {
            var box_skill = dvui.box(@src(), .{ .dir = .horizontal }, .{ .gravity_x = 0.5, .expand = .horizontal, .id_extra = i });
            defer box_skill.deinit();

            dvui.labelNoFmt(
                @src(),
                std.fmt.bufPrint(&label_buf, "{s}: ", .{skill.name()}) catch unreachable,
                .{},
                .{ .gravity_y = 0.5, .min_size_content = .{ .w = label_min_size_w }, .id_extra = i },
            );

            skill_results[i].* = dvui.textEntryNumber(@src(), u32, .{
                .min = 1,
                .max = skill.maxLevel(),
                .placeholder = std.fmt.bufPrint(&placeholder_buf, "1-{d}", .{skill.maxLevel()}) catch unreachable,
            }, .{ .id_extra = i });
        }
    }

    _ = dvui.spacer(@src(), .{ .min_size_content = .{ .h = 20 } });

    if (dvui.button(@src(), "Apply", .{}, .{ .expand = .horizontal })) apply: {
        if (selected_agent.* == null) {
            toastErr(
                @src(),
                "Select an agent!",
                3 * 1000 * 1000,
            );
            break :apply;
        }

        const avatar_id: u32 = @intFromEnum(selected_agent.*.?);

        var err_diag: net.ErrorDiag = .{ .err = null };
        var message_buf: [1024]u8 = undefined;
        var changed = false;

        // Level (and the "ascension" rank derived from it)
        switch (level_result.*.value) {
            .Empty => {},
            .Valid => |level| {
                changed = true;
                if (commands.modAvatarLevel(dvui.io, avatar_id, level, &err_diag)) |_| {
                    // ack received
                } else |err| {
                    toastErr(
                        @src(),
                        err_diag.message() orelse @errorName(err),
                        2 * 1000 * 1000,
                    );
                    break :apply;
                }
            },
            .TooSmall, .TooBig => {
                toastErr(
                    @src(),
                    "Level must be between 1 and 60!",
                    3 * 1000 * 1000,
                );
                break :apply;
            },
            .Invalid => {
                toastErr(
                    @src(),
                    "Level is not a valid number!",
                    3 * 1000 * 1000,
                );
                break :apply;
            },
        }

        // Skills (entries left empty are not changed)
        for (game_data.Skill.allValues(), 0..) |skill, i| {
            switch (skill_results[i].*.value) {
                .Empty => continue,
                .Valid => |level| {
                    changed = true;
                    if (commands.modAvatarSkillLevel(dvui.io, avatar_id, skill, level, &err_diag)) |_| {
                        // ack received
                    } else |err| {
                        toastErr(
                            @src(),
                            err_diag.message() orelse @errorName(err),
                            2 * 1000 * 1000,
                        );
                        break :apply;
                    }
                },
                .TooSmall, .TooBig => {
                    toastErr(
                        @src(),
                        std.fmt.bufPrint(&message_buf, "{s} level must be between 1 and {d}!", .{ skill.name(), skill.maxLevel() }) catch unreachable,
                        3 * 1000 * 1000,
                    );
                    break :apply;
                },
                .Invalid => {
                    toastErr(
                        @src(),
                        std.fmt.bufPrint(&message_buf, "{s} level is not a valid number!", .{skill.name()}) catch unreachable,
                        3 * 1000 * 1000,
                    );
                    break :apply;
                },
            }
        }

        // Mindscape
        if (selected_mindscape.*) |mindscape| {
            changed = true;
            if (commands.modAvatarMindscape(dvui.io, avatar_id, mindscape, &err_diag)) |_| {
                // ack received
            } else |err| {
                toastErr(
                    @src(),
                    err_diag.message() orelse @errorName(err),
                    2 * 1000 * 1000,
                );
                break :apply;
            }
        }

        if (!changed) {
            toastErr(
                @src(),
                "Nothing to change - set a level, skill levels or a mindscape!",
                3 * 1000 * 1000,
            );
            break :apply;
        }

        toastSuccess(
            @src(),
            "Character updated",
            3 * 1000 * 1000,
        );
    }
}

pub fn tabWeapons() !void {
    var vbox = dvui.box(@src(), .{}, .{ .gravity_x = 0.5, .gravity_y = 0.5 });
    defer vbox.deinit();

    const selected_weapon = dvui.dataGetPtrDefault(null, vbox.data().id, "selected_weapon", ?Weapon, null);
    const selected_refinement = dvui.dataGetPtrDefault(null, vbox.data().id, "selected_refinement", ?WeaponRefinement, null);

    const level_result = dvui.dataGetPtrDefault(null, vbox.data().id, "level_result", dvui.TextEntryNumberResult(u32), .{ .value = .Empty });

    const label_min_size_w = 120;

    dvui.label(@src(), "Modify Weapon", .{}, .{ .font = dvui.Font.theme(.heading).withSize(15), .gravity_x = 0.5 });

    _ = dvui.spacer(@src(), .{ .min_size_content = .{ .h = 20 } });

    { // Weapon
        var box_agent = dvui.box(@src(), .{ .dir = .horizontal }, .{ .gravity_x = 0.5, .expand = .horizontal });
        defer box_agent.deinit();
        dvui.label(@src(), "Weapon: ", .{}, .{ .gravity_y = 0.5, .min_size_content = .{ .w = label_min_size_w } });
        if (dvui.dropdownEnum(@src(), Weapon, .{ .choice_nullable = selected_weapon }, .{ .null_selectable = true }, .{ .expand = .horizontal, .min_size_content = .{ .w = 230 } })) {}
    }

    { // Level
        var box_level = dvui.box(@src(), .{ .dir = .horizontal }, .{ .gravity_x = 0.5, .expand = .horizontal });
        defer box_level.deinit();
        dvui.label(@src(), "Level: ", .{}, .{ .gravity_y = 0.5, .min_size_content = .{ .w = label_min_size_w } });
        level_result.* = dvui.textEntryNumber(@src(), u32, .{
            .min = 1,
            .max = 60,
            .placeholder = "1-60",
        }, .{ .expand = .horizontal });
    }

    { // Refinement
        var box_mindscape = dvui.box(@src(), .{ .dir = .horizontal }, .{ .gravity_x = 0.5, .expand = .horizontal });
        defer box_mindscape.deinit();
        dvui.label(@src(), "Refinement: ", .{}, .{ .gravity_y = 0.5, .min_size_content = .{ .w = label_min_size_w } });
        if (dvui.dropdownEnum(@src(), WeaponRefinement, .{ .choice_nullable = selected_refinement }, .{ .null_selectable = true }, .{ .expand = .horizontal })) {}
    }

    _ = dvui.spacer(@src(), .{ .min_size_content = .{ .h = 20 } });

    if (dvui.button(@src(), "Apply", .{}, .{ .expand = .horizontal })) apply: {
        if (selected_weapon.* == null) {
            toastErr(
                @src(),
                "Select an weapon!",
                3 * 1000 * 1000,
            );
            break :apply;
        }

        var level: u6 = 1;
        switch (level_result.*.value) {
            .Valid => |lvl| {
                level = @intCast(lvl); // value is validated, safe to cast
            },
            .TooSmall, .TooBig => {
                toastErr(
                    @src(),
                    "Level must be between 1 and 60",
                    3 * 1000 * 1000,
                );
                break :apply;
            },
            .Invalid, .Empty => {
                toastErr(
                    @src(),
                    "Level is not a valid number!",
                    3 * 1000 * 1000,
                );
                break :apply;
            },
        }

        if (selected_refinement.* == null) {
            toastErr(
                @src(),
                "Select Refinement!",
                3 * 1000 * 1000,
            );
            break :apply;
        }

        var err_diag: net.ErrorDiag = .{ .err = null };

        if (commands.createWeapon(dvui.io, selected_weapon.*.?, level, selected_refinement.*.?, &err_diag)) |_| {
            // ack received, continue
        } else |err| {
            toastErr(
                @src(),
                err_diag.message() orelse @errorName(err),
                2 * 1000 * 1000,
            );
            break :apply;
        }

        toastSuccess(
            @src(),
            "Weapon created!",
            3 * 1000 * 1000,
        );
    }
}
