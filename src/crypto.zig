const std = @import("std");
const root = @import("root");
const zz = @import("zigzag");
const util = @import("util.zig");
const offsets = root.offsets;

const sdk_public_key = @embedFile("sdk_public_key.xml");
const server_public_key = @embedFile("server_public_key.xml");

pub fn init(allocator: zz.ChunkAllocator) void {
    const base = root.base;

    @as(*usize, @ptrFromInt(base + offsets.unwrapOffset(.CRYPTO_STR_1))).* = util.ptrToStringAnsi(sdk_public_key);

    // แก้เป็น UTF-8 และใช้ \x00 แทน \0
    const new_msg = "<color=#ff8000>นี่คือเวอร์ชั่นทดสอบ ยังไม่ได้ระดับคุณภาพของเกม</color> <color=#FF0000>Ze</color><color=#FF7F00>nl</color><color=#FFFF00>ess</color> <color=#00FF00>Gay</color> <color=#0000FF>Ze</color><color=#4B0082>ro</color> | <color=#ff0000>Horoyoi-san ඞ</color>\x00";

    // ส่ง slice ตรงๆ
    @as(*usize, @ptrFromInt(base + offsets.unwrapOffset(.CRYPTO_STR_2))).* =
        util.ptrToStringAnsi(new_msg);

    initializeRsaCryptoServiceProvider();

    _ = root.intercept(allocator, base + offsets.unwrapOffset(.SDK_RSA_ENCRYPT), SdkRsaEncryptHook);
    _ = root.intercept(allocator, base + offsets.unwrapOffset(.NETWORK_STATE_CHANGE), NetworkStateHook);
}

const SdkRsaEncryptHook = struct {
    pub var originalFn: *const fn (usize, usize) callconv(.c) usize = undefined;

    pub fn callback(_: usize, a2: usize) callconv(.c) usize {
        std.log.debug("Replacing SDK RSA key", .{});
        return @This().originalFn(
            util.ptrToStringAnsi(sdk_public_key),
            a2,
        );
    }
};

const NetworkStateHook = struct {
    pub var originalFn: *const fn (usize, usize) callconv(.c) usize = undefined;

    pub fn callback(state: usize, a2: usize) callconv(.c) usize {
        if (state == 15) initializeRsaCryptoServiceProvider();
        return @This().originalFn(state, a2);
    }
};

pub fn initializeRsaCryptoServiceProvider() void {
    const base = root.base;

    const statics = @as(*usize, @ptrFromInt(base + offsets.unwrapOffset(.RSA_STATICS))).*;
    const rcsp_field: *usize = @ptrFromInt(statics + offsets.unwrapOffset(.RSA_STATIC_ID));

    const rsaCreate: *const fn () callconv(.c) usize = @ptrFromInt(base + offsets.unwrapOffset(.RSA_CREATE));
    const rsaFromXmlString: *const fn (usize, usize) callconv(.c) void = @ptrFromInt(base + offsets.unwrapOffset(.RSA_FROM_XML_STRING));

    const instance = rsaCreate();
    rsaFromXmlString(instance, util.ptrToStringAnsi(server_public_key));

    rcsp_field.* = instance;
}
