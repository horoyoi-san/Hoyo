pub const Error = std.process.ProtectMemoryError;

const r_x: std.process.MemoryProtection = .{ .read = true, .write = false, .execute = true };
const rwx: std.process.MemoryProtection = .{ .read = true, .write = true, .execute = true };
const page_alignment = std.heap.page_size_min;
const Page = [*]align(page_alignment) u8;

pub fn disableMemoryProtection() Error!void {
    // In case you're using pre-10.10 wine, change this to 'NtPulseEvent'
    const syscall_sym = "NtQuerySection";

    const ntdll_handle = winapi.GetModuleHandleA("ntdll.dll").?;
    const protect_virtual_memory = winapi.GetProcAddress(ntdll_handle, "NtProtectVirtualMemory");
    const syscall_routine = winapi.GetProcAddress(ntdll_handle, syscall_sym);

    const start = std.mem.alignBackward(usize, syscall_routine, page_alignment);
    const start_page: Page = @ptrFromInt(start);
    const page_slice = start_page[0..page_alignment];

    try protectMemory(page_slice, rwx);
    defer protectMemory(page_slice, r_x) catch {};

    const routine: *u32 = @ptrFromInt(syscall_routine);
    const routine_val = @as(*usize, @ptrCast(@alignCast(routine))).*;
    const lower_bits_mask = ~(@as(u64, 0xFF) << 32);
    const lower_bits = routine_val & @as(usize, @intCast(lower_bits_mask));

    const offset_val = @as(*const u32, @ptrFromInt(@as(usize, @intFromPtr(routine)) + 4)).*;
    const upper_bits = @as(usize, @intCast(@subWithOverflow(offset_val, 1).@"0")) << 32;
    const result = lower_bits | upper_bits;
    @as(*usize, @ptrFromInt(protect_virtual_memory)).* = result;
}

pub fn write(address: usize, comptime bytes: []const u8) Error!void {
    const start = std.mem.alignBackward(usize, address, page_alignment);
    const end = std.mem.alignForward(usize, address + bytes.len, page_alignment);
    const start_page: Page = @ptrFromInt(start);
    const affected_pages = start_page[0 .. end - start];

    try protectMemory(affected_pages, rwx);
    defer protectMemory(affected_pages, r_x) catch {};

    const location: [*]u8 = @ptrFromInt(address);
    @memcpy(location[0..bytes.len], bytes);
}

pub fn replace(address: usize, comptime replacement: anytype) Error!void {
    const trampoline_size: usize = 12;
    const replacement_address = &replacement;

    const start = std.mem.alignBackward(usize, address, page_alignment);
    const end = std.mem.alignForward(usize, address + trampoline_size, page_alignment);
    const start_page: Page = @ptrFromInt(start);
    const affected_pages = start_page[0 .. end - start];

    try protectMemory(affected_pages, rwx);
    defer protectMemory(affected_pages, r_x) catch {};

    const location: [*]u8 = @ptrFromInt(address);
    var writer: Io.Writer = .fixed(location[0..12]);
    writer.writeAll(&.{ 0x48, 0xB8 }) catch unreachable; // mov ${}, %rax
    writer.writeInt(u64, @intFromPtr(replacement_address), .little) catch unreachable; // ${}
    writer.writeAll(&.{ 0x50, 0xC3 }) catch unreachable; // push %rax; ret
}

const Io = std.Io;
const protectMemory = std.process.protectMemory;

const winapi = @import("winapi.zig");
const std = @import("std");
