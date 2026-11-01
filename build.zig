const std = @import("std");
const build_zig_zon = @import("build.zig.zon");

pub fn build(b: *std.Build) void {
    const target = b.standardTargetOptions(.{});
    const optimize = b.standardOptimizeOption(.{});

    const dvui_dep = b.dependency("dvui", .{ .target = target, .optimize = optimize, .backend = .sdl3 });

    const remielle_dep = b.dependency("remielle", .{});

    const exe = b.addExecutable(.{
        .name = "RemielleCtlUI",
        .root_module = b.createModule(.{
            .root_source_file = b.path("src/main.zig"),
            .target = target,
            .optimize = optimize,
        }),
    });

    if (b.graph.host.result.os.tag == .windows) {
        if (optimize == .Debug) {
            exe.subsystem = .console;
        } else {
            exe.subsystem = .Windows;
        }
    }

    exe.root_module.addImport("dvui", dvui_dep.module("dvui_sdl3"));
    exe.root_module.addImport("dvui-backend", dvui_dep.module("sdl3")); // for zls
    exe.root_module.addImport("remielle", remielle_dep.module("remielle"));
    exe.root_module.addAnonymousImport("config", .{ .root_source_file = b.path("config.zon") });

    const options = b.addOptions();
    options.addOption([:0]const u8, "version", build_zig_zon.version);
    exe.root_module.addOptions("build_zig_zon", options);

    b.installArtifact(exe);

    const step_check = b.step("check", "Check step for ZLS");
    const exe_check = b.addExecutable(.{
        .name = "RemielleCtlUI_check",
        .root_module = exe.root_module,
    });
    step_check.dependOn(&exe_check.step);

    const step_run = b.step(
        "run",
        "Run the app",
    );
    step_run.dependOn(&b.addRunArtifact(exe).step);
}
