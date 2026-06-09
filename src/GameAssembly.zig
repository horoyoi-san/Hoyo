base: usize,

pub inline fn offset(g: GameAssembly, comptime name: Offsets.Name) usize {
    return g.base + @field(offsets, @tagName(name));
}

pub inline fn optionalOffset(g: GameAssembly, comptime name: Offsets.Name) ?usize {
    return g.base + (@field(offsets, @tagName(name)) orelse return null);
}

pub inline fn offsetGroup(
    g: GameAssembly,
    comptime name: Offsets.Name,
) [@field(offsets, @tagName(name)).len]usize {
    const group = @field(offsets, @tagName(name));
    var addresses: [group.len]usize = undefined;

    for (group, &addresses) |offset_value, *address|
        address.* = g.base + offset_value;

    return addresses;
}

pub const String = opaque {
    pub inline fn slice(s: *const String) []const u16 {
        const len: *const u32 = @ptrFromInt(@intFromPtr(s) + 16);
        const chars: [*]const u16 = @ptrFromInt(@intFromPtr(s) + 20);
        return chars[0..len.*];
    }
};

pub inline fn ptrToStringAnsi(g: GameAssembly, ansi: [*:0]const u8) *const String {
    const ptrToStringAnsiImpl: *const fn (
        [*:0]const u8,
    ) callconv(.c) *String = @ptrFromInt(g.offset(.ptr_to_string_ansi));

    return ptrToStringAnsiImpl(ansi);
}

pub fn setLoginSettingByJson(g: GameAssembly, json: [:0]const u8) void {
    const setLoginSettingByJsonImpl: *const fn (
        *const String,
    ) callconv(.c) void = @ptrFromInt(g.offset(.set_login_setting_by_json));

    setLoginSettingByJsonImpl(g.ptrToStringAnsi(json.ptr));
}

pub fn attachThread(g: GameAssembly) void {
    const domain: **anyopaque = @ptrFromInt(g.offset(.il2cpp_domain));
    const attachThreadImpl: *const fn (
        domain: *anyopaque,
    ) callconv(.c) void = @ptrFromInt(g.offset(.il2cpp_thread_attach));

    attachThreadImpl(domain.*);
}

pub fn setServerPublicKey(g: GameAssembly, rsa: *anyopaque) void {
    const statics: **anyopaque = @ptrFromInt(g.offset(.rsa_statics));
    const rsa_static: **anyopaque = @ptrFromInt(@intFromPtr(statics.*) + offsets.rsa_statics_id);
    rsa_static.* = rsa;
}

const Offsets = struct {
    il2cpp_domain: usize,
    il2cpp_thread_attach: usize,
    ptr_to_string_ansi: usize,
    set_login_setting_by_json: usize,
    load_file_delegate_invoke: usize,
    sdk_rsa_keys: []const usize,
    get_device_fp: usize,
    crypto_str: usize,
    rsa_create: usize,
    rsa_from_xml_string: usize,
    rsa_statics: usize,
    rsa_statics_id: usize,
    dither_alpha_strings: []const usize,
    refresh_gacha_time_icon: usize,
    config_is_load_mhy_base: usize,

    pub const Name = std.meta.FieldEnum(Offsets);
};

const offsets: Offsets = @import("offsets.zon");
const std = @import("std");
const GameAssembly = @This();
