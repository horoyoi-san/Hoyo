const log = std.log.scoped(.@"Moonlight_Whispers::sec_engine");

pub fn init(assembly: GameAssembly) !void {
    try interceptor.replace(assembly.offset(.config_is_load_mhy_base), isLoadMHYBase);
}

fn isLoadMHYBase() callconv(.c) bool {
    log.info("isLoadMHYBase -> false", .{});
    return false;
}

const interceptor = @import("../interceptor.zig");
const GameAssembly = @import("../GameAssembly.zig");

const std = @import("std");
