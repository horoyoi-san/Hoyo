const root = @import("root");
const std = @import("std");

pub fn readCSharpString(data: usize) []u16 {
    const len = @as(*const u32, @ptrFromInt(data + 16)).*;
    const ptr = @as([*]u16, @ptrFromInt(data + 20));
    return ptr[0..len];
}

pub fn csharpStringReplace(object: usize, pattern: []const u16, replacement: []const u16, startIndex: usize) void {
    const str = readCSharpString(object);

    @memcpy(str[startIndex .. startIndex + replacement.len], replacement);
    @memmove(str[startIndex + replacement.len .. str.len - (pattern.len - replacement.len)], str[startIndex + pattern.len .. str.len]);
    // str[@intCast(str.len - (pattern.len - replacement.len))] = 0;
    @as(*u32, @ptrFromInt(object + 16)).* = @intCast(str.len - (pattern.len - replacement.len));
}

pub fn ptrToStringAnsi(str: []const u8) usize {
    return @as(*const fn ([*]const u8) callconv(.c) usize, @ptrFromInt(root.base + root.offsets.unwrapOffset(.PTR_TO_STRING_ANSI)))(str.ptr);
}
