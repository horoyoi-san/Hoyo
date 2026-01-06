const std = @import("std");
const unicode = std.unicode;
const windows = std.os.windows;

const game_executables = &.{
    "ZenlessZoneZeroBeta.exe",
    "ZenlessZoneZero.exe",
};

const dll_path = "tentacle.dll" ++ .{0};
const kernel32_name = unicode.utf8ToUtf16LeStringLiteral("kernel32.dll");

pub extern "kernel32" fn ResumeThread(*anyopaque) callconv(.winapi) void;

extern "kernel32" fn VirtualAllocEx(
    windows.HANDLE,
    usize, // anyopaque doesn't allow null yet we need it here
    windows.SIZE_T,
    windows.DWORD,
    windows.DWORD,
) callconv(.winapi) windows.LPVOID;

extern "kernel32" fn VirtualFreeEx(
    windows.HANDLE,
    windows.LPVOID,
    windows.SIZE_T,
    windows.DWORD,
) callconv(.winapi) windows.BOOL;

extern "kernel32" fn CreateRemoteThread(
    windows.HANDLE,
    usize, // anyopaque doesn't allow null yet we need it here
    windows.SIZE_T,
    windows.LPTHREAD_START_ROUTINE,
    windows.LPVOID,
    windows.DWORD,
    *windows.DWORD,
) callconv(.winapi) windows.HANDLE;

pub fn main() !void {
    const game_executable = whichExecutable() orelse {
        try std.fs.File.stdout().writeAll("Game executable doesn't exist. Press any key to exit...\n");

        var buf: [1]u8 = undefined;
        _ = std.fs.File.stdin().read(&buf) catch {};
        return;
    };

    var debug_allocator = std.heap.DebugAllocator(.{}){};
    defer _ = debug_allocator.deinit();
    const gpa = debug_allocator.allocator();
    var cmd_line = try gpa.alloc(u16, game_executable.len);
    std.mem.copyForwards(u16, cmd_line, game_executable);

    var args = try std.process.argsWithAllocator(gpa);
    _ = args.skip();
    while (args.next()) |arg| {
        cmd_line = std.mem.concat(gpa, u16, &.{ cmd_line, unicode.utf8ToUtf16LeStringLiteral(" "), try unicode.utf8ToUtf16LeAlloc(gpa, arg) }) catch @panic("Out of Memory");
    }

    var proc_info: windows.PROCESS_INFORMATION = undefined;
    var startup_info: windows.STARTUPINFOW = .{
        .cb = 0,
        .lpReserved = null,
        .lpDesktop = null,
        .lpTitle = null,
        .dwX = 0,
        .dwY = 0,
        .dwXSize = 0,
        .dwYSize = 0,
        .dwXCountChars = 0,
        .dwYCountChars = 0,
        .dwFillAttribute = 0,
        .dwFlags = 0,
        .wShowWindow = 0,
        .cbReserved2 = 0,
        .lpReserved2 = null,
        .hStdInput = null,
        .hStdOutput = null,
        .hStdError = null,
    };

    try windows.CreateProcessW(
        game_executable,
        @ptrCast(cmd_line.ptr),
        null,
        null,
        0,
        .{ .create_suspended = true },
        null,
        null,
        &startup_info,
        &proc_info,
    );

    const load_library = windows.kernel32.GetProcAddress(
        windows.kernel32.GetModuleHandleW(kernel32_name).?,
        "LoadLibraryA",
    ).?;

    const dll_path_addr = VirtualAllocEx(
        proc_info.hProcess,
        0,
        dll_path.len,
        windows.MEM_COMMIT | windows.MEM_RESERVE,
        windows.PAGE_READWRITE,
    );
    _ = try windows.WriteProcessMemory(proc_info.hProcess, dll_path_addr, dll_path);

    // call LoadLibraryA in the remote process, this will also call DllMain so we should wait for it and then resume the target.
    var thread_id: windows.DWORD = 0;
    const loader_thread = CreateRemoteThread(
        proc_info.hProcess,
        0,
        0,
        @ptrCast(load_library),
        dll_path_addr,
        0,
        &thread_id,
    );

    try windows.WaitForSingleObject(loader_thread, 0xFFFFFFFF);

    // cleanup
    _ = VirtualFreeEx(proc_info.hProcess, dll_path_addr, 0, windows.MEM_RELEASE);
    windows.CloseHandle(loader_thread);
    ResumeThread(proc_info.hThread);
    windows.CloseHandle(proc_info.hThread);
    windows.CloseHandle(proc_info.hProcess);
}

fn whichExecutable() ?[:0]const u16 {
    inline for (game_executables) |exe_name| {
        if (fileExists(exe_name)) return unicode.utf8ToUtf16LeStringLiteral(exe_name);
    }

    return null;
}

fn fileExists(name: []const u8) bool {
    return if (windows.GetFileAttributes(name)) |_| true else |_| false;
}
