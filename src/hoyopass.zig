const windows = @import("std").os.windows;
const root = @import("root");
const zz = @import("zigzag");

const offsets = root.offsets;

pub fn init() void {
    const hoyopass_init = root.base + root.offsets.unwrapOffset(.HOYOPASS_INIT);
    var prot: windows.DWORD = windows.PAGE_EXECUTE_READWRITE;

    windows.VirtualProtect(@ptrFromInt(hoyopass_init), 1, prot, &prot) catch unreachable;
    @as(*u8, @ptrFromInt(hoyopass_init)).* = 0xC3;
    windows.VirtualProtect(@ptrFromInt(hoyopass_init), 1, prot, &prot) catch unreachable;
}
