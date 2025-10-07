const root = @import("root");

pub fn readCSharpString(data: usize) []u16 {
    const len = @as(*const u32, @ptrFromInt(data + 16)).*;
    const ptr = @as([*]u16, @ptrFromInt(data + 20));
    return ptr[0..len];
}

pub fn csharpStringReplace(object: usize, pattern: []const u16, replacement: []const u16) void {
    const str = readCSharpString(object);

    @memcpy(str[0..replacement.len], replacement);
    @memmove(str[replacement.len .. str.len - (pattern.len - replacement.len)], str[pattern.len..str.len]);
    @as(*u32, @ptrFromInt(object + 16)).* = @intCast(str.len - (pattern.len - replacement.len));
}

pub fn ptrToStringAnsi(str: []const u8) usize {
    return @as(*const fn ([*]const u8) callconv(.c) usize, @ptrFromInt(root.base + root.offsets.unwrapOffset(.PTR_TO_STRING_ANSI)))(str.ptr);
}
