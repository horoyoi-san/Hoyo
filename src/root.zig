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

pub const offsets = Offsets.parse(@embedFile("offsets"));
pub var base: usize = undefined;

fn onAttach() void {
    FreeConsole();
    AllocConsole();

    std.fs.File.stdout().writeAll(
        \\                         @@@@######@@..::::@         
        \\                     @@#%%%%%%%%%%%%.:@:::::@        
        \\                   @##%%%%%%%%%%%%%%@@@%::::%        
        \\               @@:::-@::::::@@@@@@@@%%%%::::@@       
        \\            @@::::::%@@@:::=@%%%%::::@@#::@@%%%@     
        \\           @:::::@+:@@:::::::::@@:%%::::@@@%%%%%@    
        \\         @...:.@#::=@::::::::::::+@::%:::-@:@%%%%@   
        \\        @....:@::.:.@.:::.@%@::..::@:..:..:@.:@%%%@  
        \\      @::..:@#::.@.@@.....@@-#....::@#......@:.:@%%@ 
        \\    @:@%:::#%:::@:.@#@:....@#%.:...::@#.....:@:.:@%%@
        \\    @%:::::@::::@::@+%%::::%%@@:@...::@%..::@:@:::@%@
        \\   @%:::::@-::::@::@@:::@@@@%:::@:::::@%::::::@@:::@ 
        \\   @:::::@%::::::@::%@::::::::::*::::::@%::::::@@@:% 
        \\  @::::::@+::::@@:@:@@@@@::::=@:::%::::@%:::::::@:::@
        \\  @:::::@%:::@@@@@:@@@:::.....@*:::%%*:@%::::@:::@::@
        \\ @:+::::@%:@@    *@@::@+:@..@@@@@@@@@@@@%::::=@::%@:@
        \\ @:-::::@@..+=====**@@::::@:...@@@@.+@@%::::::%:::@:@
        \\ @@::::@::::#=======@........@+   **@@:::@::::%@:=@  
        \\ @-:::=::::::@:::=@@.........@=====**@.%:::::@%@:%@  
        \\ @:::@::::::::...............@=======@@%::::@:%@:%@  
        \\ @::::@:::::::....@....@......%@::=%@%%::::@:%:@%@   
        \\ @:::::@::::::.....@@@..@@@..::::::::-@@@+%%%::@@    
        \\  @::::::@=::................:::@%@:::::::::::@      
        \\   @:::@%:::@@@@.............:::@:::::::::@::@       
        \\    @%%:@@%%%%@     @@@@@@@@@@@  @@::::::@::@        
        \\      @%%@                          @@:::@@          
        \\                                                     
        \\
    ) catch {};

    std.log.debug("Successfully injected. Waiting for the game startup.", .{});
    std.log.debug("To work with Yidhari-ZS: https://git.xeondev.com/yidhari-zs/yidhari-zs", .{});

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

    @import("network.zig").init(allocator);
    @import("crypto.zig").init(allocator);
    @import("hoyopass.zig").init();
    @import("ditherless.zig").init();

    std.log.debug("Fully initialized. Time to play Zenless Zone Zero!", .{});
}

pub const Offsets = struct {
    MAKE_INITIAL_URL: ?usize = null,
    PTR_TO_STRING_ANSI: ?usize = null,
    SYSTEM_URI_CREATE_THIS: ?usize = null,
    HOYOPASS_INIT: ?usize = null,
    RSA_CREATE: ?usize = null,
    RSA_FROM_XML_STRING: ?usize = null,
    RSA_STATICS: ?usize = null,
    RSA_STATIC_ID: ?usize = null,
    CRYPTO_STR_1: ?usize = null,
    CRYPTO_STR_2: ?usize = null,
    NETWORK_STATE_CHANGE: ?usize = null,
    DITHER_ALPHA_STR_1: ?usize = null,
    DITHER_ALPHA_STR_2: ?usize = null,

    pub fn unwrapOffset(comptime self: @This(), comptime name: anytype) usize {
        return @field(self, @tagName(name)) orelse @compileError("Missing offset for " ++ @tagName(name));
    }

    fn parse(comptime contents: []const u8) @This() {
        @setEvalBranchQuota(1_000_000);

        var list: @This() = .{};
        var lines = std.mem.tokenizeScalar(u8, contents, '\n');

        while (lines.next()) |l| {
            var line = l;
            if (line[line.len - 1] == '\r') line.len -= 1;

            var pair = std.mem.tokenizeScalar(u8, line, ' ');

            const name = pair.next().?;
            const value = pair.next().?;

            @field(list, name) = std.fmt.parseInt(usize, value[2..], 16) catch @compileError("invalid offset for " ++ name);
        }

        return list;
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
