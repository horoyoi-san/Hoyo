const log = std.log.scoped(.vortex);

fn start(assembly: GameAssembly) void {
    const init_delay: winapi.LARGE_INTEGER = @divTrunc((-4000 * std.time.ns_per_ms), 100);
    _ = ntdll.NtDelayExecution(.FALSE, &init_delay);

    patches.init(assembly) catch |err| {
        log.err("patches.init: {t}", .{err});
        return;
    };

    log.info("successfully initialized", .{});
}

pub export fn DllMain(
    _: winapi.HINSTANCE,
    reason: winapi.DWORD,
    _: winapi.LPVOID,
) callconv(.winapi) winapi.BOOL {
    if (reason == 1) {
        winapi.AllocConsole();

        const assembly: GameAssembly = .{
            .base = @intFromPtr(winapi.LoadLibraryA("GameAssembly.dll")),
        };

        patches.onLoad(assembly) catch |err| {
            log.err("patches.onLoad: {t}", .{err});
        };

        const thread = std.Thread.spawn(.{}, start, .{assembly}) catch unreachable;
        thread.detach();
    }

    return .TRUE;
}

const ntdll = std.os.windows.ntdll;

const winapi = @import("winapi.zig");
const patches = @import("patches.zig");
const GameAssembly = @import("GameAssembly.zig");

const std = @import("std");
