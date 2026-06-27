base: usize,

pub inline fn offset(g: GameAssembly, comptime name: Offsets.Name) usize {
    return g.base + @field(active_offsets, @tagName(name));
}

pub inline fn optionalOffset(g: GameAssembly, comptime name: Offsets.Name) ?usize {
    return g.base + (@field(active_offsets, @tagName(name)) orelse return null);
}

pub inline fn offsetGroup(
    g: GameAssembly,
    comptime name: Offsets.Name,
) [@field(offsets, @tagName(name)).len]usize {
    const default_group = @field(offsets, @tagName(name));
    const group = @field(active_offsets, @tagName(name));
    var addresses: [default_group.len]usize = undefined;

    for (group[0..addresses.len], &addresses) |offset_value, *address|
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
    const rsa_static: **anyopaque = @ptrFromInt(@intFromPtr(statics.*) + active_offsets.rsa_statics_id);
    rsa_static.* = rsa;
}

pub fn loadExternalOffsets() void {
    active_offsets = offsets;

    const handle = openFileWin32(&[_][*:0]const u8{ "offsets.zon", "Offsets.zon" }) orelse {
        createDefaultFile("offsets.zon", @embedFile("offsets.zon"));
        return;
    };
    defer _ = win.CloseHandle(handle);

    var bytes_read: win.DWORD = 0;
    const ok = win.ReadFile(
        handle,
        &offsets_buf,
        @intCast(offsets_buf.len),
        &bytes_read,
        null,
    );
    if (ok == 0 or bytes_read == 0) return;

    applyExternalOffsets(offsets_buf[0..@intCast(bytes_read)]);
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
var active_offsets: Offsets = offsets;

var offsets_buf: [4096]u8 = undefined;
var runtime_sdk_rsa_keys: [offsets.sdk_rsa_keys.len]usize = offsets.sdk_rsa_keys[0..offsets.sdk_rsa_keys.len].*;
var runtime_dither_alpha_strings: [offsets.dither_alpha_strings.len]usize = offsets.dither_alpha_strings[0..offsets.dither_alpha_strings.len].*;

fn applyExternalOffsets(source: []const u8) void {
    inline for (std.meta.fields(Offsets)) |field| {
        switch (field.type) {
            usize => {
                if (parseScalar(source, field.name)) |value| {
                    @field(active_offsets, field.name) = value;
                }
            },
            []const usize => {
                if (std.mem.eql(u8, field.name, "sdk_rsa_keys")) {
                    if (parseArray(source, field.name, &runtime_sdk_rsa_keys)) {
                        active_offsets.sdk_rsa_keys = &runtime_sdk_rsa_keys;
                    }
                } else if (std.mem.eql(u8, field.name, "dither_alpha_strings")) {
                    if (parseArray(source, field.name, &runtime_dither_alpha_strings)) {
                        active_offsets.dither_alpha_strings = &runtime_dither_alpha_strings;
                    }
                }
            },
            else => {},
        }
    }
}

fn parseScalar(source: []const u8, comptime name: []const u8) ?usize {
    const value_start = fieldValueStart(source, name) orelse return null;
    const token = numberToken(source[value_start..]) orelse return null;
    return parseNumber(token) catch null;
}

fn parseArray(source: []const u8, comptime name: []const u8, output: []usize) bool {
    const value_start = fieldValueStart(source, name) orelse return false;
    const open_rel = std.mem.indexOfScalar(u8, source[value_start..], '{') orelse return false;
    const open = value_start + open_rel + 1;
    const close_rel = std.mem.indexOfScalar(u8, source[open..], '}') orelse return false;
    const body = source[open .. open + close_rel];

    var index: usize = 0;
    var cursor: usize = 0;
    while (index < output.len and cursor < body.len) {
        const token = numberToken(body[cursor..]) orelse break;
        output[index] = parseNumber(token) catch return false;
        index += 1;
        cursor += (@intFromPtr(token.ptr) - @intFromPtr(body[cursor..].ptr)) + token.len;
    }

    return index == output.len;
}

fn fieldValueStart(source: []const u8, comptime name: []const u8) ?usize {
    const field_name = "." ++ name;
    const field_start = std.mem.indexOf(u8, source, field_name) orelse return null;
    const eq_rel = std.mem.indexOfScalar(u8, source[field_start..], '=') orelse return null;
    return field_start + eq_rel + 1;
}

fn numberToken(source: []const u8) ?[]const u8 {
    var start: usize = 0;
    while (start < source.len and !isNumberChar(source[start])) start += 1;
    if (start == source.len) return null;

    var end = start;
    while (end < source.len and isNumberChar(source[end])) end += 1;
    return source[start..end];
}

fn parseNumber(token: []const u8) !usize {
    if (std.mem.startsWith(u8, token, "0x") or std.mem.startsWith(u8, token, "0X")) {
        return std.fmt.parseUnsigned(usize, token[2..], 16);
    }
    return std.fmt.parseUnsigned(usize, token, 10);
}

fn isNumberChar(char: u8) bool {
    return std.ascii.isAlphanumeric(char) or char == 'x' or char == 'X';
}

fn openFileWin32(names: []const [*:0]const u8) ?win.HANDLE {
    for (names) |name| {
        const handle = win.CreateFileA(
            name,
            win.GENERIC_READ,
            win.FILE_SHARE_READ,
            null,
            win.OPEN_EXISTING,
            win.FILE_ATTRIBUTE_NORMAL,
            null,
        );
        if (handle != win.INVALID_HANDLE_VALUE) {
            return handle;
        }
    }
    return null;
}

fn createDefaultFile(name: [*:0]const u8, contents: []const u8) void {
    const handle = win.CreateFileA(
        name,
        win.GENERIC_WRITE,
        win.FILE_SHARE_READ,
        null,
        win.CREATE_NEW,
        win.FILE_ATTRIBUTE_NORMAL,
        null,
    );
    if (handle == win.INVALID_HANDLE_VALUE) return;
    defer _ = win.CloseHandle(handle);

    var bytes_written: win.DWORD = 0;
    _ = win.WriteFile(
        handle,
        contents.ptr,
        @intCast(contents.len),
        &bytes_written,
        null,
    );
}

const win = struct {
    const HANDLE = *anyopaque;
    const DWORD = u32;
    const BOOL = i32;
    const LPCSTR = [*:0]const u8;
    const LPCVOID = ?*const anyopaque;
    const LPVOID = ?*anyopaque;

    extern "kernel32" fn CreateFileA(
        lpFileName: LPCSTR,
        dwDesiredAccess: DWORD,
        dwShareMode: DWORD,
        lpSecurityAttributes: ?*anyopaque,
        dwCreationDisposition: DWORD,
        dwFlagsAndAttributes: DWORD,
        hTemplateFile: ?HANDLE,
    ) callconv(.winapi) HANDLE;

    extern "kernel32" fn ReadFile(
        hFile: HANDLE,
        lpBuffer: LPVOID,
        nNumberOfBytesToRead: DWORD,
        lpNumberOfBytesRead: ?*DWORD,
        lpOverlapped: ?*anyopaque,
    ) callconv(.winapi) BOOL;

    extern "kernel32" fn WriteFile(
        hFile: HANDLE,
        lpBuffer: LPCVOID,
        nNumberOfBytesToWrite: DWORD,
        lpNumberOfBytesWritten: ?*DWORD,
        lpOverlapped: ?*anyopaque,
    ) callconv(.winapi) BOOL;

    extern "kernel32" fn CloseHandle(
        hObject: HANDLE,
    ) callconv(.winapi) BOOL;

    const INVALID_HANDLE_VALUE = @as(HANDLE, @ptrFromInt(std.math.maxInt(usize)));
    const GENERIC_READ = 0x80000000;
    const GENERIC_WRITE = 0x40000000;
    const FILE_SHARE_READ = 1;
    const CREATE_NEW = 1;
    const OPEN_EXISTING = 3;
    const FILE_ATTRIBUTE_NORMAL = 0x80;
};

const std = @import("std");
const GameAssembly = @This();