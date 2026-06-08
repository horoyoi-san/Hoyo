const log = std.log.scoped(.@"Sunbringer::various");

var game_assembly_instance: GameAssembly = undefined; // Populated by `init`

pub fn init(assembly: GameAssembly) !void {
    game_assembly_instance = assembly;

    try interceptor.write(assembly.offset(.refresh_gacha_time_icon), &.{0xC3});
}

const interceptor = @import("../interceptor.zig");
const GameAssembly = @import("../GameAssembly.zig");

const std = @import("std");
