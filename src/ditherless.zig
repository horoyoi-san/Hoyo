const root = @import("root");
const util = @import("util.zig");

const offsets = root.offsets;

pub fn init() void {
    const base = root.base;

    if (offsets.DITHER_ALPHA_STR_1) |offset| @as(*usize, @ptrFromInt(base + offset)).* = util.ptrToStringAnsi("InvalidProperty");
    if (offsets.DITHER_ALPHA_STR_2) |offset| @as(*usize, @ptrFromInt(base + offset)).* = util.ptrToStringAnsi("InvalidProperty");
}
