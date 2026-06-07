pub fn init(assembly: GameAssembly) !void {
    assembly.attachThread();

    // do it again, just in case something else placed the hook again
    try interceptor.disableMemoryProtection();

    try networking.init(assembly);
    try encryption.init(assembly);
    try ditherless.init(assembly);
    try various.init(assembly);
}

pub fn onLoad(assembly: GameAssembly) !void {
    try interceptor.disableMemoryProtection();
    try sec_engine.init(assembly);
}

const various = @import("patches/various.zig");
const sec_engine = @import("patches/sec_engine.zig");
const networking = @import("patches/networking.zig");
const encryption = @import("patches/encryption.zig");
const ditherless = @import("patches/ditherless.zig");

const interceptor = @import("interceptor.zig");
const GameAssembly = @import("GameAssembly.zig");
