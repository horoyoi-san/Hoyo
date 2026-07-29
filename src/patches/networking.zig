const log = std.log.scoped(.@"Moonlight_Whispers::networking");

var game_assembly_instance: GameAssembly = undefined; // Populated by `init`

pub fn init(assembly: GameAssembly) !void {
    game_assembly_instance = assembly;

    // Dispatch
    assembly.setLoginSettingByJson(@embedFile("login_setting.json"));

    // Prevent any further overwrite.
    try interceptor.write(assembly.offset(.set_login_setting_by_json), &.{0xC3});

    // SDK
    try interceptor.replace(assembly.offset(.load_file_delegate_invoke), loadFileDelegateInvokeReplacement);
}

const config_server_pc_path = unicode.utf8ToUtf16LeStringLiteral("Config/server_pc.json");

fn loadFileDelegateInvokeReplacement(delegate: *anyopaque, path: *const String) callconv(.c) *const String {
    _ = delegate;
    log.info("LoadFileDelegate::Invoke(\"{f}\")", .{unicode.fmtUtf16Le(path.slice())});

    return game_assembly_instance.ptrToStringAnsi(if (std.mem.eql(u16, path.slice(), config_server_pc_path))
        @embedFile("server_pc.json")
    else
        "");
}

const String = GameAssembly.String;
const interceptor = @import("../interceptor.zig");
const GameAssembly = @import("../GameAssembly.zig");

const unicode = std.unicode;
const std = @import("std");
