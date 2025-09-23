const std = @import("std");
const zz = @import("zigzag");
const util = @import("util.zig");

const windows = std.os.windows;
const unicode = std.unicode;

const DLL_PROCESS_ATTACH = 1;

extern "kernel32" fn AllocConsole() callconv(.winapi) void;
extern "kernel32" fn FreeConsole() callconv(.winapi) void;

const ntdll_name = unicode.utf8ToUtf16LeStringLiteral("ntdll.dll");
const game_assembly_name = unicode.utf8ToUtf16LeStringLiteral("GameAssembly.dll");

pub var base: usize = undefined;

fn onAttach() void {
    FreeConsole();
    AllocConsole();

    std.fs.File.stdout().writeAll(
        \\
        \\ ____  ____  ____  _____       _       
        \\|_   ||   _||_   \|_   _|     / \      
        \\  | |__| |    |   \ | |      / _ \     
        \\  |  __  |    | |\ \| |     / ___ \    
        \\ _| |  | |_  _| |_\   |_  _/ /   \ \_  
        \\|____||____||_____|\____||____| |____|                          
        \\
    ) catch {};

    std.log.debug("Horoyoi-san", .{});
    std.log.debug("Honkai Nexus Anima", .{});

    base = while (true) {
        if (windows.kernel32.GetModuleHandleW(game_assembly_name)) |addr| break @intFromPtr(addr);
        std.Thread.sleep(std.time.ns_per_ms * 100);
    };

    std.log.debug("GameAssembly is located at: 0x{X}", .{base});
    std.Thread.sleep(std.time.ns_per_s * 2);

    disableMemoryProtection() catch |err| {
        std.log.err("Failed to disable memory protection: {}", .{err});
        return;
    };

    var pca = zz.PageChunkAllocator.init() catch unreachable;
    const allocator = pca.allocator();

    _ = intercept(allocator, base + 0x43E2C60, MakeInitialUrlHook);
    _ = intercept(allocator, base + 0x3D1FC30, FromXmlStringHook);

    const secfile = base + 0x1F7C060;
    var prot: windows.DWORD = windows.PAGE_EXECUTE_READWRITE;

    windows.VirtualProtect(@ptrFromInt(secfile), 1, prot, &prot) catch unreachable;
    @as(*u8, @ptrFromInt(secfile)).* = 0xC3;
    windows.VirtualProtect(@ptrFromInt(secfile), 1, prot, &prot) catch unreachable;

    const hoyopass_init = base + 0x39EB810;
    prot = windows.PAGE_EXECUTE_READWRITE;

    windows.VirtualProtect(@ptrFromInt(hoyopass_init), 1, prot, &prot) catch unreachable;
    @as(*u8, @ptrFromInt(hoyopass_init)).* = 0xC3;
    windows.VirtualProtect(@ptrFromInt(hoyopass_init), 1, prot, &prot) catch unreachable;

    std.log.debug("Successfully initialized", .{});
}

const FromXmlStringHook = struct {
    const server_public_key_prefix = unicode.utf8ToUtf16LeStringLiteral("<RSAKeyValue><Modulus>nixp");
    const sdk_public_key_part = unicode.utf8ToUtf16LeStringLiteral("<Modulus>w73pHTz");
    const server_public_key = @embedFile("server_public_key.xml");
    const sdk_public_key = @embedFile("sdk_public_key.xml");

    pub var originalFn: *const fn (usize, usize) callconv(.c) usize = undefined;

    pub fn callback(a1: usize, a2: usize) callconv(.c) usize {
        const str = util.readCSharpString(a2);

        if (std.mem.startsWith(u16, str, server_public_key_prefix)) {
            std.log.debug("replacing server public key", .{});
            return @This().originalFn(a1, util.il2cppStringNew(server_public_key));
        } else if (std.mem.containsAtLeast(u16, str, 1, sdk_public_key_part)) {
            std.log.debug("replacing SDK public key", .{});
            return @This().originalFn(a1, util.il2cppStringNew(sdk_public_key));
        } else {
            return @This().originalFn(a1, a2);
        }
    }
};

const MakeInitialUrlHook = struct {
    const global_dispatch_prefix = unicode.utf8ToUtf16LeStringLiteral("https://prod-global-os-dispatch01-outer.hknexusanima.com");
    const cn_sdk_domain = unicode.utf8ToUtf16LeStringLiteral("mihoyo.com");
    const global_sdk_domain = unicode.utf8ToUtf16LeStringLiteral("hoyoverse.com");

    const custom_dispatch_prefix = unicode.utf8ToUtf16LeStringLiteral("http://127.0.0.1:10100");
    const custom_sdk_prefix = unicode.utf8ToUtf16LeStringLiteral("http://127.0.0.1:20100");

    pub var originalFn: *const fn (usize, usize) callconv(.c) usize = undefined;

    pub fn callback(a1: usize, a2: usize) callconv(.c) usize {
        var buf: [4096]u8 = undefined;

        const str = util.readCSharpString(a1);
        const len = std.unicode.utf16LeToUtf8(&buf, str) catch unreachable;
        std.log.debug("{s}", .{buf[0..len]});

        if (std.mem.startsWith(u16, str, global_dispatch_prefix)) {
            std.log.debug("dispatch request detected.", .{});
            util.csharpStringReplace(a1, global_dispatch_prefix, custom_dispatch_prefix);
        } else if (std.mem.indexOf(u16, str, cn_sdk_domain)) |index| {
            std.log.debug("CN SDK request detected.", .{});
            util.csharpStringReplace(a1, str[0 .. index + cn_sdk_domain.len], custom_sdk_prefix);
        } else if (std.mem.indexOf(u16, str, global_sdk_domain)) |index| {
            std.log.debug("GLOBAL SDK request detected.", .{});
            util.csharpStringReplace(a1, str[0 .. index + global_sdk_domain.len], custom_sdk_prefix);
        }

        return @This().originalFn(a1, a2);
    }
};

pub fn intercept(ca: zz.ChunkAllocator, address: usize, hook_struct: anytype) zz.Hook(@TypeOf(hook_struct.callback)) {
    const hook = zz.Hook(@TypeOf(hook_struct.callback)).init(ca, @ptrFromInt(address), hook_struct.callback) catch |err| {
        std.log.err("failed to intercept function at 0x{X}: {}", .{ address - base, err });
        @panic("intercept failed");
    };

    hook_struct.originalFn = hook.delegate;
    return hook;
}

pub export fn DllMain(_: windows.HINSTANCE, reason: windows.DWORD, _: windows.LPVOID) callconv(.winapi) windows.BOOL {
    if (reason == DLL_PROCESS_ATTACH) {
        const thread = std.Thread.spawn(.{}, onAttach, .{}) catch unreachable;
        thread.detach();
    }

    return 1;
}

fn disableMemoryProtection() !void {
    const ntdll = windows.kernel32.GetModuleHandleW(ntdll_name).?;
    const proc_addr = windows.kernel32.GetProcAddress(ntdll, "NtProtectVirtualMemory").?;

    const nt_func = nt_func: {
        if (windows.kernel32.GetProcAddress(ntdll, "wine_get_version") != null) {
            break :nt_func windows.kernel32.GetProcAddress(ntdll, "NtPulseEvent").?;
        } else {
            break :nt_func windows.kernel32.GetProcAddress(ntdll, "NtQuerySection").?;
        }
    };

    var protection: windows.DWORD = windows.PAGE_EXECUTE_READWRITE;
    try windows.VirtualProtect(proc_addr, 1, protection, &protection);

    const routine: *u32 = @ptrCast(@alignCast(nt_func));
    const routine_val = @as(*usize, @ptrCast(@alignCast(routine))).*;
    const lower_bits_mask = ~(@as(u64, 0xFF) << 32);
    const lower_bits = routine_val & @as(usize, @intCast(lower_bits_mask));

    const offset_val = @as(*const u32, @ptrFromInt(@as(usize, @intFromPtr(routine)) + 4)).*;
    const upper_bits = @as(usize, @intCast(@subWithOverflow(offset_val, 1).@"0")) << 32;
    const result = lower_bits | upper_bits;
    @as(*usize, @ptrCast(@alignCast(proc_addr))).* = result;

    try windows.VirtualProtect(proc_addr, 1, protection, &protection);
}
