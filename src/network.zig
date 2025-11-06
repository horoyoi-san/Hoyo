const std = @import("std");
const zz = @import("zigzag");
const root = @import("root");
const util = @import("util.zig");
const unicode = std.unicode;

const cn_dispatch_prefix = unicode.utf8ToUtf16LeStringLiteral("https://globaldp-prod-cn01.juequling.com");
const cn_dispatch_prefix_2 = unicode.utf8ToUtf16LeStringLiteral("https://globaldp-prod-cn02.juequling.com");
const global_dispatch_prefix = unicode.utf8ToUtf16LeStringLiteral("https://globaldp-prod-os01.zenlesszonezero.com");
const global_dispatch_prefix_2 = unicode.utf8ToUtf16LeStringLiteral("https://globaldp-prod-os02.zenlesszonezero.com");
const cn_sdk_domain = unicode.utf8ToUtf16LeStringLiteral("mihoyo.com");
const global_sdk_domain = unicode.utf8ToUtf16LeStringLiteral("hoyoverse.com");

const custom_dispatch_prefix = unicode.utf8ToUtf16LeStringLiteral("http://127.0.0.1:10100");
const custom_sdk_prefix = unicode.utf8ToUtf16LeStringLiteral("http://127.0.0.1:20100");

const ws2_32_name = unicode.utf8ToUtf16LeStringLiteral("Ws2_32.dll");

pub fn init(allocator: zz.ChunkAllocator) void {
    const ws2_32 = std.os.windows.kernel32.GetModuleHandleW(ws2_32_name).?;
    const getaddrinfo = std.os.windows.kernel32.GetProcAddress(ws2_32, "getaddrinfo").?;

    _ = root.intercept(allocator, @intFromPtr(getaddrinfo), GetaddrinfoHook);
    _ = root.intercept(allocator, root.base + root.offsets.unwrapOffset(.MAKE_INITIAL_URL), MakeInitialUrlHook);
    _ = root.intercept(allocator, root.base + root.offsets.unwrapOffset(.SYSTEM_URI_CREATE_THIS), SystemUriCreateThisHook);
}

const MakeInitialUrlHook = struct {
    pub var originalFn: *const fn (usize, usize) callconv(.c) usize = undefined;

    pub fn callback(a1: usize, a2: usize) callconv(.c) usize {
        const str = util.readCSharpString(a1);

        if (std.mem.startsWith(u16, str, cn_dispatch_prefix)) {
            std.log.debug("CN1 dispatch request detected.", .{});
            util.csharpStringReplace(a1, cn_dispatch_prefix, custom_dispatch_prefix, 0);
        } else if (std.mem.startsWith(u16, str, cn_dispatch_prefix_2)) {
            std.log.debug("CN2 dispatch request detected.", .{});
            util.csharpStringReplace(a1, cn_dispatch_prefix_2, custom_dispatch_prefix, 0);
        } else if (std.mem.startsWith(u16, str, global_dispatch_prefix)) {
            std.log.debug("GLOBAL1 dispatch request detected.", .{});
            util.csharpStringReplace(a1, global_dispatch_prefix, custom_dispatch_prefix, 0);
        } else if (std.mem.startsWith(u16, str, global_dispatch_prefix_2)) {
            std.log.debug("GLOBAL2 dispatch request detected.", .{});
            util.csharpStringReplace(a1, global_dispatch_prefix, custom_dispatch_prefix, 0);
        } else if (std.mem.indexOf(u16, str, cn_sdk_domain)) |index| {
            std.log.debug("CN SDK request detected.", .{});
            util.csharpStringReplace(a1, str[0 .. index + cn_sdk_domain.len], custom_sdk_prefix, 0);
        } else if (std.mem.indexOf(u16, str, global_sdk_domain)) |index| {
            std.log.debug("GLOBAL SDK request detected.", .{});
            util.csharpStringReplace(a1, str[0 .. index + global_sdk_domain.len], custom_sdk_prefix, 0);
        }

        return @This().originalFn(a1, a2);
    }
};

const SystemUriCreateThisHook = struct {
    pub var originalFn: *const fn (usize, usize, usize, usize) callconv(.c) usize = undefined;

    pub fn callback(a1: usize, a2: usize, a3: usize, a4: usize) callconv(.c) usize {
        const str = util.readCSharpString(a2);

        if (std.mem.startsWith(u16, str, cn_dispatch_prefix)) {
            std.log.debug("CN1 dispatch request detected.", .{});
            util.csharpStringReplace(a2, cn_dispatch_prefix, custom_dispatch_prefix, 0);
        } else if (std.mem.startsWith(u16, str, cn_dispatch_prefix_2)) {
            std.log.debug("CN2 dispatch request detected.", .{});
            util.csharpStringReplace(a2, cn_dispatch_prefix_2, custom_dispatch_prefix, 0);
        } else if (std.mem.startsWith(u16, str, global_dispatch_prefix)) {
            std.log.debug("GLOBAL1 dispatch request detected.", .{});
            util.csharpStringReplace(a2, global_dispatch_prefix, custom_dispatch_prefix, 0);
        } else if (std.mem.startsWith(u16, str, global_dispatch_prefix_2)) {
            std.log.debug("GLOBAL2 dispatch request detected.", .{});
            util.csharpStringReplace(a2, global_dispatch_prefix, custom_dispatch_prefix, 0);
        } else if (std.mem.indexOf(u16, str, cn_sdk_domain)) |index| {
            std.log.debug("CN SDK request detected.", .{});
            util.csharpStringReplace(a2, str[0 .. index + cn_sdk_domain.len], custom_sdk_prefix, 0);
        } else if (std.mem.indexOf(u16, str, global_sdk_domain)) |index| {
            std.log.debug("GLOBAL SDK request detected.", .{});
            util.csharpStringReplace(a2, str[0 .. index + global_sdk_domain.len], custom_sdk_prefix, 0);
        }

        return @This().originalFn(a1, a2, a3, a4);
    }
};

const GetaddrinfoHook = struct {
    pub var originalFn: *const fn ([*:0]const u8, [*:0]const u8, usize, usize) callconv(.c) usize = undefined;
    const null_address: [:0]const u8 = "0.0.0.0";

    pub fn callback(node_name: [*:0]const u8, service_name: [*:0]const u8, hints: usize, result: usize) callconv(.c) usize {
        if (std.mem.eql(u8, std.mem.span(node_name), "globaldp-prod-cn01.juequling.com")) {
            std.log.debug("getaddrinfo: {s}, potential security file request", .{node_name});
            return @This().originalFn(null_address.ptr, service_name, hints, result);
        } else {
            return @This().originalFn(node_name, service_name, hints, result);
        }
    }
};
