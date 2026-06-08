const log = std.log.scoped(.@"Sunbringer::sec_engine");

pub fn init(assembly: GameAssembly) !void {
    if (assembly.optionalOffset(.config_is_load_mhy_base)) |address|
        try interceptor.replace(address, isLoadMHYBase);
}

fn isLoadMHYBase() callconv(.c) bool {
    log.info("isLoadMHYBase -> false", .{});
    return false;
}

const interceptor = @import("../interceptor.zig");
const GameAssembly = @import("../GameAssembly.zig");

const std = @import("std");
