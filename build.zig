pub fn build(b: *Build) void {
    const target = b.standardTargetOptions(.{ .default_target = .{ .os_tag = .windows } });
    const optimize = b.standardOptimizeOption(.{});

    const launcher = b.addExecutable(.{
        .name = "Remielle",
        .root_module = b.createModule(.{
            .root_source_file = b.path("src/launcher.zig"),
            .target = target,
            .optimize = optimize,
        }),
    });

    const dll = b.addLibrary(.{
        .name = "Moonlight_Whispers",
        .linkage = .dynamic,
        .root_module = b.createModule(.{
            .root_source_file = b.path("src/dynlib.zig"),
            .target = target,
            .optimize = optimize,
        }),
    });

    launcher.root_module.addAnonymousImport(
        "offsets.zon",
        .{ .root_source_file = b.path("assets/offsets.zon") },
    );

    inline for (.{
        "offsets.zon",
        "login_setting.json",
        "server_pc.json",
        "sdk_public_key.xml",
        "server_public_key.xml",
    }) |asset| dll.root_module.addAnonymousImport(
        asset,
        .{ .root_source_file = b.path("assets/" ++ asset) },
    );

    b.installArtifact(launcher);
    b.installArtifact(dll);
}

const Build = std.Build;
const std = @import("std");
