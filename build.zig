const std = @import("std");

pub fn build(b: *std.Build) void {
    const target = b.standardTargetOptions(.{ .default_target = .{ .os_tag = .windows } });
    const optimize = b.standardOptimizeOption(.{});

    const launcher = b.addExecutable(.{
        .name = "Sunbringer",
        .win32_manifest = b.addWriteFiles().add(
            "launcher.manifest",
            @embedFile("win32_manifest.xml"),
        ),
        .root_module = b.createModule(.{
            .root_source_file = b.path("src/launcher.zig"),
            .target = target,
            .optimize = optimize,
        }),
    });
    b.installArtifact(launcher);

    const dynlib = b.addLibrary(.{
        .name = "Covenant_of_Dayat",
        .linkage = .dynamic,
        .root_module = b.createModule(.{
            .root_source_file = b.path("src/dynlib.zig"),
            .target = target,
            .optimize = optimize,
        }),
    });
    b.installArtifact(dynlib);

    const assets_dir = b.build_root.handle.openDir(b.graph.io, "assets", .{ .iterate = true }) catch |err| {
        std.debug.panic("unable to open assets directory: {t}", .{err});
    };
    defer assets_dir.close(b.graph.io);

    var it = assets_dir.iterateAssumeFirstIteration();
    while (it.next(b.graph.io) catch @panic("failed to read dir")) |entry| {
        if (std.mem.startsWith(u8, entry.name, ".") or entry.kind != .file)
            continue;

        dynlib.root_module.addAnonymousImport(
            entry.name,
            .{ .root_source_file = b.path(b.fmt("assets/{s}", .{entry.name})) },
        );
    }
}
