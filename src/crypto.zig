const std = @import("std");
const root = @import("root");
const zz = @import("zigzag");
const util = @import("util.zig");
const offsets = root.offsets;

// ===================== Embedded RSA Keys =====================
const sdk_public_key = @embedFile("sdk_public_key.xml");
const server_public_key = @embedFile("server_public_key.xml");

// ===================== Runtime Message Loader =====================
fn allocZString(allocator: std.mem.Allocator, msg: []const u8) [:0]u8 {
    const buf = allocator.alloc(u8, msg.len + 1) catch unreachable;
    @memcpy(buf[0..msg.len], msg);
    buf[msg.len] = 0;
    return buf[0..msg.len :0];
}

fn loadMessageZ(path: []const u8) [:0]u8 {
    const allocator = std.heap.page_allocator;

    const file = std.fs.cwd().openFile(path, .{}) catch {
        return allocZString(allocator, "<message load failed>");
    };
    defer file.close();

    const data = file.readToEndAlloc(allocator, 64 * 1024) catch {
        return allocZString(allocator, "<message read failed>");
    };

    const trimmed = std.mem.trimRight(u8, data, "\r\n");
    return allocZString(allocator, trimmed);
}

// ===================== Init =====================
pub fn init(allocator: zz.ChunkAllocator) void {
    const base = root.base;

    // SDK key
    @as(*usize, @ptrFromInt(base + offsets.unwrapOffset(.CRYPTO_STR_1))).* =
        util.ptrToStringAnsi(sdk_public_key);

    // Load message from external file (EDITABLE AFTER BUILD)
    const msg = loadMessageZ("custom");

    @as(*usize, @ptrFromInt(base + offsets.unwrapOffset(.CRYPTO_STR_2))).* =
        util.ptrToStringAnsi(msg);

    // Start message watcher thread
    const thread = std.Thread.spawn(.{}, messageWatcher, .{}) catch unreachable;
    thread.detach();

    initializeRsaCryptoServiceProvider();

    _ = root.intercept(
        allocator,
        base + offsets.unwrapOffset(.SDK_RSA_ENCRYPT),
        SdkRsaEncryptHook,
    );

    _ = root.intercept(
        allocator,
        base + offsets.unwrapOffset(.NETWORK_STATE_CHANGE),
        NetworkStateHook,
    );
}

var needs_refresh = std.atomic.Value(bool).init(false);

fn messageWatcher() void {
    const allocator = std.heap.page_allocator;
    var last_mtime: i128 = 0;

    // Initial check to set baseline
    if (std.fs.cwd().openFile("custom", .{})) |file| {
        if (file.stat()) |stat| {
            last_mtime = stat.mtime;
        } else |_| {}
        file.close();
    } else |_| {}

    while (true) {
        std.Thread.sleep(std.time.ns_per_ms * 100);

        const file = std.fs.cwd().openFile("custom", .{}) catch continue;
        const stat = file.stat() catch {
            file.close();
            continue;
        };

        if (stat.mtime > last_mtime) {
            last_mtime = stat.mtime;

            const data = file.readToEndAlloc(allocator, 1024 * 1024) catch {
                file.close();
                continue;
            };
            file.close();

            const trimmed = std.mem.trimRight(u8, data, "\r\n");
            const new_msg = allocZString(allocator, trimmed);
            allocator.free(data);

            const base = root.base;
            const new_ptr = util.ptrToStringAnsi(new_msg);

            @as(*usize, @ptrFromInt(base + offsets.unwrapOffset(.CRYPTO_STR_2))).* = new_ptr;
            std.log.debug("Updated custom message", .{});

            // Trigger potential UI refresh
            needs_refresh.store(true, .release);
        } else {
            file.close();
        }
    }
}

// ===================== Hooks =====================
const SdkRsaEncryptHook = struct {
    pub var originalFn: *const fn (usize, usize) callconv(.c) usize = undefined;

    pub fn callback(_: usize, a2: usize) callconv(.c) usize {
        if (needs_refresh.load(.acquire)) {
            initializeRsaCryptoServiceProvider();
            needs_refresh.store(false, .release);
        }

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

// ===================== RSA Init =====================
pub fn initializeRsaCryptoServiceProvider() void {
    const base = root.base;

    const statics =
        @as(*usize, @ptrFromInt(base + offsets.unwrapOffset(.RSA_STATICS))).*;

    const rcsp_field: *usize =
        @ptrFromInt(statics + offsets.unwrapOffset(.RSA_STATIC_ID));

    const rsaCreate: *const fn () callconv(.c) usize =
        @ptrFromInt(base + offsets.unwrapOffset(.RSA_CREATE));

    const rsaFromXmlString: *const fn (usize, usize) callconv(.c) void =
        @ptrFromInt(base + offsets.unwrapOffset(.RSA_FROM_XML_STRING));

    const instance = rsaCreate();
    rsaFromXmlString(instance, util.ptrToStringAnsi(server_public_key));

    rcsp_field.* = instance;
}