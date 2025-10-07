const std = @import("std");

pub fn build(b: *std.Build) void {
    const optimize = b.standardOptimizeOption(.{});
    const target = b.standardTargetOptions(.{ .default_target = .{ .os_tag = .windows } });

    const launcher = b.addExecutable(.{
        .name = "yidhari",
        .root_module = b.createModule(.{
            .root_source_file = b.path("injector.zig"),
            .target = target,
            .optimize = optimize,
        }),
    });

    const dll = b.addLibrary(.{
        .name = "tentacle",
        .linkage = .dynamic,
        .root_module = b.createModule(.{
            .root_source_file = b.path("src/root.zig"),
            .target = target,
            .optimize = optimize,
            .imports = &.{.{ .name = "zigzag", .module = b.dependency("zigzag", .{}).module("zigzag") }},
        }),
    });

    const assets = &.{ "sdk_public_key.xml", "server_public_key.xml", "offsets" };

    inline for (assets) |asset| {
        dll.root_module.addAnonymousImport(asset, .{ .root_source_file = b.path("assets/" ++ asset) });
    }

    b.installArtifact(launcher);
    b.installArtifact(dll);
}
