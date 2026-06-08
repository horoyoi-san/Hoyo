pub fn main(init: Init) noreturn {
    const io = init.io;
    const cwd: Io.Dir = .cwd();

    const exe_name = whichExecutable(io, cwd) orelse fatal(
        \\The game executable wasn't found
        \\Make sure you've put Sunbringer into the game directory.
    );

    cwd.access(io, dll_name, .{}) catch fatal(
        \\The 'Sunbringer.dll' wasn't found.
        \\Make sure you've copied it here as well
    );

    const args = init.minimal.args.toSlice(init.arena.allocator()) catch
        fatal("Failed to collect command line arguments!");

    @constCast(args)[0] = exe_name; // The `args` slice itself is allocated by init.arena

    const child = std.process.spawn(io, .{
        .argv = args,
        .start_suspended = true,
    }) catch fatal("Failed to spawn the game process. Refer to the command line window for details.");

    defer _ = ntdll.NtClose(child.id.?);

    const dll_path = winapi.VirtualAllocEx(
        child.id.?,
        null,
        dll_name.len + 1,
        .{ .COMMIT = true, .RESERVE = true },
        .{ .READWRITE = true },
    );

    defer _ = winapi.VirtualFreeEx(child.id.?, dll_path, 0, .{ .RELEASE = true });

    _ = ntdll.NtWriteVirtualMemory(child.id.?, dll_path, dll_name ++ .{0}, dll_name.len + 1, null);

    var dllmain_thread: winapi.DWORD = 0;
    const dll_thread = winapi.CreateRemoteThread(
        child.id.?,
        null,
        0,
        winapi.GetProcAddress(winapi.LoadLibraryA("kernel32.dll").?, "LoadLibraryA"),
        dll_path,
        0,
        &dllmain_thread,
    );

    defer _ = ntdll.NtClose(dll_thread);
    _ = ntdll.NtWaitForSingleObject(dll_thread, .FALSE, null);

    winapi.ResumeThread(child.thread_handle);
    exit(0);
}

fn whichExecutable(io: Io, dir: Io.Dir) ?[:0]const u8 {
    const exe_names: []const [:0]const u8 = &.{
        "ZenlessZoneZero.exe",
        "ZenlessZoneZeroBeta.exe",
    };

    for (exe_names) |exe_name| {
        dir.access(io, exe_name, .{ .read = true, .execute = true }) catch continue;
        return exe_name;
    } else return null;
}

fn fatal(comptime message: [:0]const u8) noreturn {
    const messageBoxA: winapi.lpfnMessageBoxA = @ptrFromInt(winapi.GetProcAddress(
        winapi.LoadLibraryA("User32.dll").?,
        "MessageBoxA",
    ));

    _ = messageBoxA(null, message, "Sunbringer", 0x30);
    exit(1);
}

const dll_name = "Sunbringer.dll";

const Io = std.Io;
const Init = std.process.Init;
const exit = std.process.exit;

const ntdll = std.os.windows.ntdll;

const winapi = @import("winapi.zig");
const std = @import("std");
