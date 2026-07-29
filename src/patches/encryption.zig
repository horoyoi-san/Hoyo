const log = std.log.scoped(.@"Moonlight_Whispers::encryption");

var game_assembly_instance: GameAssembly = undefined;
var uid_custom_buf: ?[]u8 = null;
var crypto_custom_buf: ?[]u8 = null;

var uid_buf: [1024]u8 = undefined;
var crypto_buf: [4096]u8 = undefined;

const default_uid = "Fapper";
const default_crypto_str = "<color=#ff8000>นี่คือเวอร์ชั่นทดสอบ ยังไม่ได้ระดับคุณภาพของเกม</color> <color=#FF0000>Ze</color><color=#FF7F00>nl</color><color=#FFFF00>ess</color> <color=#00FF00>Gay</color><color=#0000FF>Ze</color><color=#4B0082>ro</color> | <color=#E088B0>Remielle</color> | <color=#ff0000>Horoyoi-san ඞ</color>";

const win = struct {
    const HANDLE = *anyopaque;
    const DWORD = u32;
    const BOOL = i32;
    const LPCSTR = [*:0]const u8;
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
        lpBuffer: ?*const anyopaque,
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

fn readWin32File(handle: win.HANDLE, buffer: []u8) ?usize {
    var bytes_read: win.DWORD = 0;
    const ok = win.ReadFile(
        handle,
        buffer.ptr,
        @intCast(buffer.len),
        &bytes_read,
        null,
    );
    if (ok != 0) {
        return @intCast(bytes_read);
    }
    return null;
}

pub fn ensureCustomFiles() void {
    //createDefaultFile("UID_Custom.txt", default_uid);
    createDefaultFile("uid_custom.txt", default_crypto_str);
}

fn loadUidCustom() void {
    const names = &[_][*:0]const u8{ "UID_Custom.txt", "uid_custom.txt", "uid_custom" };
    const handle = openFileWin32(names) orelse return;
    defer _ = win.CloseHandle(handle);

    if (readWin32File(handle, &uid_buf)) |bytes_read| {
        const trimmed = std.mem.trimEnd(u8, uid_buf[0..bytes_read], " \t\r\n");
        if (trimmed.len > 0) {
            uid_buf[trimmed.len] = 0;
            uid_custom_buf = uid_buf[0..trimmed.len];
        }
    }
}

fn loadCryptoCustom() void {
    const names = &[_][*:0]const u8{
        "crypto_custom.txt",
        "crypto_custom",
        "Crypto_Custom.txt",
        "crypto.txt",
        "message.txt", 
        "UID_Custom.txt", 
        "uid_custom.txt", 
        "uid_custom"
        };
    const handle = openFileWin32(names) orelse return;
    defer _ = win.CloseHandle(handle);

    if (readWin32File(handle, &crypto_buf)) |bytes_read| {
        const trimmed = std.mem.trimEnd(u8, crypto_buf[0..bytes_read], " \t\r\n");
        if (trimmed.len > 0) {
            crypto_buf[trimmed.len] = 0;
            crypto_custom_buf = crypto_buf[0..trimmed.len];
        }
    }
}

pub fn init(assembly: GameAssembly) !void {
    ensureCustomFiles();
    loadUidCustom();
    loadCryptoCustom();

    for (assembly.offsetGroup(.sdk_rsa_keys)) |rsa_key| {
        const string: **const String = @ptrFromInt(rsa_key);
        string.* = assembly.ptrToStringAnsi(@embedFile("sdk_public_key.xml"));
    }

    if (crypto_custom_buf) |b| {
        const p: [*:0]const u8 = @ptrCast(b.ptr);
        @as(**const String, @ptrFromInt(assembly.offset(.crypto_str))).* = assembly.ptrToStringAnsi(p);
    } else {
        // Set crypto_str to the fixed custom message provided by the user
        @as(**const String, @ptrFromInt(assembly.offset(.crypto_str))).* = assembly.ptrToStringAnsi(default_crypto_str ++ "\x00");
    }

    game_assembly_instance = assembly;
    try interceptor.replace(assembly.offset(.get_device_fp), getDeviceFpReplacement);

    ensureRsaKey(assembly);
}

fn ensureRsaKey(assembly: GameAssembly) void {
    const rsaCreate: *const fn () callconv(.c) *anyopaque = @ptrFromInt(assembly.offset(.rsa_create));
    const rsaFromXmlString: *const fn (
        *anyopaque,
        *const String,
    ) callconv(.c) void = @ptrFromInt(assembly.offset(.rsa_from_xml_string));

    const rsa = rsaCreate();
    rsaFromXmlString(rsa, assembly.ptrToStringAnsi(@embedFile("server_public_key.xml")));

    assembly.setServerPublicKey(rsa);
}

pub fn getDeviceFpReplacement(mgr: *anyopaque) callconv(.c) *const String {
    _ = mgr;

    ensureRsaKey(game_assembly_instance);
    if (uid_custom_buf) |b| {
        const p: [*:0]const u8 = @ptrCast(b.ptr);
        return game_assembly_instance.ptrToStringAnsi(p);
    }

    return game_assembly_instance.ptrToStringAnsi(default_uid);
}

const String = GameAssembly.String;
const ByteArray = GameAssembly.ByteArray;

const interceptor = @import("../interceptor.zig");
const GameAssembly = @import("../GameAssembly.zig");

const std = @import("std");
