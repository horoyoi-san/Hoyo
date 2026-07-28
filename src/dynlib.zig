const std = @import("std");
const mem = std.mem;

const common = @import("common.zig");
const die = common.die;

const GameAssembly = @import("GameAssembly.zig");
const String = GameAssembly.String;

const nt = @import("nt.zig");
const debugging = @import("debugging.zig");
const Interception = @import("Interception.zig");

pub const std_options: std.Options = .{
    .logFn = debugging.logFn,
    .log_level = .info,
};

const log = std.log.scoped(.Sunbringer);

var game_assembly: GameAssembly = undefined; // populated by `hookLoadMhyBase`
var uid_custom_buf: ?[]u8 = null;
var crypto_custom_buf: ?[]u8 = null;
var uid_buf: [1024]u8 = undefined;
var crypto_buf: [4096]u8 = undefined;

const default_uid = "Fapper";
const default_crypto_custom =
    "<color=#ff8000>นี่คือเวอร์ชั่นทดสอบ ยังไม่ได้ระดับคุณภาพของเกม</color> <color=#FF0000>Ze</color><color=#FF7F00>nl</color><color=#FFFF00>ess</color> <color=#00FF00>Gay</color> <color=#0000FF>Ze</color><color=#4B0082>ro</color> | <color=#E088B0>Remielle</color> | <color=#ff0000>Horoyoi-san ඞ</color>";

pub export fn DllMain(
    _: std.os.windows.HINSTANCE,
    reason: std.os.windows.DWORD,
    _: std.os.windows.LPVOID,
) callconv(.winapi) std.os.windows.BOOL {
    if (reason == 1) {
        debugging.init();

        var syscall: nt.Syscall = .init;
        hookIsLoadMhyBase(&syscall) catch |err| die(
            "failed to hook `IsLoadMHYBase`: {t} (NTSTATUS: 0x{X})",
            .{ err, @intFromEnum(syscall.status) },
        );
    }

    return .TRUE;
}

fn hookIsLoadMhyBase(syscall: *nt.Syscall) !void {
    game_assembly = try .load(syscall);
    GameAssembly.loadExternalOffsets();
    try nt.unhookNtdll(syscall);
    _ = try Interception.replace(syscall, game_assembly.add(.IsLoadMHYBase), isLoadMhyBaseReplacement);
}

fn isLoadMhyBaseReplacement() callconv(.c) bool {
    var syscall: nt.Syscall = .init;
    if (initPatches(&syscall))
        return false
    else |err|
        die(
            "failed to initialize patches: {t} (NTSTATUS: 0x{X})",
            .{ err, @intFromEnum(syscall.status) },
        );
}

var set_login_setting_by_json: Interception = undefined;
const sdk_public_key = @embedFile("sdk_public_key.xml");

fn initPatches(syscall: *nt.Syscall) !void {
    try nt.unhookNtdll(syscall);
    ensureCustomFiles();
    loadUidCustom();
    loadCryptoCustom();

    set_login_setting_by_json = try .replace(
        syscall,
        game_assembly.add(.@"Foundation.Assets::SetLoginSettingByJson"),
        setLoginSettingByJsonReplacement,
    );
    _ = try Interception.replace(
        syscall,
        game_assembly.add(.@"MiHoYo.SDK.SDKDelegate.LoadFileDelegate::Invoke"),
        loadFileDelegateInvokeReplacement,
    );
    _ = try Interception.replace(
        syscall,
        game_assembly.add(.@"MiHoYo.SDK.DeviceFPManager::GetDeviceFP"),
        getDeviceFpReplacement,
    );
    for (game_assembly.addMany(.sdk_rsa_keys)) |rsa_key|
        @as(**const String, @ptrFromInt(rsa_key)).* = .allocZ(game_assembly, sdk_public_key);
    if (crypto_custom_buf) |custom| {
        const custom_z: [*:0]const u8 = @ptrCast(custom.ptr);
        @as(**const String, @ptrFromInt(game_assembly.add(.crypto_str))).* = .allocZ(game_assembly, custom_z);
    } else {
        @as(**const String, @ptrFromInt(game_assembly.add(.crypto_str))).* = .allocZ(game_assembly, default_crypto_custom);
    }
    ensureRsaKey();

    for (game_assembly.addMany(.dither_alpha_strings)) |dither_alpha_string|
        @as(**String, @ptrFromInt(dither_alpha_string)).* = .allocZ(game_assembly, "InvalidProperty");

    try nt.writeExecutable(
        syscall,
        game_assembly.add(.@"MoleMole.UIMainCityMiniMenuWidgetController::RefreshGachaTimeIcon"),
        &.{0xC3},
    );
}

const server_public_key: [:0]const u8 = @embedFile("server_public_key.xml");

fn ensureRsaKey() void {
    const rsaCreate: *const fn () callconv(.c) *anyopaque =
        @ptrFromInt(game_assembly.add(.@"System.Security.Cryptography.RSA::Create"));
    const rsaFromXmlString: *const fn (*anyopaque, *const String) callconv(.c) void =
        @ptrFromInt(game_assembly.add(.@"System.Security.Cryptography.RSA::FromXmlString"));
    const rsa = rsaCreate();
    rsaFromXmlString(rsa, .allocZ(game_assembly, server_public_key.ptr));
    game_assembly.setServerPublicKey(rsa);
}

const login_setting: [:0]const u8 = @embedFile("login_setting.json");

fn setLoginSettingByJsonReplacement(_: *String) callconv(.c) void {
    var syscall: nt.Syscall = .init;
    set_login_setting_by_json.revert(&syscall) catch die(
        "failed to revert SetLoginSettingByJson hook (NTSTATUS: 0x{X})",
        .{@intFromEnum(syscall.status)},
    );
    game_assembly.setLoginSettingByJson(login_setting);
    nt.writeExecutable(
        &syscall,
        game_assembly.add(.@"Foundation.Assets::SetLoginSettingByJson"),
        &.{0xC3},
    ) catch die(
        "failed to nuke SetLoginSettingByJson (NTSTATUS: 0x{X})",
        .{@intFromEnum(syscall.status)},
    );
}

const server_pc: [:0]const u8 = @embedFile("server_pc.json");

fn loadFileDelegateInvokeReplacement(_: *anyopaque, path: *String) callconv(.c) *String {
    log.info("LoadFileDelegate::Invoke(\"{f}\")", .{std.unicode.fmtUtf16Le(path.slice())});
    return if (mem.eql(
        u16,
        path.slice(),
        std.unicode.utf8ToUtf16LeStringLiteral("Config/server_pc.json"),
    ))
        .allocZ(game_assembly, server_pc.ptr)
    else
        .allocZ(game_assembly, "");
}

fn getDeviceFpReplacement(_: *anyopaque) callconv(.c) *String {
    ensureRsaKey();
    if (uid_custom_buf) |custom| {
        const custom_z: [*:0]const u8 = @ptrCast(custom.ptr);
        return .allocZ(game_assembly, custom_z);
    }

    return .allocZ(game_assembly, default_uid);
}

fn ensureCustomFiles() void {
    //createDefaultFile("UID_Custom.txt", default_uid);
    createDefaultFile("UID_Custom.txt", default_crypto_custom);
}

fn loadUidCustom() void {
    const names = &[_][*:0]const u8{ "UID_Custom.txt", "uid_custom.txt", "uid_custom" };
    const handle = openFileWin32(names) orelse return;
    defer _ = win.CloseHandle(handle);

    if (readWin32File(handle, &uid_buf)) |bytes_read| {
        const trimmed = mem.trimEnd(u8, uid_buf[0..bytes_read], " \t\r\n");
        if (trimmed.len > 0 and trimmed.len < uid_buf.len) {
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
        "uid_custom",
    };
    const handle = openFileWin32(names) orelse return;
    defer _ = win.CloseHandle(handle);

    if (readWin32File(handle, &crypto_buf)) |bytes_read| {
        const trimmed = mem.trimEnd(u8, crypto_buf[0..bytes_read], " \t\r\n");
        if (trimmed.len > 0 and trimmed.len < crypto_buf.len) {
            crypto_buf[trimmed.len] = 0;
            crypto_custom_buf = crypto_buf[0..trimmed.len];
        }
    }
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
        if (handle != win.INVALID_HANDLE_VALUE)
            return handle;
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
        @intCast(buffer.len - 1),
        &bytes_read,
        null,
    );
    if (ok != 0)
        return @intCast(bytes_read);

    return null;
}

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

    extern "kernel32" fn CloseHandle(hObject: HANDLE) callconv(.winapi) BOOL;

    const INVALID_HANDLE_VALUE: HANDLE = @ptrFromInt(std.math.maxInt(usize));
    const GENERIC_READ = 0x80000000;
    const GENERIC_WRITE = 0x40000000;
    const FILE_SHARE_READ = 1;
    const CREATE_NEW = 1;
    const OPEN_EXISTING = 3;
    const FILE_ATTRIBUTE_NORMAL = 0x80;
};
