const log = std.log.scoped(.@"Sunbringer::ditherless");

var game_assembly_instance: GameAssembly = undefined; // Populated by `init`

pub fn init(assembly: GameAssembly) !void {
    game_assembly_instance = assembly;

    for (assembly.offsetGroup(.dither_alpha_strings)) |dither_alpha_string| {
        const string: **const String = @ptrFromInt(dither_alpha_string);
        string.* = assembly.ptrToStringAnsi("InvalidProperty");
    }
}

const String = GameAssembly.String;

const GameAssembly = @import("../GameAssembly.zig");

const std = @import("std");
