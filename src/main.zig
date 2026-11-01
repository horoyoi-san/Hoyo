const std = @import("std");
const dvui = @import("dvui");
const dvui_backend = @import("dvui-backend");

const net = @import("net.zig");
const ui = @import("ui.zig");

const config = @import("build_zig_zon");

pub const dvui_app: dvui.App = .{
    .config = .{
        .startFn = appStart,
    },
    .frameFn = appFrame,
    .initFn = appInit,
    .deinitFn = appDeinit,
};

pub const main = dvui.App.main;
pub const panic = dvui.App.panic;
pub const std_options: std.Options = .{
    .logFn = dvui.App.logFn,
};

pub fn appStart() dvui.App.StartOptions {
    if (dvui_backend.kind == .sdl3 or dvui_backend.kind == .sdl2) {
        _ = dvui_backend.c.SDL_SetAppMetadata("Remielle-Control", config.version, "dev.f1rstzer0.RemielleControl");
    }

    return .{
        .size = .{ .w = 800, .h = 600 },
        .min_size = .{ .w = 250.0, .h = 600 },
        .title = "Remielle-Control",
        .persist_window_geometry = false,
    };
}

// Runs before the first frame, after backend and dvui.Window.init()
// - runs between win.begin()/win.end()
pub fn appInit(win: *dvui.Window) !void {
    _ = win;
    try net.open(dvui.io);
}

// Run as app is shutting down before dvui.Window.deinit()
pub fn appDeinit(win: *dvui.Window) void {
    _ = win;
    net.close(dvui.io);
}

pub fn appFrame() !dvui.App.Result {
    try ui.tabMenu();
    return .ok;
}

test {
    _ = @import("game_data.zig");
}
