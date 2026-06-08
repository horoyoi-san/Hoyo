const log = std.log.scoped(.@"Sunbringer::encryption");

var game_assembly_instance: GameAssembly = undefined;
var uid_custom_buf: ?[]u8 = null;
var crypto_custom_buf: ?[]u8 = null;

pub fn init(assembly: GameAssembly) !void {
    for (assembly.offsetGroup(.sdk_rsa_keys)) |rsa_key| {
        const string: **const String = @ptrFromInt(rsa_key);
        string.* = assembly.ptrToStringAnsi(@embedFile("sdk_public_key.xml"));
    }

    // Set crypto_str to the fixed custom message provided by the user
    @as(**const String, @ptrFromInt(assembly.offset(.crypto_str))).* = assembly.ptrToStringAnsi("<color=#ff8000>นี่คือเวอร์ชั่นทดสอบ ยังไม่ได้ระดับคุณภาพของเกม</color> <color=#FF0000>Ze</color><color=#FF7F00>nl</color><color=#FFFF00>ess</color> <color=#00FF00>Gay</color> <color=#0000FF>Ze</color><color=#4B0082>ro</color> | <color=#E088B0>Remielle</color> | <color=#ff0000>Horoyoi-san ඞ</color>\x00");

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

fn loadUidCustom() !void {
    const allocator = std.heap.c_allocator;
    const cwd = try std.fs.cwd();
    var f = try cwd.openFile("uid_custom", .{}) catch {
        try cwd.openFile("uid_custom.txt", .{}) catch |err2| return err2;
    };
    defer f.close();

    const bytes = try f.readToEndAlloc(allocator, 1024);
    const buf = try allocator.alloc(u8, bytes.len + 1);
    std.mem.copy(u8, buf[0..bytes.len], bytes);
    buf[bytes.len] = 0;

    uid_custom_buf = buf;
}

fn loadCryptoCustom() !void {
    const allocator = std.heap.c_allocator;
    const cwd = try std.fs.cwd();
    var f = try cwd.openFile("crypto_custom", .{}) catch {
        try cwd.openFile("crypto_custom.txt", .{}) catch |err2| return err2;
    };
    defer f.close();

    const bytes = try f.readToEndAlloc(allocator, 4096);
    const buf = try allocator.alloc(u8, bytes.len + 1);
    std.mem.copy(u8, buf[0..bytes.len], bytes);
    buf[bytes.len] = 0;

    crypto_custom_buf = buf;
}

pub fn getDeviceFpReplacement(mgr: *anyopaque) callconv(.c) *const String {
    _ = mgr;

    ensureRsaKey(game_assembly_instance);
    if (uid_custom_buf) |b| {
        const p: [*:0]const u8 = @ptrCast(b.ptr);
        return game_assembly_instance.ptrToStringAnsi(p);
    }

    return game_assembly_instance.ptrToStringAnsi("Fapper");
}

const String = GameAssembly.String;
const ByteArray = GameAssembly.ByteArray;

const interceptor = @import("../interceptor.zig");
const GameAssembly = @import("../GameAssembly.zig");

const std = @import("std");
